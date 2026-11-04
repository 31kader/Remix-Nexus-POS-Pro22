# Audit Clean-Room Intégral (100 % Neuf — Sans Lecture d'Anciens Rapports) — Nexus POS Pro v1.2.33
**Date** : 17 Octobre 2026
**Méthode** : Inspection directe et intégrale du code source actuel (`src/`, `server.ts`, `electron/`) et de la base de données PostgreSQL/Supabase en production (`unlwfvldqxfccgrrgbwf`), **sans consulter aucun ancien fichier `.md`**.

---

## Suivi Incrémental des Phases d'Audit
- [x] **Phase 1** : Inspection en direct de la base Supabase (`unlwfvldqxfccgrrgbwf` — Schéma réel `information_schema.columns` vs `TABLE_COLUMNS`, Politiques RLS `pg_policies`, Fonctions RPC `pg_proc`, Advisors Sécurité)
- [x] **Phase 2** : Audit approfondi de la Synchronisation Offline-First, IndexedDB & Réseau (`SyncService.ts`, `LocalDatabase.ts`, `local-db.ts`, `db-converters.ts`, `useProductsAndCoreData.ts`, `useAdminStaticData.ts`, `useFastChangingData.ts`, `stockService.ts`, `orderStockService.ts`, `backupRestoreService.ts`, `SyncStudio.tsx`)
- [x] **Phase 3** : Audit approfondi de la Logique Métier, Caisse, Stocks, Achats, Retours & Rapports Financiers (`useCheckoutProcess.ts`, `EditTransactionModal.tsx`, `useReturnModalLogic.ts`, `purchaseDbOperations.ts`, `useGRNLogic.ts`, `useCustomersLogic.ts`, `useDeliveryActions.ts`, `useOrdersLogic.ts`, `useSupplierDamaged.ts`, `useCashManagementLogic.ts`, `CashflowReport.tsx`, `AccountingChartsReport.tsx`, `GroupedSalesAndBasketsReport.tsx`, `FidelityStatsReport.tsx`, `LossesReport.tsx`)
- [x] **Phase 4** : Audit approfondi de la Sécurité, Authentification, Serveur LAN & Electron (`server.ts`, `electron/main.js`, `electron/preload.js`, `AuthService.ts`, `useAuthUser.tsx`, `useAuthActions.tsx`, `PinLockModal.tsx`, `LoginView.tsx`, `KioskPriceTerminal.tsx`, `CameraLogin.tsx`)
- [x] **Phase 5** : Audit approfondi de la Performance React, Zustand, Mémoire & UI (`AppModals.tsx`, `AuditLogs.tsx`, `Orders.tsx`, `customerDisplayService.ts`, `CustomerDisplayWindow.tsx`)
- [x] **Phase 6** : Consolidation finale & Plan d'action priorisé (`P0`, `P1`, `P2`)

---

## 1. Base de Données Supabase (`unlwfvldqxfccgrrgbwf`) & Schéma vs Code

### 🔴 [P0-DB-1] Colonnes absentes dans `public.employees` et `public.users` sur Supabase provoquant des erreurs HTTP 400 (`42703`) au login et supprimant les mots de passe employés à la synchro
- **Fichiers** :
  - [AuthService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/AuthService.ts#L301-L316)
  - [server.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L438-L441)
  - [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L199-L203)
  - [useEmployeesLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useEmployeesLogic.ts#L177-L180)
- **Preuve Supabase (`information_schema.columns`)** :
  - `public.employees` ne contient que : `id, name, role, phone, email, hire_date, status, is_clocked_in, base_salary, salary_type, hourly_rate, daily_rate, id_card_recto_url, id_card_verso_url, contract_url, digital_signature_url`. **Il manque `password_hash`, `pin`, `permissions`, `updated_at`**.
  - `public.users` ne contient que : `id, uid, email, display_name, password_hash, role, join_date, password`. **Il manque `name`, `phone`, `employee_id`, `status`, `pin`, `updated_at`**.
- **Impacts critiques** :
  1. `AuthService.ts` (L301–303 et L314–316) exécute `.select('..., name, phone, employee_id, status, pin, updated_at')` sur `users` et `.select('..., permissions, password_hash, pin, updated_at')` sur `employees`. PostgREST renvoie **HTTP 400 (`42703: column does not exist`)** à chaque tentative de connexion distante !
  2. `server.ts` (L438–441) `/api/auth/verify-password` sélectionne aussi ces colonnes inexistantes et échoue en **HTTP 400**.
  3. `TABLE_COLUMNS.employees` (`db-converters.ts:199–203`) ne contient ni `password_hash`, ni `pin`, ni `permissions`, ni `updated_at` : `preparePayload` élimine donc le mot de passe/PIN haché des employés lors de leur synchronisation vers Supabase.

### 🔴 [P0-DB-2] Colonnes fantômes dans `TABLE_COLUMNS.suppliers` et `TABLE_COLUMNS.supplier_syncs` absentes de Supabase
- **Fichier** : [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L229-L235) et [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L292-L295)
- **Preuve** :
  - `TABLE_COLUMNS.suppliers` autorise `'rating_quality', 'rating_delivery', 'rating_price'`, absentes de `public.suppliers` sur Supabase.
  - `TABLE_COLUMNS.supplier_syncs` autorise `'supplier_name', 'file_url', 'mapping', 'auto_sync', 'sync_frequency', 'error_message'`, absentes de `public.supplier_syncs` sur Supabase.
  - Tout `upsert` incluant ces champs échoue avec `PGRST204`.

### 🔴 [P0-DB-3] Politique RLS `users_anon_select` active sur Supabase et incompatibilité d'authentification des caissiers (`employees`) avec les RPCs/RLS
- **Fichiers** : [AuthService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/AuthService.ts#L368-L376) et [useProductsAndCoreData.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useProductsAndCoreData.ts#L105-L112)
- **Mécanisme** :
  1. Sur Supabase (`pg_policies`), la politique `users_anon_select` (`USING (true)` pour `anon`) expose encore `public.users`, et `useProductsAndCoreData.ts` (L108, L479, L1094) télécharge `users` (avec `password_hash` et `password`) même quand `userId === 'unauthenticated'` et l'écrit en clair dans `idbSet('nexus_users', ...)`.
  2. Inversement, les employés POS (`public.employees`) se connectent via `AuthService.ts` sans session Supabase Auth (`auth.uid() IS NULL`, rôle PostgreSQL `anon`), ce qui entre en conflit avec les politiques RLS et RPCs (`apply_stock_adjustment`, `adjust_customer_balance`, `products`) restreintes au seul rôle `authenticated`.

---

## 2. Synchronisation Offline-First, IndexedDB & Réseau

### 🔴 [P0-SYNC-1] `SyncService.ts` (L971–973) — Destruction systématique du lien parent-enfant (`parent_id = null` / déconditionnement `autoUnpack`) lors de la synchro produit
- **Fichier** : [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L859-L973)
- **Mécanisme exact** :
  - Aux lignes `859–901`, `remoteProducts` ne récupère plus que les produits dont le `sku` ou le `barcode` figure dans le lot courant (`queueSkus` / `queueBarcodes`). Il ne récupère **pas** les produits parents (`parent_id`).
  - Or, à la ligne `971` :
    ```ts
    if (payload.parent_id && !remoteProducts?.some((p: any) => p.id === payload.parent_id)) {
      payload.parent_id = null;
    }
    ```
  - Comme le produit parent n'est presque jamais dans `remoteProducts`, `SyncService` **écrase `payload.parent_id = null`** sur Supabase à chaque synchronisation d'un produit enfant, détruisant le déconditionnement automatique (`autoUnpack`) !

### 🔴 [P0-SYNC-2] `SyncService.ts` (Étape 4.8 & Étape 5) + `db-converters.ts` — Écrasement du nom client par `'Client'`, pollution de `extraPayload` et perte de deltas financiers
- **Fichiers** :
  - [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L1242-L1325)
  - [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L364-L378) et [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L601-L632)
- **Mécanisme exact** :
  1. `useProductsAndCoreData.ts` stocke les clients, fournisseurs et utilisateurs dans `usePeopleStore` et `idb('nexus_customers')`, mais **ne peuple jamais `dbState.customers`, `dbState.suppliers`, ni `dbState.users`**.
  2. Dans `db-converters.ts` (L364–378), `preparePayload` ne cherche que dans `dbState` (sans fallback vers `usePeopleStore.getState()`). Dès qu'un `extraPayload` (L1252) ou un update partiel est préparé, `preparePayload` force `filtered.name = 'Client'` (pour `customers`), `'Fournisseur'` (pour `suppliers`), ou `display_name = 'Utilisateur'` et **`role = 'staff'`** (pour `users`, rétrogradant un admin en staff !).
  3. À l'étape 4.8 (`SyncService.ts:1265–1325`), si le RPC `adjust_customer_balance` échoue, le client tombe dans l'étape 5 (`otherItems`) qui fait un `upsert` ignorant `deltaBalance`/`deltaSpent`/`deltaPoints`, puis `markOtherRecordCompleted` (L1320) marque les deltas comme envoyés, **perdant définitivement la variation de solde du client**.

### 🔴 [P0-SYNC-3] `LocalDatabase.ts` (L193) + `orderStockService.ts` (L307) — `SUPABASE_FIRST_TABLES` bloque la synchronisation de `online_orders` (`syncedToPos: true` jamais envoyé à Supabase)
- **Fichiers** : [LocalDatabase.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/LocalDatabase.ts#L193-L342) et [orderStockService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/orderStockService.ts#L304-L311)
- **Mécanisme exact** :
  - `destockOrder` appelle `await localDb.update('onlineOrders/' + orderIdStr, { syncedToPos: true })` avec le commentaire *"localDb.update enfile automatiquement dans SyncService"*.
  - Or `LocalDatabase.ts` (L193) définit `const SUPABASE_FIRST_TABLES = new Set(['onlineOrders', 'online_orders']);` et ignore `enqueueSync` pour cette table (L272, L287, L337) !
  - **Impact** : `synced_to_pos` reste à `false` sur Supabase, causant un **double déstockage** au rafraîchissement ou sur un second poste.

### 🔴 [P0-SYNC-4] `useAdminStaticData.ts` & `useFastChangingData.ts` — Écrasement destructif des `employees` et clôture inopinée du `activeShift` via `localDb.subscribe`
- **Fichiers** :
  - [useAdminStaticData.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useAdminStaticData.ts#L126-L234)
  - [useFastChangingData.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useFastChangingData.ts#L140-L222)
- **Mécanisme exact** :
  1. `useAdminStaticData.ts` charge les employés depuis Supabase sans peupler `dbState.employees`. Dès que `localDb.subscribe('employees')` (L223) se déclenche, `if (e && e.id && data[e.id])` **supprime tous les employés absents de `dbState.employees`** !
  2. `useFastChangingData.ts` charge les shifts depuis Supabase (L140–147) sans appeler `replaceTableState('cash_shifts', shiftsData)`. Dès que `localDb.subscribe('shifts')` (L177–222) s'exécute au démarrage ou lors d'un `localDb.update` partiel, `findActiveShiftForTerminal` ne trouve plus `status === 'open'` et **passe `activeShift` à `null` en pleine vente**.

### 🔴 [P0-SYNC-5] `db-converters.ts` + `SyncService.ts` — Écrasement de `category_id` par `'uncategorized'`, stock initial perdu (`-3` au lieu de `47`), et harmonisation par `null`
- **Fichiers** : [db-converters.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L353-L598) et [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L944-L1085)
- **Mécanisme exact** :
  1. Dans `preparePayload('products')` (L356), `storeCached` n'est lu dans `useCoreStore` que si `!dbCached || !dbCached.name`. Si `dbState.products[id]` contient un fragment avec `name` mais sans `categoryId`, les lignes `589–597` forcent `category_id = 'uncategorized'`.
  2. Dans `SyncService.ts` (L959–961), `if (payload.id && stockDeltaIds.has(String(payload.id))) delete payload.stock;` supprime le stock initial d'un produit **créé hors-ligne** puis vendu hors-ligne : il est inséré à `0` sur Supabase puis décrémenté par le RPC (`0 - 3 = -3` au lieu de `50 - 3 = 47`).
  3. Dans `SyncService.ts` (L1077–1085 et L1330–1338), l'harmonisation des clés d'un lot met `null` sur toutes les clés absentes d'un item partiel, écrasant les colonnes existantes sur Supabase.
  4. Dans `db-converters.ts` (L456), `if (key === 'status') return 'active'` injecte un statut invalide `'active'` sur `transactions`, `online_orders`, `cash_shifts`, `purchases`, `returns`.

### 🔴 [P0-SYNC-6] `SyncService.ts` (L310–322 & L650–663) — Un ajustement de stock `mode: 'delta'` écrase un `mode: 'set'` précédent dans `dedupMap`
- **Fichier** : [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L310-L322) et [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L650-L663)
- **Mécanisme** : Si un inventaire fixe le stock à `100` (`mode: 'set', newQuantity: 100`) hors-ligne, puis qu'une vente de `-2` (`mode: 'delta', adjustment: -2, newQuantity: undefined`) survient avant la synchro, `{ ...existing.payload, ...item.payload }` écrase `mode` par `'delta'` et `newQuantity` par `undefined` au lieu de conserver `mode: 'set'` avec `newQuantity: 100 - 2 = 98`.

### 🔴 [P0-SYNC-7] `useProductsAndCoreData.ts` — Écrasement des stocks produits et soldes clients en attente lors du Delta Sync / Reconnexion et Realtime
- **Fichier** : [useProductsAndCoreData.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useProductsAndCoreData.ts#L289-L348) et [useProductsAndCoreData.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useProductsAndCoreData.ts#L729-L773)
- **Mécanisme** :
  1. `syncProducts()` (L290–303 et L333–348) ne vérifie que `i.table === 'products'` dans `pendingQueue` et **oublie `stock_adjustments`**. Au retour d'Internet (`online` à 0 ms), `syncProducts` écrase les stocks décrémentés hors-ligne par les anciens stocks distants avant que `SyncService` (debounce 300 ms) n'ait exécuté `apply_stock_adjustment`.
  2. Ligne `740` cherche `q.action === 'ADJUST_CUSTOMER_BALANCE'` (qui n'existe jamais, car `enqueueCustomerBalanceAdjustment` utilise `'UPSERT'` avec `deltaBalance`), laissant Realtime et `syncTableFromNetwork` (L1078) écraser le `balance` optimiste du client.

### 🔴 [P0-SYNC-8] `backupRestoreService.ts` — La restauration `.nexus-backup` rejoue tout l'historique `stockAdjustments` en deltas RPC sur Supabase et omet 9 tables
- **Fichier** : [backupRestoreService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/backupRestoreService.ts#L156-L280)
- **Mécanisme** :
  1. Ligne `232` : `await localDb.insertBatch('stockAdjustments', saMap)` met tout l'historique des mouvements de stock dans `SyncService`, qui supprime `stock` de l'upsert produit et appelle `apply_stock_adjustment` pour chaque mouvement historique !
  2. Lignes `181` et `189` : écrit dans `nexus_customers_cache` / `nexus_suppliers_cache` au lieu de `nexus_customers` / `nexus_suppliers`.
  3. Omet de restaurer 9 tables pourtant sauvegardées dans `createBackupArchive` (`purchaseOrders`, `onlineOrders`, `goodsReceiptNotes`, `shifts`, `audits`, `attendance`, `advances`, `shortageItems`, `customReplenishmentLists`).

### 🟠 [P1-SYNC-9] `SyncService.ts` (L55–127) — Race condition au démarrage dans `initSyncQueueFromStorage()` doublant les deltas en vol via `nexus_emergency_sync_queue`
- **Fichier** : [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L55-L127)

### 🟠 [P1-SYNC-10] `SyncService.ts` (L736–849, L978–997) — Oubli de `hadNetworkError` aux étapes 2 & 3 et désynchronisation de `completedKeys` lors du réalignement d'`id`
- **Fichier** : [SyncService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L736-L849)

### 🟠 [P1-SYNC-11] `orderStockService.ts` & `stockService.ts` — Absence de consolidation préalable par `productId` (`Map`) et concurrence entre RPC direct et file `SyncService`
- **Fichiers** : [orderStockService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/orderStockService.ts#L124-L207) et [stockService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/stockService.ts#L58-L114)

### 🟠 [P1-SYNC-12] `SyncStudio.tsx` + `utils.ts` — Lots d'upsert non harmonisés (`PGRST102`), colonnes omises (`video_url`, `price_history`, `level`, `image_url`) et purge prématurée du cache IDB
- **Fichiers** : [SyncStudio.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/SyncStudio.tsx#L161-L302) et [utils.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/utils.ts#L356-L460)

### 🟡 [P2-SYNC-13] `local-db.ts` (L317), `LocalDatabase.ts` (L68) & `supabaseFetchHelper.ts` (L247) — Course asynchrone dans `partitionOldTransactions`, clés manquantes dans `TABLE_TO_IDB_CACHE_KEY`, et tri secondaire `.order('id')` manquant
- **Fichiers** : [local-db.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/local-db.ts#L317-L350), [LocalDatabase.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/LocalDatabase.ts#L68-L96), [supabaseFetchHelper.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/supabaseFetchHelper.ts#L247-L260)

---

## 3. Logique Métier, Caisse, Stocks, Achats, Retours & Rapports Financiers

### 🔴 [P0-BIZ-1] Double remboursement lors d'un retour en mode Avoir (`credit_note`) sur une vente à crédit (`useReturnModalLogic.ts`)
- **Fichier** : [useReturnModalLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useReturnModalLogic.ts#L119-L223)
- **Mécanisme exact** :
  - Lignes `119–144` : crée un code promo d'avoir (`promotions/${promoId}`) de `totalRefund` DA lorsque `returnType === 'credit_note'`.
  - Lignes `198–222` : recrédite **quand même** le solde du client (`balance: (customer.balance || 0) + balanceRefund`) sans vérifier `if (returnType !== 'credit_note')`. Le client obtient l'effacement de sa dette **ET** un bon d'achat de la même valeur.

### 🔴 [P0-BIZ-2] Sur-remboursement du solde client lors de retours partiels multiples sur une même transaction à crédit (`useReturnModalLogic.ts`)
- **Fichier** : [useReturnModalLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useReturnModalLogic.ts#L198-L236)
- **Mécanisme exact** :
  - Ligne `198` : `originalBalanceUsed` est lu sur `transaction.balanceUsed` sans déduire les remboursements sur solde déjà effectués lors de retours partiels antérieurs sur cette même transaction.

### 🔴 [P0-BIZ-3] Double pénalité sur les retours complets et perte de `refundMethod` après synchro dans `CashflowReport.tsx`
- **Fichier** : [CashflowReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/CashflowReport.tsx#L25-L59)
- **Mécanisme exact** :
  1. Ligne `25` exclut `t.status === 'returned'` de `cashInTotal` (`0 DA` d'encaissement), mais la ligne `56` soustrait quand même le remboursement dans `cashOutTotal` (`-100 %` de trésorerie nette fictive).
  2. Ligne `52` filtre sur `r.refundMethod`, qui n'existe pas dans `public.returns` sur Supabase (`type` est utilisé en base), comptant les avoirs (`type === 'credit_note'`) et retours sur crédit comme des décaissements d'espèces.

### 🔴 [P0-BIZ-4] Double déduction des retours (CA exclu + Dépense de remboursement déduite) dans `AccountingChartsReport.tsx`
- **Fichier** : [AccountingChartsReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L101-L129)
- **Mécanisme exact** : Exclut les transactions retournées de `totalRevenue` (L101) tout en incluant les dépenses `'Remboursement / Retour'` dans `totalExpenses` (L126).

### 🔴 [P0-BIZ-5] Règlements de dettes clients et acomptes (`handleTopUp`) invisibles dans le Rapport Z (`useCashManagementLogic.ts`) et la Trésorerie (`CashflowReport.tsx`)
- **Fichiers** : [useCustomersLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCustomersLogic.ts#L220-L299), [useCashManagementLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/cash-management/useCashManagementLogic.ts#L80-L128), [CashflowReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/CashflowReport.tsx#L26-L43)
- **Mécanisme exact** : Un règlement de dette client dans `handleTopUp` modifie `customer.balance` sans enregistrer de transaction ou d'encaissement de caisse, faussant le tiroir-caisse attendu (`expectedCash`) du Rapport Z et la Trésorerie.

### 🔴 [P0-BIZ-6] Divergence du Chiffre d'Affaires sur les retours partiels (`partially_returned`) et complets (`returned`) entre les rapports
- **Fichiers** : [useTransactionHistoryLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useTransactionHistoryLogic.ts#L374-L376), [AccountingChartsReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L65-L124), [GroupedSalesAndBasketsReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/GroupedSalesAndBasketsReport.tsx#L115-L270), [useCashManagementLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/cash-management/useCashManagementLogic.ts#L86)

### 🟠 [P1-BIZ-7] Mode édition de vente en caisse (`useCheckoutProcess.ts` `isEditing`) ignorant `batches` (`useMultiExpiry`) et `autoUnpack`
- **Fichier** : [useCheckoutProcess.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCheckoutProcess.ts#L239-L250)

### 🟠 [P1-BIZ-8] `EditTransactionModal.tsx` : Calcul erroné de `newBalanceUsed` et upsert direct sur Supabase
- **Fichier** : [EditTransactionModal.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/EditTransactionModal.tsx#L116-L181)

### 🟠 [P1-BIZ-9] Oubli de la monnaie conservée en solde (`keepExcessInBalance`) dans le tiroir-caisse attendu (`useCashManagementLogic.ts`) et `CashflowReport.tsx`
- **Fichiers** : [useCashManagementLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/cash-management/useCashManagementLogic.ts#L80-L84) et [CashflowReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/CashflowReport.tsx#L26-L33)

### 🟠 [P1-BIZ-10] `useDeliveryActions.ts` n'utilise pas `destockOrder`, ignore les bundles et ne met pas à jour les stores Zustand
- **Fichier** : [useDeliveryActions.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useDeliveryActions.ts#L80-L175)

### 🟠 [P1-BIZ-11] `saveOrderItems` (`useOrdersLogic.ts`) ignore les bundles et les points/CA client lors de la modification d'une commande déjà synchronisée
- **Fichier** : [useOrdersLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useOrdersLogic.ts#L415-L477)

### 🟠 [P1-BIZ-12] Avaries fournisseurs (`useSupplierDamaged.ts`) : Stock UI non rafraîchi (`useCoreStore`) et pertes absentes de `LossesReport.tsx`
- **Fichiers** : [useSupplierDamaged.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/suppliers/useSupplierDamaged.ts#L53-L71) et [LossesReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/LossesReport.tsx#L45-L50)

### 🟠 [P1-BIZ-13] `useUpdatePricesLogic.ts`, `handleSupplierPaymentDb` (`purchaseDbOperations.ts`) et `onMarkAsDelivered` (`App.tsx`) ne mettent pas à jour les stores Zustand
- **Fichiers** : [useUpdatePricesLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useUpdatePricesLogic.ts#L55-L70), [purchaseDbOperations.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/purchaseDbOperations.ts#L380-L429), [App.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/App.tsx#L575-L577)

### 🟠 [P1-BIZ-14] `useGRNLogic.ts` : La réception GRN ignore les produits `isBundle` et désynchronise `batches` si `expiryDate` est vide sur un produit `useMultiExpiry`
- **Fichier** : [useGRNLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useGRNLogic.ts#L96-L177)

### 🟠 [P1-BIZ-15] `GroupedSalesAndBasketsReport.tsx` ("Produits Groupés") ignore les remises globales du panier (`discountAmount`, `pointsDiscount`, `voucherDiscount`)
- **Fichier** : [GroupedSalesAndBasketsReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/GroupedSalesAndBasketsReport.tsx#L165-L171)

### 🟠 [P1-BIZ-16] `FidelityStatsReport.tsx` inverse le signe de la dette client (`balance > 0` affiché en rouge comme dette)
- **Fichier** : [FidelityStatsReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/FidelityStatsReport.tsx#L174-L424)

### 🟠 [P1-BIZ-17] `useProductFormLogic.ts` écrase le stock sur Supabase via `.upsert()` direct sans `enqueueStockAdjustment` et sans synchroniser `stock` avec la somme des `batches`
- **Fichier** : [useProductFormLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useProductFormLogic.ts#L259-L366)

### 🟡 [P2-BIZ-18] `useExpiryManagerLogic.ts` restaure un prix démarqué en divisant en dur par `0.8` (`L274`) et `LossesReport.tsx` replie le coût unitaire sur `product.price` TTC si `costPrice === 0` (`L59`)
- **Fichiers** : [useExpiryManagerLogic.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useExpiryManagerLogic.ts#L271-L280) et [LossesReport.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/LossesReport.tsx#L56-L60)

---

## 4. Sécurité, Authentification, Serveur LAN, Electron & Performance UI

### 🔴 [P0-SEC-1] `electron/main.js` (L55 vs L316) — Crash `ReferenceError: PORT is not defined` dans `onHeadersReceived` bloquant les requêtes du `.exe`
- **Fichier** : [main.js](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/electron/main.js#L312-L322)
- **Mécanisme exact** : La constante s'appelle `SERVER_PORT` (L55), mais la ligne `316` évalue ``[`http://localhost:${PORT}`]`` dans `session.defaultSession.webRequest.onHeadersReceived`, levant `ReferenceError: PORT is not defined` avant `callback({ responseHeaders })` sur chaque requête `.supabase.co` ou `localhost`.

### 🔴 [P0-SEC-2] `PinLockModal.tsx` (L82–152) + `AppHeader.tsx` (L336, L485) + `server.ts` (L409, L501) — Verrouillage PIN impossible à déverrouiller (Lockout permanent de la caisse)
- **Fichiers** : [PinLockModal.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/PinLockModal.tsx#L82-L152), [AppHeader.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/AppHeader.tsx#L336-L485), [server.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L407-L501)
- **Mécanisme exact** :
  1. `stripSensitiveCredentials` a retiré `pin` et `passwordHash` de `profile`, `dbState.users` et `dbState.employees`, donc `expectedPin` est `undefined` et `candidateHashes` est vide.
  2. `PinLockModal.tsx` (L100) lit `offlineCreds.passwordHash` alors que `useAuthActions.tsx` (L146–157) stocke un dictionnaire indexé par email/téléphone avec la clé `.hash` (`offlineCreds[key].hash`).
  3. Le fallback `fetch('/api/auth/verify-password')` (L139) n'envoie pas `table` (rejeté en **HTTP 400** par `server.ts:409`) et attend `data?.valid` alors que `server.ts:501` renvoie `res.json(safeRecord)` sans propriété `valid`.

### 🔴 [P0-SEC-3] `LoginView.tsx` (L74) & `KioskPriceTerminal.tsx` (L340–347) — Lecture directe de l'enveloppe chiffrée AES-256-GCM via `getIDB('nexus_db_users')`
- **Fichiers** : [LoginView.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/LoginView.tsx#L71-L84) et [KioskPriceTerminal.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/public-price-checker/KioskPriceTerminal.tsx#L338-L360)
- **Mécanisme exact** : `getIDB('nexus_db_users')` retourne l'enveloppe chiffrée `{ __encrypted: true, __version: 2, data: "aes:v1:..." }`. `Object.values(usersObj)` produit `[true, 2, "aes:v1:..."]`, cassant l'écran de connexion PIN et empêchant de quitter le mode Kiosque.

### 🟠 [P1-SEC-4] `CameraLogin.tsx` (L24, L40) — Table `'users'` codée en dur (exclut `employees`) et payload `snake_case` non converti (`displayName: undefined`)
- **Fichier** : [CameraLogin.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/CameraLogin.tsx#L21-L48)

### 🟠 [P1-SEC-5] `server.ts` (L271, L284) — Secret LAN par défaut `'nexus-pos-lan-v1'` ou préfixe `'offline_token_'` contournable
- **Fichier** : [server.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L271-L290)

### 🟠 [P1-PERF-6] Tempête de diffusion quadruplée (4x) vers l'afficheur client à chaque modification du panier
- **Fichiers** : [customerDisplayService.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/customerDisplayService.ts#L131-L152), [server.ts](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L312-L334), [CustomerDisplayWindow.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/CustomerDisplayWindow.tsx#L57-L86)

### 🟠 [P1-PERF-7] `AuditLogs.tsx` (L181–265) — Ré-abonnement en boucle sur `localDb.subscribe('transactions')` à cause de la dépendance `[auditLogs.length]`
- **Fichier** : [AuditLogs.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/AuditLogs.tsx#L181-L265)

### 🟠 [P1-PERF-8] `AppModals.tsx` (L1–27) — 20 modales importées statiquement au lieu de `React.lazy()` + `Suspense` (règle `GEMINI.md`)
- **Fichier** : [AppModals.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/AppModals.tsx#L1-L27)

### 🟠 [P1-PERF-9] `Orders.tsx` (L68–133) — Double souscription Realtime `online_orders` et double sonnerie avec `useProductsAndCoreData.ts`
- **Fichier** : [Orders.tsx](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/Orders.tsx#L68-L133)

---

## 5. Liste de Tâches de Remédiation Priorisée (Anti-Coupure)

### Priorité P0 (Critique — Bloquants, Crashs, Pertes de Données & Erreurs Comptables)
- [x] **[P0-SEC-1]** Corriger `PORT` → `SERVER_PORT` dans `electron/main.js` (L316) pour éliminer le `ReferenceError` sur toutes les requêtes du `.exe`.
- [x] **[P0-DB-1 & P0-DB-2]** Aligner le schéma Supabase (`public.employees`, `public.users`, `public.returns`) et `TABLE_COLUMNS` (`src/lib/db-converters.ts`), `AuthService.ts` (L301–316) et `server.ts` (L438–441) pour éliminer les erreurs HTTP 400 (`42703` / `PGRST204`) au login et à la synchronisation.
- [x] **[P0-SEC-2 & P0-SEC-3]** Réparer le déverrouillage `PinLockModal.tsx` (lecture correcte de `nexus_offline_credentials[key].hash`, envoi de `table` à `/api/auth/verify-password`, réponse `{ valid: true, user }`), et remplacer `getIDB('nexus_db_users')` par `localDb.get('users')` / `usePeopleStore` dans `LoginView.tsx` et `KioskPriceTerminal.tsx`.
- [x] **[P0-DB-3]** Supprimer la politique `users_anon_select` et le stockage en clair `idbSet('nexus_users')` non authentifié, tout en garantissant le fonctionnement des caissiers POS (`employees`).
- [x] **[P0-SYNC-1]** Dans `SyncService.ts` (L859–973), inclure les `parent_id` dans la vérification distante ou ne jamais écraser `payload.parent_id = null` lorsque `remoteProducts` ne cible que les `sku`/`barcode` du lot.
- [x] **[P0-SYNC-2, P0-SYNC-4 & P0-SYNC-5]** Alimenter et synchroniser `dbState` / `usePeopleStore` / `useCoreStore` dans `preparePayload` (`db-converters.ts`), `useAdminStaticData.ts` (`employees`), `useFastChangingData.ts` (`cash_shifts`), et `SyncService.ts` (Étape 4, 4.8 & 5) pour empêcher l'écrasement de `name` par `'Client'`/`'Fournisseur'`, de `role` par `'staff'`, de `category_id` par `'uncategorized'`, du stock initial d'un produit créé hors-ligne, et du `activeShift`.
- [x] **[P0-SYNC-3]** Retirer `onlineOrders` / `online_orders` du blocage `SUPABASE_FIRST_TABLES` dans `LocalDatabase.ts` (ou synchroniser explicitement `synced_to_pos` dans `destockOrder` / `restockOrder`).
- [x] **[P0-SYNC-6 & P0-SYNC-7]** Dans `SyncService.ts`, combiner correctement `mode: 'set'` suivi d'un `mode: 'delta'` (`newQuantity + delta`), et dans `useProductsAndCoreData.ts`, protéger `stock_adjustments` lors de `syncProducts()` ainsi que les deltas clients (`deltaBalance !== undefined`) lors des événements Realtime / réseau.
- [x] **[P0-SYNC-8]** Dans `backupRestoreService.ts`, utiliser `insertBatchLocalOnly` pour `stockAdjustments` (sans rejouer les deltas historiques en RPC), corriger les clés IDB `nexus_customers` / `nexus_suppliers`, et restaurer les 9 tables manquantes.
- [x] **[P0-BIZ-1 & P0-BIZ-2]** Dans `useReturnModalLogic.ts`, ne pas rembourser le solde client lorsque `returnType === 'credit_note'`, et déduire les remboursements sur solde déjà effectués lors de retours partiels multiples.
- [x] **[P0-BIZ-3, P0-BIZ-4, P0-BIZ-5 & P0-BIZ-6]** Harmoniser les calculs comptables dans `CashflowReport.tsx`, `AccountingChartsReport.tsx`, `useCashManagementLogic.ts`, `GroupedSalesAndBasketsReport.tsx`, `useTransactionHistoryLogic.ts`, et enregistrer les mouvements de caisse lors d'un `handleTopUp` (`useCustomersLogic.ts`).

### Priorité P1 (Majeur — Intégrité Métier, Concurrence & Performance)
- [x] **[P1-SYNC-9, P1-SYNC-10, P1-SYNC-11 & P1-SYNC-12]** Corriger la race condition `initSyncQueueFromStorage`, la détection `hadNetworkError` aux étapes 2 & 3 de `SyncService.ts`, la consolidation par `Map` dans `orderStockService.ts`, la concurrence dans `stockService.ts`, et l'harmonisation des lots dans `SyncStudio.tsx`.
- [x] **[P1-BIZ-7 à P1-BIZ-17]** Corriger `isEditing` (`batches` + `autoUnpack` dans `useCheckoutProcess.ts`), `EditTransactionModal.tsx`, `keepExcessInBalance` dans le Rapport Z, `useDeliveryActions.ts` (déléguer à `destockOrder`), `saveOrderItems` (`useOrdersLogic.ts`), `useSupplierDamaged.ts` (`setProducts` + `LossesReport`), `useUpdatePricesLogic.ts`, `handleSupplierPaymentDb`, `useGRNLogic.ts`, `GroupedSalesAndBasketsReport.tsx`, `FidelityStatsReport.tsx`, et `useProductFormLogic.ts`.
- [x] **[P1-SEC-4, P1-SEC-5 & P1-PERF-6 à P1-PERF-9]** Corriger `CameraLogin.tsx`, le jeton LAN dans `server.ts`, la diffusion quadruplée dans `customerDisplayService.ts` / `CustomerDisplayWindow.tsx`, la boucle `useEffect` dans `AuditLogs.tsx`, le `React.lazy()` dans `AppModals.tsx`, et le canal dupliqué dans `Orders.tsx`.

### Priorité P2 (Mineur — Finitions & Cas Limites)
- [x] **[P2-SYNC-13 & P2-BIZ-18]** Sécuriser `partitionOldTransactions` dans `local-db.ts`, compléter `TABLE_TO_IDB_CACHE_KEY` dans `LocalDatabase.ts`, ajouter `.order('id')` dans `supabaseFetchHelper.ts`, persister `originalPrice` dans `useExpiryManagerLogic.ts`, et ne pas valoriser une perte au prix TTC dans `LossesReport.tsx`.
