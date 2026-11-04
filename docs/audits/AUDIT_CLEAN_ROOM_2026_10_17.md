# Rapport d'Audit Clean-Room (100% Neuf) — Nexus POS Pro v1.2.33
**Date** : 17 Octobre 2026
**Méthode** : Audit "Clean-Room" intégral sur le code source réel (`src/`, `server.ts`, `electron/`) et la base Supabase en direct (`unlwfvldqxfccgrrgbwf`), **sans consulter aucun rapport précédent**.

---

## Progression de l'Audit (Sauvegarde Incrémentale Anti-Coupure)
- [x] **Phase 1** : Inspection de la base de données Supabase en direct (`unlwfvldqxfccgrrgbwf` — Schéma, RPCs, Advisors Sécurité & Performance)
- [x] **Phase 2** : Audit de la couche de Synchronisation Offline-First & IndexedDB (`SyncService.ts`, `LocalDatabase.ts`, `local-db.ts`, `db-converters.ts`, `useProductsAndCoreData.ts`, `useAdminStaticData.ts`, `backupRestoreService.ts`)
- [x] **Phase 3** : Audit de la Logique Métier, Stocks & Calculs Financiers (`useCheckoutProcess.ts`, `EditTransactionModal.tsx`, `useReturnModalLogic.ts`, `CashflowReport.tsx`, `useCashManagementLogic.ts`, `useProfitsReportLogic.ts`, `AccountingChartsReport.tsx`, `useSupplierPayments.ts`, `useEmployeesLogic.ts`, `StockAdjustmentModal.tsx`, `useExpiryManagerLogic.ts`)
- [x] **Phase 4** : Audit de la Sécurité, Authentification, Serveur LAN & Electron (`server.ts`, `electron/main.js`, `AuthService.ts`, `useAuthUser.tsx`, `useAppPermissionsAndStats.ts`, `PinLockModal.tsx`)
- [x] **Phase 5** : Audit de la Performance React, Zustand & UI (`MainAppContent.tsx`, `AppModals.tsx`, `Inventory.tsx`, `SupplierList.tsx`, `SubTabPurchasesHistory.tsx`)
- [x] **Phase 6** : Consolidation finale et liste de tâches priorisée (`P0`, `P1`, `P2`) anti-coupure

---

## 1. Synchronisation Offline-First, IndexedDB & Schéma Supabase

### 🔴 [P0-SYNC-1] Blocage définitif du solde, du CA et des points fidélité d'un client après sa 1ère opération (`SyncService.ts`)
- **Fichier** : `src/services/SyncService.ts` (L1125–1135) & RPC Supabase `public.adjust_customer_balance`
- **Mécanisme exact** :
  Lorsqu'un client effectue un achat à crédit, gagne/utilise des points ou reçoit un versement, `SyncService.ts` appelle la RPC atomique `adjust_customer_balance` avec :
  ```ts
  const idempotencyKey = item.payload?.idempotencyKey || `adj_${item.recordId || item.payload?.id || custId}_${custId}`;
  ```
  Aucun appelant dans le projet ne fournit `idempotencyKey` dans le payload client (et `idempotencyKey` n'existe pas dans `TABLE_COLUMNS.customers`, donc `sanitizePayloadForSupabase` l'aurait supprimé de toute façon). Par conséquent, `idempotencyKey` vaut **toujours** la constante statique `adj_<custId>_<custId>` (ex: `adj_c123_c123`), au lieu d'inclure `item.opId` !
  Or, dans Supabase, la RPC `public.adjust_customer_balance` enregistre `p_idempotency_key` dans la table `customer_balance_adjustments` lors de la **toute première** opération du client. Pour **toutes les opérations suivantes** de ce même client (2e vente, 2e versement, retour...), la RPC détecte la clé déjà présente et retourne immédiatement `{"success": true, "idempotent": true}` **sans jamais mettre à jour `balance`, `total_spent` ni `loyalty_points` dans Supabase** !

### 🔴 [P0-SYNC-2] Double comptabilisation du solde client dans `handleTopUp`, perte des colonnes non-financières et pollution de `dbState.customers`
- **Fichiers** :
  - `src/hooks/useCustomersLogic.ts` (L275 & L292–295)
  - `src/services/SyncService.ts` (L333–342, L1149, L1175, L1315–1329)
  - `src/services/LocalDatabase.ts` (L390)
- **Mécanisme exact** :
  1. **Double application du versement (`handleTopUp`)** : Dans `useCustomersLogic.ts`, `handleTopUp` appelle d'abord `await localDb.update('customers/' + id, { balance: newBalance, deltaBalance: change })` (L275, ce qui met en file d'attente la RPC `adjust_customer_balance` qui ajoute `+change` sur Supabase), puis exécute **en plus** un appel direct `await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCustomer.id)` (L292–295). Le solde est donc écrasé puis ré-incrémenté par la RPC (`+2 × change`) !
  2. **Écrasement des colonnes non-financières (`SyncService.ts` L1149 & L1175)** : Dès que l'étape 4.8 (`adjust_customer_balance`) réussit pour un client, `SyncService` fait `completedKeys.add(originalKey)`. À l'étape 5 (L1175 : `if (completedKeys.has(originalKey)) continue;`), l'upsert de la fiche client est **totalement ignoré**. Toute modification simultanée de `lastVisit`, `cashierNotes`, `phone`, `address` ou `creditLimit` fusionnée dans le même item de la file d'attente n'est jamais envoyée à Supabase !
  3. **Suppression prématurée en cas de delta net nul (`SyncService.ts` L1315–1329)** : Dans le bloc `finally` (Cas 2), si les deltas restants valent `0` (`hasRemainingDelta === false`), l'item est supprimé de la file (`return false`) **sans vérifier `item.opId !== snap.opId`**, ce qui supprime une mise à jour non-financière (ex: changement de téléphone ou de note) arrivée pendant le `await` réseau.
  4. **Pollution de `dbState.customers`** : `localDb.update('customers/' + id, { ..., deltaBalance, deltaSpent, deltaPoints })` persiste les propriétés transitoires `deltaBalance`, `deltaSpent`, `deltaPoints` directement dans `dbState.customers[id]` et `usePeopleStore`.

### 🔴 [P0-SYNC-3] Corruption de produits en `"Sans nom"` et disparition silencieuse de l'inventaire lors d'un `localDb.update` partiel
- **Fichiers** :
  - `src/lib/local-db.ts` (L249)
  - `src/services/LocalDatabase.ts` (L378–432, L500–524)
  - `src/lib/db-converters.ts` (L353–362, L451, L571)
  - `src/services/SyncService.ts` (L488–489, L878–879, L937–970)
- **Mécanisme exact** :
  1. Au démarrage (`local-db.ts:249`), `products` est exclu de `loadInitialState()`, donc `dbState.products` démarre vide `{}`. Lors du chargement réseau (`useProductsAndCoreData.ts`), les produits sont injectés dans `idb-keyval` et `useCoreStore`, mais jamais dans `dbState.products`.
  2. Lorsqu'un ajustement de stock appelle `localDb.updateLocalOnly('products/' + id, { stock, updatedAt })`, `dbState.products[id]` est créé avec **uniquement** `{ stock, updatedAt }` (sans `name`, ni `price`).
  3. Si une mise à jour partielle `localDb.update('products/' + id, partial)` a lieu ensuite (ex: `useQuickSelect.ts:74` `{ quickSelectOrder }`, `useUpdatePricesLogic.ts:61` `{ price, costPrice }`, `useSupplierDamaged.ts:56`, `useInventoryActions.ts:67`, `useDeliveryActions.ts:142`), `preparePayload` (`db-converters.ts:353-362`) exécute :
     ```ts
     let cached = dbState?.products?.[recordId];
     if (!cached) { cached = useCoreStore.getState().products... }
     ```
     Comme `dbState.products[recordId]` est défini (`{ stock, updatedAt }`), le `if (!cached)` est **faux** et `useCoreStore` n'est jamais consulté !
  4. De plus, dans `SyncService.ts:878-879`, `sanitizePayloadForSupabase` est appelé **avant** `if (!payload.id && item.recordId) payload.id = item.recordId`. Si le payload partiel ne contenait pas `id`, `recordId` vaut `""` dans `preparePayload` !
  5. `preparePayload` (L451 & L571) force alors `filtered.name = 'Sans nom'`. Dans `SyncService.ts:937`, `hasValidName` (`p.name !== ''`) devient `true` (rendant la branche `partialUpdates` L939 **totalement morte/inatteignable**), et Supabase reçoit un `upsert` qui écrase le nom du produit par `'Sans nom'` et son prix par `0`. Au rechargement suivant (`useProductsAndCoreData.ts:305,350`), le filtre `.filter(p => p.name !== 'Sans nom')` **masque définitivement le produit de l'application** !

### 🔴 [P0-SYNC-4] Écrasement sans fusion dans `dedupMap` et inversion `DELETE` / `UPSERT` dans `SyncService.ts`
- **Fichier** : `src/services/SyncService.ts` (L344, L585–587, L655, L663)
- **Mécanisme exact** :
  1. **Écrasement des mises à jour partielles successives** : Pour toutes les tables autres que `stock_adjustments` et les deltas financiers de `customers`, `dedupMap` fait simplement `dedupMap.set(key, item)` (L344 & L655) au lieu de fusionner les payloads (`{ ...existing.payload, ...item.payload }`). Si deux mises à jour partielles touchent le même enregistrement hors-ligne, la seconde écrase les champs de la première.
  2. **Résurrection d'enregistrements supprimés** : Dans `processSyncQueue`, si un enregistrement est créé/modifié (`UPSERT`) puis supprimé (`DELETE`) hors-ligne, l'`UPSERT` va dans `dedupMap` et le `DELETE` va dans `deleteList` (L586). Or, `deleteList` est exécuté à l'**Étape 2** (L663), tandis que `dedupMap` est exécuté aux **Étapes 3 à 5** ! Le `DELETE` s'exécute donc **avant** l'`UPSERT`, ce qui **recrée en base** l'enregistrement que l'utilisateur venait de supprimer.

### 🔴 [P0-SYNC-5] Double mise à jour concurrente du stock (`enqueueStockAdjustment` + `localDb.update('products/...')`)
- **Fichiers** :
  - `src/components/smart-purchase/purchaseDbOperations.ts` (L273+281, L505+507, L646+658+665)
  - `src/hooks/useGRNLogic.ts` (L94+154)
  - `src/hooks/useDeliveryActions.ts` (L128+132+142)
  - `src/hooks/suppliers/useSupplierDamaged.ts` (L54+56)
  - `src/hooks/useAuditLogsLogic.ts` (L401+402, L435+436)
- **Mécanisme exact** :
  Ces 5 modules appellent simultanément `enqueueStockAdjustment(productId, delta, ...)` (qui déclenche immédiatement `scheduleQueueProcessing(0)` pour exécuter la RPC atomique `apply_stock_adjustment` à l'étape 4.5) **ET** `localDb.update('products/' + productId, { stock: newStock, ... })` (qui enfile un `UPSERT` complet du produit à l'étape 5 avec une valeur absolue de `stock` potentiellement obsolète, écrasant le stock atomique calculé par Supabase).

### 🔴 [P0-SYNC-6] Écrasement des modifications locales en attente par les listeners Realtime Supabase et absence de `localDb.subscribe` en mode connecté
- **Fichiers** :
  - `src/hooks/data-fetching/useProductsAndCoreData.ts` (L580–629, L683–705, L944–1032)
  - `src/hooks/data-fetching/useAdminStaticData.ts` (L290–308)
- **Mécanisme exact** :
  1. Contrairement à `syncTableFromNetwork` qui protège les IDs présents dans `loadPendingSyncQueue()` et `getDeletedRecordIds()`, les callbacks Realtime `processBatchedProductUpdates` (L580–629) et `processTableBatch` (L683–705) **ne vérifient ni la file d'attente `SyncService`, ni `getDeletedRecordIds()`** (et `processTableBatch` ne compare même pas `updatedAt`). Un événement Realtime entrant écrase donc immédiatement dans Zustand et IndexedDB une modification locale qui n'a pas encore fini d'être synchronisée.
  2. Lorsque `isSupabaseConfigured === true`, `useProductsAndCoreData.ts` (L944–1032) n'appelle **jamais** `localDb.subscribe(collectionName)` et `useAdminStaticData.ts` n'a ni `localDb.subscribe('employees')` ni listener Realtime sur `employees`.

### 🟠 [P1-SYNC-7] Autres anomalies de synchronisation et de sauvegarde/restauration
1. **`CheckoutHeader.tsx` (L46)** : Appelle `localDb.update('settings/default', ...)` au lieu de `'settings/company'`, créant une ligne fantôme `id = 'default'` dans la table `settings` de Supabase.
2. **`useCheckoutProcess.ts` (L539–544)** : Lors de l'utilisation d'un bon d'achat (`voucher`), le code exécute à la fois `localDb.update('vouchers/' + id, ...)` et `localDb.update('promotions/' + id, { status: 'used', currentBalance: 0 })`, créant une ligne fantôme invalide dans l'autre table.
3. **`local-db.ts` (L251)** : `loadInitialState` charge la clé `'patterns'` au lieu de `'invoice_patterns'`, laissant `dbState.invoice_patterns` toujours vide `{}` au démarrage.
4. **`orderStockService.ts` (L271–280, L426–433) & `LocalDatabase.ts` (L468–472)** : Exécutent des requêtes Supabase directes (`supabase.from('products').update(...)`, `supabase.from('transactions').delete()`) en doublon avec `enqueueSync`.
5. **`SyncService.ts` (L80–86 & L389)** :
   - `initSyncQueueFromStorage` donne la priorité à `nexus_sync_queue` (asynchrone, potentiellement en retard lors d'un `beforeunload`) au lieu de comparer/fusionner avec `nexus_emergency_sync_queue` (synchrone).
   - `enqueueStockAdjustment` (L389) utilise `recordKey = options?.adjustmentId || productId`, alors que `dedupMap` (L322) déduplique par `productId`. En cas d'échec réseau partiel, `completedKeys` contient `productId` mais le bloc `finally` cherche `item.recordId` (`adjustmentId`), ce qui ré-exécute l'ajustement.
6. **`backupRestoreService.ts` (L12–107)** :
   - Omet les transactions archivées (`getArchivedTransactions()`) et 12 tables lors de l'export JSON.
   - Ne restaure jamais `employees`, `purchases` ni `stockAdjustments` lors de l'import JSON.
   - Appelle `localDb.insertBatch('products', data.products)` (L79) qui déclenche un `localStorage.setItem` synchrone de tous les produits (> 5 Mo), provoquant un `QuotaExceededError`.

---

## 2. Logique Métier, Stocks & Rapports Financiers

### 🔴 [P0-BIZ-1] Double déduction des remboursements espèces et inclusion des ventes à crédit non encaissées dans `CashflowReport.tsx`
- **Fichier** : `src/components/CashflowReport.tsx` (L25–73)
- **Mécanisme exact** :
  1. Lors d'un retour client remboursé en espèces (`useReturnModalLogic.ts:220`), une dépense de catégorie `'Remboursement / Retour'` est créée dans `expenses`.
  2. Dans `CashflowReport.tsx`, `expensesTotal` (L68) additionne **toutes** les dépenses (incluant `'Remboursement / Retour'`), ET `returnsTotal` (L69) additionne **tous** les retours de la table `returns` (y compris les avoirs `credit_note` et `balanceRefund`), puis `netCashflow` (L73) calcule `cashInTotal - expensesTotal - returnsTotal`. **Chaque remboursement espèces est donc soustrait 2 fois de la trésorerie !**
  3. De plus, `cashIn` (L26–30) inclut toutes les ventes ayant `status === 'completed' || 'partially_returned'` **sans exclure `paymentMethod === 'balance'`** ni soustraire `t.balanceUsed`. Une vente à crédit (non payée) est donc comptée à 100% comme entrée d'argent liquide !

### 🔴 [P0-BIZ-2] Triple erreur de calcul du fond de caisse attendu (`expectedCash`) dans le Rapport Z (`useCashManagementLogic.ts`)
- **Fichier** : `src/hooks/useCashManagementLogic.ts` (L35–70, L142, L171)
- **Mécanisme exact** :
  1. **Double pénalité sur un retour total dans le même shift** : Si une vente en espèces de 1 000 DA est intégralement retournée pendant le shift, son statut passe à `'returned'` (`useReturnModalLogic.ts:138`) et une dépense `'Remboursement / Retour'` de 1 000 DA est créée. Dans `useCashManagementLogic.ts`, la vente disparaît de `totalCashSales` (car `t.status === 'returned'` est exclu à L40), **ET** la dépense de 1 000 DA est soustraite dans `totalExpenses` (L67). Le caissier a encaissé +1 000 DA puis rendu -1 000 DA (flux net = 0 DA), mais la caisse attendue affiche **-1 000 DA** !
  2. **Paiements mixtes et monnaie laissée en solde** : `totalCashSales` additionne `t.total` (L41) au lieu du cash réellement encaissé (`t.total - (t.balanceUsed || 0)`, ou `t.amountReceived` lorsque `keepExcessInBalance` est actif).
  3. **Collision des dépenses entre shifts d'une même journée** : Les dépenses créées avec une date simple `YYYY-MM-DD` (longueur 10) sont comparées via `expDateStr >= openedDayLocal` (L61). Si un magasin ouvre un 2e shift l'après-midi, toutes les dépenses du shift du matin sont **soustraites une seconde fois** du shift de l'après-midi !

### 🔴 [P0-BIZ-3] Corruption financière et blocage des stocks lors de la modification d'une vente via `EditTransactionModal.tsx`
- **Fichier** : `src/components/EditTransactionModal.tsx` (L31, L90, L106–157)
- **Mécanisme exact** :
  Contrairement au flux complet de `useCheckoutProcess.ts` (`isEditing`), `EditTransactionModal.tsx` :
  1. Recalcule `total = subtotal + taxAmount` (L31) en **écrasant toutes les remises** (`discountAmount`, `pointsDiscount`, `voucherDiscount`).
  2. **Ne met jamais à jour le client** (`balance`, `totalSpent`, `loyaltyPoints`) dans `usePeopleStore` ni `localDb`.
  3. Utilise un `adjustmentId` statique `adj_edit_tx_${transaction.id}_${productId}` (L133) sans horodatage : si une transaction est modifiée une 2e fois, Supabase ignore l'ajustement de stock (`idempotent: true`).
  4. Appelle `supabase.from('transactions').update(...)` (L90) **avant** `localDb` et appelle `item.price.toFixed(2)` (L205) sans `Number(item.price || 0)`.

### 🔴 [P0-BIZ-4] Écrasement des paiements fournisseurs successifs et désynchronisation de `useSuppliersLogic.ts`
- **Fichiers** :
  - `src/hooks/suppliers/useSupplierPayments.ts` (L69–90)
  - `src/hooks/useSuppliersLogic.ts` (L36, L180–215)
- **Mécanisme exact** :
  1. Dans `useSupplierPayments.ts`, `handleAddPayment` calcule `newBalance = (Number(viewingDetailsSupplier.balance) || 0) - amount`, met à jour `usePeopleStore`, mais **ne met jamais à jour le state local `viewingDetailsSupplier`**. Si l'utilisateur saisit un 2e paiement sans fermer la modale, le 2e paiement repart de l'ancien `viewingDetailsSupplier.balance` et **écrase le 1er paiement** !
  2. Dans `useSuppliersLogic.ts`, `handleSubmit` et `handleDelete` écrivent dans `localDb` mais **n'appellent jamais `setSuppliers`** sur `usePeopleStore`.

### 🔴 [P0-BIZ-5] Mot de passe employé supprimé avant sauvegarde et liste des employés figée (`useEmployeesLogic.ts`)
- **Fichier** : `src/hooks/useEmployeesLogic.ts` (L15, L161–178, L221–248)
- **Mécanisme exact** :
  1. À la ligne 161, `const { password, ...rawDatabaseData } = formData;` extrait le champ `password` et **ne l'utilise jamais** (`bcrypt` est importé ligne 15 mais jamais appelé !). Créer un employé ou modifier son mot de passe ne sauvegarde aucun hash ni PIN en base.
  2. `handleSubmit` et `handleDelete` n'appellent jamais `usePeopleStore.getState().setEmployees(...)`, donc l'interface ne reflète pas l'ajout, la modification ou la suppression d'un employé.

### 🟠 [P1-BIZ-6] Désynchronisation mémoire des dépenses/avoirs et oubli des lots lors d'un retour client (`useReturnModalLogic.ts`)
- **Fichier** : `src/hooks/useReturnModalLogic.ts` (L116–230)
- **Mécanisme exact** :
  1. Lors d'un retour client, `useReturnModalLogic` écrit dans `localDb.insert('promotions', ...)` (pour un avoir) et `localDb.insert('expenses', ...)` (pour un remboursement espèces), mais **ne met pas à jour `useCoreStore.setPromotions` ni `useFinanceStore.setExpenses`** (contrairement à `returns` et `transactions` qui sont mis à jour via les événements `offline-return-created` et `offline-transaction-created`). L'avoir créé est donc inutilisable en caisse et la dépense est invisible dans les rapports tant que la page n'est pas rechargée.
  2. Le retour réincrémente `product.stock` mais **ne réincrémente jamais `product.batches`** pour les produits multi-lots (`useMultiExpiry`).
  3. Les points fidélité sont retirés (`-Math.floor(returnTotal * pointsPerCurrency)`) même si la vente initiale n'avait généré aucun point (`pointsEarned === 0`).

### 🟠 [P1-BIZ-7] Perte des lots/avaries dans `StockAdjustmentModal.tsx` et recalculs/remises multiples dans `useExpiryManagerLogic.ts`
- **Fichiers** :
  - `src/components/StockAdjustmentModal.tsx` (L111, L120–145)
  - `src/hooks/useExpiryManagerLogic.ts` (L120, L242–264, L294–319)
- **Mécanisme exact** :
  1. Dans `StockAdjustmentModal.tsx`, `updatedProduct` (contenant les nouveaux `batches`, `damagedStock` et `expirationDate`) est construit en mémoire (L120–139) mais **n'est jamais persisté dans `localDb` ni dans `useCoreStore.setProducts`** ! Seul `enqueueStockAdjustment` est appelé. De plus, `user.uid` (L111) plante si `user` est `null`.
  2. Dans `useExpiryManagerLogic.ts` :
     - `const now = startOfDay(new Date())` (L120) recrée une nouvelle instance `Date` à chaque rendu, invalidant systématiquement le `useMemo` de `analyzedProducts` (L239) sur les 11 500 produits.
     - `handleSaveQuickDate` (L242–264) ne met pas à jour `batches` pour un produit `useMultiExpiry`.
     - `handleBatchDiscount` (L294–319) itère sur `filteredItems` (qui contient une entrée par lot) sans dédupliquer par `product.id` et en relisant `product.price` initial : un produit ayant 2 lots proches de la péremption subit deux écritures concurrentes.

### 🟠 [P1-BIZ-8] Erreurs comptables dans `AccountingChartsReport.tsx`, `useProfitsReportLogic.ts` et `InventoryAudit.tsx`
- **Fichiers** :
  - `src/components/AccountingChartsReport.tsx` (L65–152)
  - `src/hooks/useProfitsReportLogic.ts` (L124–280)
  - `src/components/InventoryAudit.tsx` (L332–343)
- **Mécanisme exact** :
  1. `AccountingChartsReport.tsx` filtre uniquement `t.status !== 'returned'` (L69, L106) et **inclut toutes les ventes annulées (`status === 'cancelled'`)** dans le chiffre d'affaires, le coût des marchandises vendues (COGS) et la TVA collectée !
  2. `useProfitsReportLogic.ts` :
     - Ignore dans `productProfitability` les retours d'articles qui n'ont pas été vendus durant la même fenêtre de dates (L181 : `if (productMap.has(productId))`).
     - Soustrait une 2e fois les retours complets (`status === 'returned'`) dans `netRevenue` alors qu'ils sont déjà exclus de `completedTransactions`.
     - Mélange le taux de marque (`profit / revenue`) et le taux de marge (`profit / cost`) à la ligne 264.
  3. `InventoryAudit.tsx` (L332–343) : Les écarts négatifs d'inventaire sont enregistrés sans `isLoss: true`, ce qui les exclut totalement de `LossesReport.tsx`.

### 🟠 [P1-BIZ-9] Bugs dans les Achats (`SmartPurchase`/`GRN`), l'édition de vente (`useCheckoutProcess`) et les Commandes en ligne (`useOrdersLogic`)
- **Fichiers** :
  - `src/components/smart-purchase/useSmartPurchaseLogic.ts` (L378–395) : Lorsqu'un fournisseur est créé à la volée pendant la validation d'un achat payé partiellement ou à crédit (`debt > 0`), sa dette initiale n'est jamais ajoutée dans `setSuppliers` (car il n'existait pas encore dans le tableau `suppliers` capturé par la closure).
  - `src/components/smart-purchase/purchaseDbOperations.ts` (L176–203) : Si l'utilisateur modifie le fournisseur d'un bon d'achat existant, `balanceDiff = newDebt - oldDebt` est appliqué au nouveau fournisseur sans retirer `oldDebt` de l'ancien fournisseur.
  - `src/hooks/useGRNLogic.ts` (L96–250) : La validation d'un bon de réception (GRN) ne met pas à jour le solde du fournisseur (`suppliers.balance`) ni le PMP exact (ignore les remises et la TVA du bon de commande).
  - `src/hooks/useCheckoutProcess.ts` (L209–294, L494–505) : En mode édition de vente (`isEditing`), l'annulation de l'ancienne transaction ne retire pas l'excédent `keepExcessInBalance` qui avait été crédité au client (L209–245), et ne met pas à jour `useCoreStore.setProducts` en mémoire (L494).
  - `src/hooks/useOrdersLogic.ts` (L415–467) & `src/hooks/useDeliveryActions.ts` (L81–166) : Modifier les articles/quantités d'une commande en ligne déjà confirmée (`syncedToPos === true`) dans `handleSaveEdit` n'ajuste pas le stock en conséquence ; et l'échec d'écriture de la transaction dans `useDeliveryActions.ts` laisse le statut de la commande à `'delivered'`.

---

## 3. Sécurité, Authentification, Serveur LAN & Electron

### 🔴 [P0-SEC-1] Fonctions RPC Supabase `SECURITY DEFINER` exécutables sans authentification (`anon`)
- **Cible** : Base Supabase en direct (`unlwfvldqxfccgrrgbwf` — `pg_proc`)
- **Mécanisme exact** :
  Les fonctions `public.apply_stock_adjustment`, `public.adjust_product_stock`, `public.adjust_customer_balance` et `public.adjust_customer_balance_legacy_deprecated` sont définies en `SECURITY DEFINER` (s'exécutant avec les privilèges `postgres` et contournant le RLS), possèdent le privilège `EXECUTE` accordé au rôle `anon`, et **ne contiennent aucune vérification `auth.role()` ou `public.is_staff()`**. N'importe quel client non authentifié disposant de l'`ANON_KEY` publique peut altérer les stocks et les soldes clients. De même, `public.update_app_customer_loyalty` ne vérifie pas que l'appelant est un membre du staff ou le propriétaire du compte client.

### 🔴 [P0-SEC-2] Exposition réseau et stockage local en clair des hashes de mots de passe et PINs de tous les comptes (`users` et `employees`)
- **Fichiers** :
  - `src/services/AuthService.ts` (L256–276)
  - `src/hooks/useAuthUser.tsx` (L145–197)
  - Politiques RLS Supabase sur `public.users` (`users_select_auth`) et `public.employees` (`emp_select_auth`)
- **Mécanisme exact** :
  `AuthService.ts` et `useAuthUser.tsx` exécutent `.select('*')` sur `users` et `employees` et stockent l'intégralité des colonnes (y compris `password_hash` et `pin`) en clair dans `localStorage` sous les clés `nexus_users` et `nexus_employees_cache`.

### 🔴 [P0-SEC-3] Escalade de privilèges triviale vers `admin` via `sessionStorage` et perte du rôle en mémoire
- **Fichiers** :
  - `src/hooks/useAppPermissionsAndStats.ts` (L68–73)
  - `src/services/AuthService.ts` (L164–188)
  - `src/hooks/useAuthActions.tsx` (L133)
- **Mécanisme exact** :
  1. Dans `useAppPermissionsAndStats.ts` (L69–71) :
     ```ts
     const isVerifiedAdmin = profile?.role === 'admin' && (
       isConfiguredOwner(user?.email, user?.uid) ||
       (Boolean(user?.email) && Boolean(profile?.email) && user!.email.toLowerCase() === profile!.email.toLowerCase())
     );
     ```
     Lorsqu'un caissier se connecte via PIN/mot de passe (`AuthService`), `user.email` et `profile.email` proviennent tous deux de la même session locale (`sessionStorage.getItem('nexus_active_online_session')`). Il suffit donc à n'importe quel employé de modifier `"role": "admin"` dans `sessionStorage` pour que `user.email === profile.email` soit `true` et qu'il obtienne immédiatement tous les droits `admin` !
  2. Dans `AuthService.ts` (L167–178), `this.trigger()` reconstruit l'objet `User` sans inclure `role: this.currentUser.role`.
  3. Dans `useAuthActions.tsx` (L133), la reconnexion offline force `role: 'cashier'` même pour un administrateur ou manager.

### 🔴 [P0-SEC-4] Endpoints HTTP et événements Socket.IO critiques sans aucune authentification dans `server.ts`
- **Fichier** : `server.ts` (L277–324, L466–605, L697–717)
- **Mécanisme exact** :
  - `POST /api/customer-display/barcode` (L697) et l'événement Socket.IO `scan-barcode` (L314) permettent à n'importe quel appareil sur le réseau Wi-Fi/LAN d'injecter des codes-barres directement dans le panier de la caisse active sans token ni authentification.
  - Les événements Socket.IO `pos-cart-update`, `pos-Idle`, `pos-welcome-user` et `pos-payment-success` (L277–311) sont acceptés de n'importe quel socket non authentifié (falsification de l'afficheur client).
  - `POST /api/ai/complete` et `POST /api/ai/scan` (L466–605) n'ont aucun middleware d'authentification, exposant la clé API Gemini du serveur à tout le réseau local.

### 🔴 [P0-SEC-5] Contournement du verrouillage d'écran (`PinLockModal.tsx`) avec le PIN par défaut `'0000'` / `'1234'`
- **Fichiers** :
  - `src/components/PinLockModal.tsx` (L79–104)
  - `src/components/AppHeader.tsx` (L485)
- **Mécanisme exact** :
  `AppHeader.tsx` passe `expectedPin={profile?.pin || profile?.passwordHash}` à `PinLockModal`. Or, l'objet `profile` (`useAuthUser.tsx:167-186`) est nettoyé de `pin` et `passwordHash` pour la session ! `expectedPin` est donc `undefined`, et `PinLockModal.tsx` (L86–95) bascule sur le fallback hardcodé `'0000'` ou `'1234'` (et accepte aussi une comparaison en clair ligne 85).

### 🟠 [P1-SEC-6] Dysfonctionnement de `/api/auth/verify-password` pour les employés dans `server.ts`
- **Fichier** : `server.ts` (L377, L404–405)
- **Mécanisme exact** :
  1. À la ligne 405, lorsque l'utilisateur n'est pas trouvé dans `users`, le serveur interroge `employees` avec `.select('id, name, email, role, permissions, status')` en **oubliant de sélectionner `password_hash, pin`** ! `userRecord.password_hash` et `userRecord.pin` sont donc toujours `undefined`, provoquant un échec `401` systématique pour tous les employés.
  2. À la ligne 377, le serveur rejette tout mot de passe de moins de 8 caractères (`password.length < 8`), alors que l'interface et `AuthService.ts` autorisent des mots de passe/PINs dès 4 caractères.

### 🟠 [P1-SEC-7] Autres failles Electron & Authentification
1. **`electron/main.js` (L227–231, L312–316, L468–482)** : Raccourci `F12` (DevTools) actif en production, CORS `origin: '*'` avec `credentials: true` sur le serveur Express embarqué, et filtre SQL IPC `db-query` contournable via `ATTACH DATABASE` ou `PRAGMA`.
2. **`AuthService.ts` (L317, L358)** : Compare uniquement `foundUser.password_hash || foundUser.password` en oubliant `foundUser.pin`.
3. **`App.tsx` (L475)** : Le callback `onLogin` de `CameraLogin` met à jour `profile` mais oublie d'appeler `setUser(...)`, laissant `user` à `null` et bloquant l'utilisateur sur l'écran de connexion.

---

## 4. Performance React, Zustand & UI / Navigation

### 🟠 [P1-PERF-1] Double exécution simultanée de `useProductStats()` sur les 11 500+ produits
- **Fichiers** :
  - `src/components/MainAppContent.tsx` (L41)
  - `src/components/AppModals.tsx` (L108)
- **Mécanisme exact** :
  Les deux composants sont montés simultanément en permanence dans `App.tsx` et appellent chacun `useProductStats()`, exécutant **deux fois** la boucle complète d'analyse des stocks, des ruptures et des dates de péremption sur les 11 500+ produits à chaque modification du catalogue.

### 🟠 [P1-PERF-2] Bug de filtrage des sous-catégories et re-renders synchrones à chaque frappe dans `Inventory.tsx`
- **Fichier** : `src/components/Inventory.tsx` (L108, L165, L195–201)
- **Mécanisme exact** :
  1. `Inventory.tsx` calcule `expandedSelectedCategories` (L128–158, qui inclut les sous-catégories enfants d'une catégorie parente sélectionnée), mais passe `selectedCategories` brut à `useInventoryData` (L165) ! Sélectionner une catégorie parente n'affiche donc aucun produit des sous-catégories.
  2. Le `useEffect` de réinitialisation de pagination (L195–201) dépend de `search` brut au lieu de `deferredSearch`, provoquant un second rendu synchrone à chaque touche pressée.

### 🟠 [P1-PERF-3] Listes non paginées (`SupplierList.tsx` et `SubTabPurchasesHistory.tsx`)
- **Fichiers** :
  - `src/components/suppliers/SupplierList.tsx` (L196, L263)
  - `src/components/smart-purchase/SubTabPurchasesHistory.tsx` (L471)
- **Mécanisme exact** :
  Ces deux composants rendent l'intégralité des tableaux `suppliers` et `filteredHistory` dans le DOM sans pagination (contrairement à la règle des 50 éléments/page de `GEMINI.md`).

### 🟡 [P2-UI-1] Petits bugs UI et d'export CSV
1. **`useCustomersLogic.ts` (L460–464)** : Le bouton d'encaissement rapide depuis la fiche client dispatche `new CustomEvent('change-tab', { detail: 'caisse' })`, mais aucun listener `'change-tab'` n'existe dans l'application (et l'identifiant de l'onglet dans `TabRenderer.tsx` est `'pos'`, pas `'caisse'`).
2. **`useInventoryActions.ts` (L47–84)** : `handleBulkUpdate` met à jour `localDb` mais oublie de mettre à jour `useCoreStore.getState().setProducts(...)`, obligeant à recharger la page pour voir les changements de catégorie ou de prix en masse.
3. **`DetailedReports.tsx` (L231–247)** : L'export CSV inclut les transactions `'cancelled'` et `'returned'` sans les filtrer, utilise `t.tax` (inexistant) au lieu de `t.taxAmount`, et recalcule une TVA fixe de 19% (`t.total * 0.19 / 1.19`).

---

## 5. Liste de Tâches Complète & Priorisée (Anti-Coupure de Connexion / Tokens)

### Priorité P0 — Critique (Intégrité Financière, Synchronisation & Sécurité)
- [x] **[P0-SYNC-1]** Corriger `idempotencyKey` dans `src/services/SyncService.ts` (L1125) en utilisant `item.opId` (`adj_${item.opId}_${custId}`) pour ne plus bloquer les ajustements de solde/points clients après la 1ère opération.
- [x] **[P0-SYNC-2]** Corriger la synchronisation des clients dans `src/services/SyncService.ts` (ne pas sauter l'étape 5 si d'autres colonnes que `balance`/`totalSpent`/`loyaltyPoints` ont changé, vérifier `item.opId === snap.opId` dans le Cas 2 du `finally`, nettoyer `deltaBalance`/`deltaSpent`/`deltaPoints` dans `LocalDatabase.ts`) et supprimer l'appel direct redondant `supabase.from('customers').update` dans `src/hooks/useCustomersLogic.ts` (`handleTopUp` L292–295).
- [x] **[P0-SYNC-3]** Empêcher la corruption de produits en `"Sans nom"` :
  - Dans `src/services/SyncService.ts` (L878–879), affecter `if (!payload.id && item.recordId) payload.id = item.recordId` **avant** `sanitizePayloadForSupabase`.
  - Dans `src/lib/db-converters.ts` (L353–362), fusionner `dbState.products[recordId]` **avec** le produit complet de `useCoreStore.getState().products` si `cached.name` est absent.
  - Dans `src/lib/db-converters.ts` (L451, L571) et `src/services/SyncService.ts` (L937–970), ne pas injecter `'Sans nom'` lors d'une mise à jour partielle afin que `SyncService` utilise `.update()` au lieu d'un `.upsert()` destructeur.
- [x] **[P0-SYNC-4]** Fusionner les payloads (`{ ...existing.payload, ...item.payload }`) dans `dedupMap` (`src/services/SyncService.ts` L344, L655) et annuler tout `UPSERT` antérieur dans `dedupMap` lorsqu'un `DELETE` porte sur la même clé `table:recordId`.
- [x] **[P0-SYNC-5]** Remplacer `localDb.update('products/...')` par `localDb.updateLocalOnly('products/...')` (ou ne mettre à jour que les colonnes non-stock) lorsqu'un `enqueueStockAdjustment` est déjà appelé dans `purchaseDbOperations.ts`, `useGRNLogic.ts`, `useDeliveryActions.ts`, `useSupplierDamaged.ts` et `useAuditLogsLogic.ts`.
- [x] **[P0-SYNC-6]** Protéger les callbacks Realtime (`processBatchedProductUpdates` et `processTableBatch` dans `src/hooks/data-fetching/useProductsAndCoreData.ts`) contre l'écrasement des IDs présents dans `loadPendingSyncQueue()` / `getDeletedRecordIds()`, vérifier `updatedAt`, et ajouter le listener Realtime / `localDb.subscribe` manquant pour `employees`.
- [x] **[P0-BIZ-1]** Corriger `src/components/CashflowReport.tsx` (L25–73) : exclure les dépenses `'Remboursement / Retour'` de `expensesTotal` (ou ne compter dans `returnsTotal` que les remboursements non déjà comptés en dépense) et déduire `balanceUsed` / exclure `paymentMethod === 'balance'` de `cashInTotal`.
- [x] **[P0-BIZ-2]** Corriger le Rapport Z dans `src/hooks/useCashManagementLogic.ts` (L35–70) : ne pas soustraire deux fois une vente intégralement retournée pendant le même shift, calculer le cash réellement encaissé (`total - balanceUsed`), et comparer précisément les horodatages des dépenses du shift.
- [x] **[P0-BIZ-3]** Corriger `src/components/EditTransactionModal.tsx` : préserver les remises (`discountAmount`, `pointsDiscount`, `voucherDiscount`), mettre à jour le solde et les points du client dans `localDb` et `usePeopleStore`, utiliser un `adjustmentId` unique par édition (`Date.now()`), passer par `localDb.update` au lieu d'appeler Supabase avant IndexedDB, et sécuriser `Number(item.price || 0).toFixed(2)`.
- [x] **[P0-BIZ-4]** Mettre à jour `viewingDetailsSupplier` après un paiement dans `src/hooks/suppliers/useSupplierPayments.ts` (L69–90) et mettre à jour `setSuppliers` dans `src/hooks/useSuppliersLogic.ts` (L180–215).
- [x] **[P0-BIZ-5]** Hacher avec `bcrypt` et sauvegarder le mot de passe/PIN employé dans `src/hooks/useEmployeesLogic.ts` (L161–178) et mettre à jour `usePeopleStore.getState().setEmployees(...)` lors de l'ajout, la modification et la suppression.
- [x] **[P0-SEC-1]** Sécuriser via migration SQL Supabase les RPCs `SECURITY DEFINER` (`apply_stock_adjustment`, `adjust_product_stock`, `adjust_customer_balance`, `update_app_customer_loyalty`) en révoquant `EXECUTE` pour `anon` et en vérifiant `auth.role() = 'authenticated'`.
- [x] **[P0-SEC-2]** Restreindre les colonnes lues et mises en cache dans `AuthService.ts` et `useAuthUser.tsx` (ne jamais stocker `password_hash` ni `pin` en clair dans `nexus_users` / `nexus_employees_cache`).
- [x] **[P0-SEC-3]** Corriger la vérification `isVerifiedAdmin` dans `src/hooks/useAppPermissionsAndStats.ts` (L68–73), préserver `role` dans `AuthService.trigger()` (`src/services/AuthService.ts` L167) et restaurer le vrai rôle lors du login offline dans `src/hooks/useAuthActions.tsx` (L133).
- [x] **[P0-SEC-4]** Protéger par authentification/token LAN les routes `/api/customer-display/barcode`, `/api/ai/complete`, `/api/ai/scan` et les événements Socket.IO dans `server.ts`.
- [x] **[P0-SEC-5]** Corriger `src/components/PinLockModal.tsx` pour vérifier le PIN via `/api/auth/verify-password` ou le hash bcrypt de l'employé actif sans jamais accepter `'0000'` / `'1234'` par défaut.

### Priorité P1 — Majeur (Fiabilité Métier, Sécurité Serveur & Performance)
- [x] **[P1-SYNC-7]** Corriger `CheckoutHeader.tsx` (`settings/company`), `useCheckoutProcess.ts` (cibler uniquement `promotions` ou `vouchers` selon l'origine du bon), `local-db.ts` (`invoice_patterns`), `orderStockService.ts` / `LocalDatabase.ts` (éviter les appels Supabase directs redondants), `SyncService.ts` (fusionner `nexus_emergency_sync_queue` au démarrage et unifier `recordKey = productId` pour `stock_adjustments`), et `backupRestoreService.ts` (inclure les archives, restaurer `employees`/`purchases`/`stockAdjustments` et éviter l'overflow `localStorage` sur `products`).
- [x] **[P1-BIZ-6]** Dans `src/hooks/useReturnModalLogic.ts`, mettre à jour `useFinanceStore.setExpenses` et `useCoreStore.setPromotions`, réincrémenter les lots `batches` pour les produits `useMultiExpiry`, et plafonner les points retirés aux points réellement gagnés sur la transaction.
- [x] **[P1-BIZ-7]** Dans `src/components/StockAdjustmentModal.tsx`, persister `updatedProduct` (`batches`, `damagedStock`, `expirationDate`) dans `localDb.updateLocalOnly` et `useCoreStore.setProducts`, et sécuriser `user?.uid`. Dans `src/hooks/useExpiryManagerLogic.ts`, stabiliser `now` (hors rendu), gérer `batches` dans `handleSaveQuickDate`, et dédupliquer par produit dans `handleBatchDiscount`.
- [x] **[P1-BIZ-8]** Exclure `t.status === 'cancelled'` dans `src/components/AccountingChartsReport.tsx`, corriger la prise en compte des retours et du taux de marge dans `src/hooks/useProfitsReportLogic.ts`, et ajouter `isLoss: true` sur les écarts négatifs dans `src/components/InventoryAudit.tsx`.
- [x] **[P1-BIZ-9]** Corriger la dette initiale d'un fournisseur créé à la volée dans `useSmartPurchaseLogic.ts`, le transfert de dette lors d'un changement de fournisseur dans `purchaseDbOperations.ts`, la mise à jour du solde fournisseur dans `useGRNLogic.ts`, le retrait de `keepExcessInBalance` et l'appel `setProducts` en mode édition dans `useCheckoutProcess.ts`, et l'ajustement de stock lors de la modification d'une commande confirmée dans `useOrdersLogic.ts`.
- [x] **[P1-SEC-6]** Dans `server.ts` (`/api/auth/verify-password`), ajouter `password_hash, pin` au `.select(...)` sur la table `employees` et autoriser les mots de passe/PINs dès 4 caractères.
- [x] **[P1-SEC-7]** Désactiver `F12` en production dans `electron/main.js`, restreindre le filtre SQLite IPC, vérifier `foundUser.pin` dans `AuthService.ts`, et appeler `setUser` dans `CameraLogin` (`App.tsx:475`).
- [x] **[P1-PERF-1]** Supprimer le double appel à `useProductStats()` entre `MainAppContent.tsx` et `AppModals.tsx`.
- [x] **[P1-PERF-2]** Passer `expandedSelectedCategories` à `useInventoryData` et utiliser `deferredSearch` dans le `useEffect` de pagination de `src/components/Inventory.tsx`.
- [x] **[P1-PERF-3]** Ajouter une pagination (50 éléments/page) dans `src/components/suppliers/SupplierList.tsx` et `src/components/smart-purchase/SubTabPurchasesHistory.tsx`.

### Priorité P2 — Mineur (Ergonomie UI & Exports)
- [x] **[P2-UI-1]** Corriger la redirection vers la caisse (`setActiveTab('pos')`) depuis `useCustomersLogic.ts` (L460–464), mettre à jour `useCoreStore.setProducts` après `handleBulkUpdate` dans `useInventoryActions.ts`, et exclure les ventes annulées/retournées tout en utilisant `t.taxAmount` dans l'export CSV de `DetailedReports.tsx`.
