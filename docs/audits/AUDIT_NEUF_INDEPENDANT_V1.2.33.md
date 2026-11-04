# 🔬 Audit Clean-Room Indépendant (Zéro Lecture d'Anciens Rapports) — Nexus POS Pro v1.2.33

> **Date de démarrage** : 16 Octobre 2026 à 21:13  
> **Méthodologie** : Inspection directe et intégrale du code source (`src/`, `server.ts`, `electron/`) et de la base PostgreSQL/Supabase (`unlwfvldqxfccgrrgbwf`) **sans consulter aucun rapport antérieur**.  
> **Règle de résilience (`GEMINI.md`)** : Sauvegarde incrémentale sur disque à chaque étape.

---

## 📋 Progression de l'Audit (Liste de Tâches Anti-Coupure)

- [x] **Étape 1** : Audit direct de la base Supabase Live (Schéma, Volumétrie réelle, Triggers, RPC, Policies RLS, Advisors Sécurité & Performance).
- [x] **Étape 2** : Audit profond de la Synchronisation Offline-First (`SyncService.ts`, `LocalDatabase.ts`, `db-converters.ts`, `supabaseFetchHelper.ts`, `useProductsAndCoreData.ts`, Realtime).
- [x] **Étape 3** : Audit des Bugs Métier & Calculs (Caisse `useCheckoutProcess.ts`, Achats `purchaseDbOperations.ts`, Retours `useReturnModalLogic.ts`, Commandes `orderStockService.ts`, Déconditionnement `autoUnpack`, Lots `batches`).
- [x] **Étape 4** : Audit de la Performance & Mémoire (Re-renders Zustand, Pagination, Fuites d'écouteurs, Taille des payloads, Index SQL).
- [x] **Étape 5** : Audit de la Sécurité (`server.ts`, `electron/main.js`, `AuthService.ts`, `security.ts`, RLS Supabase).
- [x] **Étape 6** : Synthèse Consolidée & Plan d'Action Priorisé (Liste de Tâches Anti-Coupure).

---

## 🗄️ Résultats Étape 1 : Audit Direct de la Base Supabase (`unlwfvldqxfccgrrgbwf`)

### 1.1. Volumétrie Réelle et État RLS (33 tables publiques)
- **33 tables** dans le schéma `public`, **100% avec `rls_enabled = true`**.
- **Volumétrie critique observée en production** :
  - `products` : **11 571 lignes** (6 index, 4 policies RLS).
  - `audit_logs` : **5 197 lignes** (2 index, 5 policies RLS).
  - `transactions` : **156 lignes** (3 index, 3 policies RLS).
  - `stock_adjustments` : **105 lignes** (1 index, 1 policy RLS).
  - `customers` : **15 lignes** (2 index, 10 policies RLS).

### 1.2. Advisors Supabase (Performance & Sécurité)
- **Performance Advisor** : **0 erreur, 0 warning**. Seulement 5 notifications `INFO` d'index récemment créés (`idx_custom_replenishment_lists_status`, `idx_shortage_items_status_created`, `idx_audit_logs_updated_at`, `idx_products_name_gin`, `idx_customer_balance_adjustments_cust_date`).
- **Security Advisor** :
  1. `anon_security_definer_function_executable` : 10 fonctions `SECURITY DEFINER` restent exécutables par `anon` (dont `is_admin()`, `is_staff()`, `adjust_customer_balance`, `adjust_product_stock`, `apply_stock_adjustment` qui sont appelées par le client POS avec la clé `anon`, mais `is_admin()` et `is_staff()` n'ont pas besoin d'être exposées en RPC REST à `anon`).
  2. `auth_leaked_password_protection` : Option HaveIBeenPwned désactivée dans le dashboard Supabase Auth.

---

## 🔄 Résultats Étape 2 : Audit Profond de la Synchronisation Offline-First & Intégrité des Données

### 🔴 CRITIQUE P0-SYNC-01 : Risque de destruction massive du catalogue (`products`) en cas de coupure réseau partielle pendant un Full Sync + suppression des produits créés hors-ligne
- **Fichiers** : `src/hooks/data-fetching/supabaseFetchHelper.ts:60-119` et `src/hooks/data-fetching/useProductsAndCoreData.ts:309-329`
- **Mécanisme du bug** :
  1. La table `products` contient **11 571 produits**, récupérés par tranches de 500 (soit 24 requêtes séquentielles dans `fetchProductsFromSupabase`).
  2. Dans `supabaseFetchHelper.ts:60-64` et `109-113`, si la tranche n°2 (ou n°10) échoue à cause d'une micro-coupure Wi-Fi ou d'un timeout de 6 secondes (`ERR_TIMED_OUT`), la boucle `while (hasMore)` fait `hasMore = false; break;` et **retourne quand même le tableau partiel `allProducts`** (ex: seulement 500 produits sur 11 571) au lieu de retourner `null` !
  3. Dans `useProductsAndCoreData.ts:310-326`, le code reçoit ces 500 produits, croit qu'il s'agit de la totalité de la base Supabase, écrase `nexus_products_cache`, puis exécute la boucle de « réconciliation des orphelins » :
     ```ts
     for (const localId of Object.keys(localObj)) {
       if (!serverIdSet.has(localId)) {
         await localDb.delete(`products/${localId}`);
       }
     }
     ```
  4. Or `localDb.delete('products/' + localId)` (`src/services/LocalDatabase.ts:467-473`) n'est **pas** une suppression locale : il inscrit l'ID dans `DELETED_IDS` et **envoie un `DELETE` vers Supabase (`enqueueSync('products', id, 'DELETE', null)` + `supabase.from('products').delete()`)** pour les 11 071 autres produits !
  5. De plus, même si les 24 pages réussissent, tout produit créé hors-ligne par le caissier et encore en attente dans `SyncService` n'est pas encore dans `serverIdSet` et sera supprimé par cette boucle !

### 🔴 CRITIQUE P0-SYNC-02 : Écrasement à vide (`[]`) des caches IndexedDB locaux en cas de timeout réseau au démarrage
- **Fichiers** : `src/hooks/data-fetching/supabaseFetchHelper.ts:261-333` et `src/hooks/data-fetching/useProductsAndCoreData.ts:907-951`
- **Mécanisme du bug** :
  1. Lorsqu'un terminal a le Wi-Fi activé (`navigator.onLine === true`) mais que la connexion Internet est instable ou tombe en timeout (`ERR_TIMED_OUT` après 6s), `fetchTableFromSupabase` sort de la boucle `while (hasMore)` avec `allRecords = []` et exécute la ligne 333 : `return [];` (au lieu de `return null;`).
  2. Dans `useProductsAndCoreData.ts:909`, `if (camelData && isSubscribed)` est **vrai** car `[]` est *truthy* en JavaScript.
  3. Pour toutes les tables chargées sans `lastSyncTime` (`categories`, `brands`, `promotions`, `users`, `expenses`, `stockAdjustments`, `supplierPayments`, `damaged_items`, `goodsReceiptNotes`, `attendance`, `audits`), la condition `if (lastSyncTime)` (ligne 936) est fausse.
  4. `mergedMap` reste donc vide (`updatedCache = []`), et les lignes 949-950 exécutent `setState([])` et `idbSet(cacheKey, [])`, **effaçant intégralement le cache local IndexedDB** (utilisateurs, catégories, marques, dépenses, etc.) alors que l'application devait fonctionner en mode Offline-First !

### 🔴 CRITIQUE P0-SYNC-03 : Perte silencieuse de mouvements de stock, de dettes clients et de modifications produits survenant pendant que `processSyncQueue()` est en cours d'exécution réseau (Race Condition In-Flight)
- **Fichier** : `src/services/SyncService.ts:263-330`, `541-628` et `1228-1246`
- **Mécanisme du bug** :
  1. Lorsque `processSyncQueue()` démarre (`isProcessingQueue = true`), il lit `memorySyncQueue` (ligne 541) et lance des requêtes réseau asynchrones vers Supabase (lignes 684, 774, 950, 1016, 1076, 1156) qui peuvent durer de 500ms à plusieurs secondes.
  2. Pendant ce temps d'attente réseau (`await supabase...`), `memorySyncQueue` contient toujours les éléments en cours d'envoi (car le filtrage ne se fait qu'à la toute fin dans le bloc `finally` à la ligne 1228).
  3. Si le caissier encaisse une 2ème vente sur le même produit (`prod_1`) ou le même client (`cust_1`), ou modifie un produit pendant que la 1ère requête réseau est en vol :
     - `enqueueBatchSync` (lignes 273-328) fusionne le nouveau delta (`delta: -3` ou `deltaBalance: +1000`) dans l'objet `existing` de `memorySyncQueue` (ou remplace l'objet pour la même clé `${item.table}:${item.recordId}`).
     - Or `processSyncQueue()` a **déjà** extrait et envoyé uniquement la valeur du 1er mouvement (`delta = -1`) à Supabase.
  4. Lorsque la 1ère requête réseau se termine, `processSyncQueue()` ajoute la clé générique `"stock_adjustments:prod_1"` (ou `"customers:cust_1"`, `"products:prod_1"`) dans `completedKeys`.
  5. Dans le bloc `finally` (lignes 1228-1231) :
     ```ts
     memorySyncQueue = memorySyncQueue.filter(item => {
       const key = `${item.table}:${item.recordId || item.payload?.id}`;
       if (completedKeys.has(key)) return false;
     ```
     **Toute entrée portant cette clé est supprimée de `memorySyncQueue`**, y compris le 2ème mouvement arrivé pendant l'appel réseau ! Le 2ème déstockage ou la 2ème dette client est **définitivement perdu** et jamais envoyé à Supabase.

### 🔴 CRITIQUE P0-SYNC-04 : Double comptage des ajustements manuels de stock hors-ligne (`StockAdjustmentModal` / `InventoryAuditModal`) et corruption du mode `'set'` dans `SyncService`
- **Fichiers** : `src/components/inventory/StockAdjustmentModal.tsx:96-119`, `src/components/InventoryAuditModal.tsx`, `src/services/stockService.ts:104-114`, `src/services/SyncService.ts:273-284, 574-585`
- **Mécanisme du bug** :
  1. Hors-ligne, `StockAdjustmentModal.tsx:96` appelle d'abord `applyStockAdjustment({ productId, value: finalStock, mode: 'set' })` qui enfile un 1er ajustement dans `SyncService` avec `recordId = 'adj_...'`.
  2. Puis à la ligne 119, il appelle `await localDb.insert('stockAdjustments/' + adjId, adjustmentData)` qui enfile un **2ème ajustement** dans `SyncService` avec `recordId = adjId` (sans préfixe `adj_`). Au retour du réseau, le delta de stock est appliqué **deux fois** sur Supabase !
  3. De plus, dans `SyncService.ts:273-284` et `574-585`, la déduplication additionne les deltas (`existingDelta + newDelta`) même si `mode === 'set'`, corrompant les inventaires physiques absolus.

### 🔴 CRITIQUE P0-SYNC-05 : Écrasement des modifications locales en attente (`SyncService`) lors du chargement / Delta Sync dans `useProductsAndCoreData.ts`
- **Fichier** : `src/hooks/data-fetching/useProductsAndCoreData.ts:272-298, 907-955`
- **Mécanisme du bug** :
  1. Ni `syncProducts` ni `fetchAndCache` ne vérifient si des éléments sont en attente dans `loadPendingSyncQueue()` avant d'écraser `mergedMap` et `nexus_*_cache` avec les données serveur (`camelData`).
  2. Si l'application redémarre avec des opérations hors-ligne non encore dépiliées par `SyncService`, le fetch initial écrase l'état Zustand et IndexedDB avec les anciennes valeurs serveur.

### 🔴 CRITIQUE P0-SYNC-06 : Corruption des clés JSONB (`itemMappings`, `rolePermissions`) et perte de `roleKPIs` / `displayPriceHT` par `camelToSnakeCase`
- **Fichier** : `src/lib/db-converters.ts:32-57, 250-264`
- **Mécanisme du bug** :
  1. `camelToSnakeCase` transforme chaque lettre majuscule en `_lettre` :
     - `roleKPIs` devient `role_k_p_is` (au lieu de `role_kpis` attendu dans `TABLE_COLUMNS.settings`), ce qui **supprime et perd systématiquement `roleKPIs`** à chaque sauvegarde des paramètres !
     - `displayPriceHT` devient `display_price_h_t` (incompatible avec `display_price_ht`).
  2. `convertKeysToSnake` et `convertKeysToCamel` parcourent récursivement tous les sous-objets, altérant les clés des dictionnaires JSONB comme `invoice_patterns.itemMappings` (les désignations d'articles en majuscules sur les factures fournisseurs deviennent `_l_a_i_t...`, cassant la correspondance OCR).

### 🔴 CRITIQUE P0-SYNC-07 : Double attribution des points fidélité dans `useDeliveryActions.ts:148-163`, UPSERT partiel destructeur sur `transactions` dans `orderStockService.ts:452`, et clé d'idempotence statique dans `EditTransactionModal.tsx:90`
- **Fichiers** : `src/hooks/useDeliveryActions.ts:81-164`, `src/services/orderStockService.ts:448-456`, `src/components/EditTransactionModal.tsx:90, 116-121`
- **Mécanisme du bug** :
  1. Dans `useDeliveryActions.ts:148-163`, l'ajout de `loyaltyPoints` et `totalSpent` au client est exécuté **en dehors** du bloc `if (!order.syncedToPos)` : toute commande déjà confirmée (`syncedToPos === true`, donc déjà créditée par `destockOrder`) crédite une **2ème fois** les points et le CA client à la livraison !
  2. Dans `orderStockService.ts:452`, l'annulation hors-ligne fait `enqueueSync('transactions', txToCancel.id, 'UPSERT', { id: txToCancel.id, status: 'cancelled' })`, mais `preparePayload` ne fusionne pas le cache local pour `transactions`, envoyant un UPSERT incomplet sans `items` ni `total`.
  3. Dans `EditTransactionModal.tsx:90`, `adjustmentId = 'adj_edit_tx_' + transaction.id + '_' + productId` est statique : si une même commande est modifiée une 2ème fois, Supabase ignore le 2ème ajustement de stock (idempotence sur `p_adj_id`). De plus, si le terminal est hors-ligne, la ligne 121 (`if (txError) throw txError`) interrompt la fonction **après** avoir déjà modifié le stock local (ligne 100) mais **avant** de mettre à jour la transaction locale (ligne 133).

### 🟠 MAJEUR P1-SYNC-08 : Produits renommés `'Sans nom'` par `cleanValueForPostgres` puis bannis, décalage de date UTC+1 et colonnes manquantes dans `TABLE_COLUMNS`
- **Fichiers** : `src/lib/db-converters.ts:185, 229, 266, 404-426, 583`, `src/hooks/data-fetching/useProductsAndCoreData.ts:241`, `src/hooks/data-fetching/useAdminStaticData.ts:127`
- **Mécanisme du bug** :
  1. `cleanValueForPostgres` (`db-converters.ts:404-410`) force `name = 'Sans nom'` si `name` est absent/vide lors d'un update partiel produit non trouvé en cache mémoire. `SyncService.ts:897` le traite alors comme un produit complet, écrase son nom sur Supabase par `'Sans nom'`, puis `useProductsAndCoreData.ts:241` le filtre et le supprime !
  2. `cleanValueForPostgres` (`db-converters.ts:412-426`) tronque les colonnes `date` via `.toISOString().split('T')[0]` (UTC), reculant d'un jour toute opération saisie entre 00h00 et 01h00 en Algérie (UTC+1).
  3. `TABLE_COLUMNS.suppliers` omet `rating_quality`, `rating_delivery`, `rating_price` et force `pre_sale_days` (entier) à `[]` ; `TABLE_COLUMNS.stock_adjustments` omet `product_name` et `old_quantity` ; `TABLE_COLUMNS.supplier_syncs` omet `supplier_name`, `file_url`, `mapping`, `auto_sync`, `sync_frequency`, `error_message`.
  4. `useAdminStaticData.ts:127` appelle `fetchTableFromSupabase('patterns', ...)` non mappé vers `invoice_patterns` dans `supabaseFetchHelper.ts`.

---

## 🔒 Résultats Étape 5 : Audit de la Sécurité, Authentification, Serveur & Navigation UI

### 🔴 CRITIQUE P0-UI-01 : Collision de Hash URL (`#customers` / `#suppliers`) provoquant un crash immédiat (écran blanc) au rechargement `F5` ou en mode 2e écran
- **Fichiers** : `src/App.tsx:243, 441-478`, `src/hooks/useAppInitialization.ts:53-58`, `src/components/Sidebar.tsx:77`, `src/components/CustomerDashboard.tsx:22`
- **Mécanisme du bug** :
  1. Lorsque l'utilisateur navigue sur l'onglet **Clients** (`id: 'customers'`) ou **Fournisseurs** (`id: 'suppliers'`) du POS, `App.tsx:243` écrit `window.location.hash = 'customers'` (ou `'suppliers'`).
  2. Si l'utilisateur rafraîchit la page (`F5` / `Ctrl+R`) ou clique sur l'icône **« Ouvrir dans un 2e écran »** (`Sidebar.tsx:77`), `useAppInitialization.ts:55-56` évalue `if (hash.includes('customer')) return 'customer'` et bascule `appMode` vers le portail externe `'customer'` (ou `'supplier'`) au lieu de `'pos'` !
  3. Comme le caissier (`user`) est connecté mais que `currentCustomer` est `null`, `App.tsx:441` affiche directement `<CustomerDashboard customer={currentCustomer!} />` qui crash immédiatement à la ligne 22 (`customer.id` → `TypeError: Cannot read properties of null (reading 'id')`).

### 🔴 CRITIQUE P0-SEC-01 : Route `/api/auth/verify-password` cassée (oublie de sélectionner `password_hash`) et portails Client / Fournisseur / Caméra inopérants
- **Fichiers** : `server.ts:402-457`, `src/components/CustomerLogin.tsx:34-42`, `src/components/SupplierLogin.tsx:35-43`, `src/App.tsx:417-438`
- **Mécanisme du bug** :
  1. Dans `server.ts:404-405`, `selectColumns` sélectionne `'id, name, role, phone, email, hire_date, status, is_clocked_in'` (ou `'id, name, email, role, phone, status, is_app_user...'`) **sans inclure `password_hash`, `password` ni `pin`**. À la ligne 428, `const hash = record.password_hash || record.password || record.pin` est donc **toujours `undefined`**, renvoyant systématiquement `401 "Aucun mot de passe configuré sur ce compte"`.
  2. Même si la requête réussissait, `server.ts:457` renvoie `is_app_user` en `snake_case`, tandis que `CustomerLogin.tsx:36` et `SupplierLogin.tsx:37` vérifient `!customerData.isAppUser` (`camelCase`), rejetant 100% des connexions.
  3. Enfin, dans `App.tsx:417`, les écrans `CustomerLogin`, `SupplierLogin` et `CameraLogin` sont imbriqués dans `if (!user)` mais leur `onLogin` met à jour `currentCustomer` / `currentSupplier` / `profile` sans définir `user` : l'utilisateur reste donc bloqué indéfiniment sur l'écran de login.

### 🔴 CRITIQUE P0-SEC-02 : Verrouillage de caisse (`PinLockModal`) contournable ou bloquant la session, avec `z-index` inférieur au Header et à la Sidebar
- **Fichiers** : `src/components/AppHeader.tsx:83, 145, 471-475`, `src/components/PinLockModal.tsx:76-93, 140`, `src/components/Sidebar.tsx:207, 226`
- **Mécanisme du bug** :
  1. `AppHeader.tsx:471` n'envoie pas la prop `expectedPin` à `<PinLockModal />`. Si aucun code maître n'a été enregistré dans `nexus_pos_master_pin` (ou après une déconnexion qui appelle `clearSecureItems()` dans `security.ts:489`), `customStoredPin` est `null` et `expectedPin` est `undefined` : **aucun code PIN ne peut déverrouiller la modale** (`isValid` reste `false`).
  2. `PinLockModal.tsx:140` utilise `z-50`, alors que `AppHeader.tsx:145` est en `z-[60]` et `Sidebar.tsx:207` en `z-[70]` : le menu latéral et l'en-tête restent cliquables par-dessus l'écran de verrouillage !
  3. L'état `isPinLockOpen` est un simple `useState(false)` non persisté : un `F5` fait disparaître le verrouillage.

### 🔴 CRITIQUE P0-SEC-03 : Téléchargement client de `select('*')` sur `users` et `employees` (incluant `password_hash`) et exposition IPC SQLite brute
- **Fichiers** : `src/services/AuthService.ts:256-277`, `src/hooks/useAuthUser.tsx:148-149`, `electron/main.js:411-482`
- **Mécanisme du bug** :
  1. `AuthService.findRemoteUser` et `useAuthUser.tsx` exécutent `supabase.from('users').select('*')` et `supabase.from('employees').select('*')`, stockant tous les profils (avec `password_hash`) dans IndexedDB côté client.
  2. Dans `electron/main.js:411-428`, les handlers IPC `sqlite-execute` et `sqlite-query` autorisent l'exécution de requêtes SQL arbitraires (`SELECT`, `UPDATE`, `DELETE`, `DROP TABLE`) depuis `window.electronAPI`.
  3. Dans `electron/main.js:227-230`, le raccourci `F12` (`toggleDevTools`) est laissé actif même en production (`!isDev`).

### 🟠 MAJEUR P1-SEC-04 : Endpoints LAN `/api/customer-display` et `/api/customer-display/barcode` sans authentification + élévation `isVerifiedAdmin` via `sessionStorage`
- **Fichiers** : `server.ts:304-324, 703-721`, `src/hooks/useAuthUser.tsx:31-55`, `src/hooks/useAppPermissionsAndStats.ts:68-73`
- **Mécanisme** :
  1. Toute machine sur le réseau local peut envoyer un `POST /api/customer-display/barcode` pour injecter des articles dans le panier de la caisse ou modifier l'écran client.
  2. `getInitialOnlineSession()` charge `user` et `profile` depuis le même objet JSON dans `sessionStorage`, rendant la comparaison `user.email === profile.email` dans `useAppPermissionsAndStats.ts:69` toujours vraie si `sessionStorage` est modifié localement.

---

## ⚡ Résultats Étape 4 : Audit de la Performance & Optimisation React

### 🟠 MAJEUR P1-PERF-01 : Absence totale de pagination dans `OrdersTable.tsx` (jusqu'à 500 commandes rendues d'un bloc + `.filter()` dans `.map()`)
- **Fichiers** : `src/hooks/useOrdersLogic.ts:166`, `src/components/orders/OrdersTable.tsx:79-266` (lignes 184 et 207)
- **Impact** : Contrairement aux règles de performance du projet (50 items/page), toutes les commandes (jusqu'à 500) sont montées dans le DOM avec 3 `<select>` par ligne et 2 `.filter()` sur `employees` recalculés à chaque ligne.

### 🟠 MAJEUR P1-PERF-02 : Double exécution de `useProductStats()` sur les 11 571 produits à chaque mouvement de stock
- **Fichiers** : `src/hooks/useAppPermissionsAndStats.ts:134-169`, `src/components/MainAppContent.tsx:41`, `src/components/AppModals.tsx:108`
- **Impact** : `useProductStats()` parcourt les 11 571 produits et parse `normalizeBatches(p.batches)` + `new Date()` pour chaque lot. Comme il est appelé à la fois dans `MainAppContent` et dans `AppModals`, ce traitement lourd s'exécute **deux fois** sur le thread principal à chaque vente ou ajustement de stock.

### 🟠 MAJEUR P1-PERF-03 : Fonction `canAccess` non mémoïsée dans `useAppPermissionsAndStats.ts:63`
- **Fichiers** : `src/hooks/useAppPermissionsAndStats.ts:63-76`, `src/App.tsx:254-270`, `src/components/BottomBar.tsx:109`
- **Impact** : Recréée à chaque rendu de `App`, elle provoque le démontage/remontage du listener `hashchange` et invalide les `useMemo` de navigation à chaque re-render.

### 🟠 MAJEUR P1-PERF-04 : Polling `setInterval` toutes les 3 secondes dans `SyncStudio.tsx` avec recherches linéaires `O(N × M)`
- **Fichier** : `src/components/SyncStudio.tsx:112-114, 369-375`
- **Impact** : Re-render forcé toutes les 3 secondes même sans activité, accompagné de `.find()` linéaires sur les 11 571 produits pour chaque élément de la file.

### 🟡 MINEUR P2-UI-02 : Bouton « Vendre » (`handleLaunchSale`) dans `useCustomersLogic.ts:453` inopérant & Mode `'grouped'` absent de `InventoryProductsTab.tsx:354`
- **Fichiers** :
  - `src/hooks/useCustomersLogic.ts:453` : émet `window.dispatchEvent(new CustomEvent('change-tab', { detail: 'caisse' }))` qu'aucun composant n'écoute.
  - `src/components/inventory/InventoryProductsTab.tsx:354` : le bouton "Groupé par fournisseur" (`viewMode = 'grouped'`) affiche la vue liste standard car seule la condition `viewMode === 'grid'` est traitée.
  - `src/components/TransactionHistory.tsx:3, 14-22` : 9 composants d'inventaire et `papaparse` importés mais jamais utilisés (code mort).

---

## 🧮 Résultats Étape 3 : Audit des Bugs Métier, Calculs Financiers & Risques de Crash

### 3.1. Caisse & Encaissement (`src/hooks/useCheckoutProcess.ts` & `src/store/useCartStore.ts`)

- **🔴 CRITIQUE `BUG-CHK-01` — Contournement total du plafond de dette client (`creditLimit`) lors d'un paiement partiel en Espèces (`cash`) ou Carte (`card`)** (`src/hooks/useCheckoutProcess.ts:81-94, 113-115, 428`) :
  - Le contrôle `if (creditLimit > 0 && (currentBalance - total) < -creditLimit)` n'est exécuté **que** si `method === 'balance'` (ligne 81).
  - Or si le caissier choisit `method = 'cash'` ou `'card'` et saisit un `receivedAmount` inférieur au `total`, la différence (`unpaidShortfall`, lignes 113-115) est inscrite en dette sur le solde du client (`deltaBalance -= unpaidShortfall`, ligne 428) **sans aucun contrôle de `creditLimit`** !
  - De plus, même en `method === 'balance'`, la ligne 89 teste `currentBalance - total` au lieu de `currentBalance - unpaidShortfall`.

- **🔴 CRITIQUE `BUG-CHK-02` — Suppression de `bundleItems` dans `sanitizedCart` cassant le stock des packs (`isBundle`) lors de la modification d'un ticket** (`src/hooks/useCheckoutProcess.ts:101-105, 248-272` et `src/store/useCartStore.ts:167-178`) :
  - À la ligne 103, `const { imageUrl, imageUrls, description, bundleItems, ...rest } = item;` supprime explicitement `bundleItems` de `transaction.items`.
  - Lorsqu'un ticket est chargé pour modification (`isEditing === true`), `bundleItems` est donc `undefined` dans `oldItems` et dans `loadTransactionToCart`. La condition `if (isBundle && bundleItems)` (ligne 251) échoue et modifie le stock du pack virtuel au lieu des produits composants.

- **🔴 CRITIQUE `BUG-CHK-03` — Lots (`batches` / `useMultiExpiry`) négatifs et non synchronisés lors d'un déconditionnement automatique (`autoUnpack`)** (`src/hooks/useCheckoutProcess.ts:339-397`) :
  - Les lignes 340-354 déduisent `totalQuantity` de `updatedBatches` **avant** le calcul `autoUnpack` (ligne 357), laissant le dernier lot avec un stock négatif alors que les unités déballées du parent (`parentsNeeded * product.unitsPerParent`) ne sont jamais ajoutées aux lots.
  - En outre, aucune garde ne vérifie `product.unitsPerParent > 0` ni `parent.stock >= parentsNeeded`, et la mise à jour de `batches` utilise `localDb.updateLocalOnly` (lignes 379, 393), de sorte que les stocks par lot déduits en caisse ne sont **jamais envoyés à Supabase**.

- **🔴 CRITIQUE `BUG-CHK-05` — Corruption du solde et des points clients lors de l'édition d'une vente (`isEditing`) avec changement/retrait de client ou `keepExcessInBalance`** (`src/hooks/useCheckoutProcess.ts:409-453`) :
  - Si une vente rattachée au Client A est modifiée et attribuée au Client B (ou sans client), le compte du Client A n'est jamais contrepassé et le Client B reçoit le différentiel (`total - oldTotal`, `oldBalanceUsed - newBalanceUsed`) du Client A.
  - Si `keepExcessInBalance` est coché lors de l'édition, l'excédent `parsedReceived - total` est crédité une seconde fois sur le solde du client (ligne 426).

- **🟠 MAJEUR `BUG-CHK-04` — Absence de gestion de `autoUnpack` et des lots `batches` lors de l'édition d'une vente (`isEditing`)** (`src/hooks/useCheckoutProcess.ts:273-288`).

### 3.2. Retours Clients & Remboursements (`src/hooks/useReturnModalLogic.ts`)

- **🔴 CRITIQUE `BUG-RET-01` — `totalRefund` rembourse le prix unitaire brut sans tenir compte des remises, promotions, points fidélité ou avoirs appliqués lors de la vente** (`src/hooks/useReturnModalLogic.ts:64, 92, 118, 199`) :
  - `const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.returnQuantity), 0);` rembourse davantage que le montant réellement encaissé si le ticket comportait une remise ligne, `discountAmount`, `pointsDiscount` ou `voucherDiscount`.

- **🔴 CRITIQUE `BUG-RET-02` — Retour d'une vente à crédit (`paymentMethod === 'balance'` ou `balanceUsed > 0`) : la dette du client n'est jamais réduite ET une sortie d'espèces (`expenses`) est créée** (`src/hooks/useReturnModalLogic.ts:173-183, 194-206`) :
  - Les lignes 177-181 mettent à jour `loyaltyPoints` et `totalSpent` via un `localDb.insert` absolu (sans passer par `enqueueCustomerBalanceAdjustment` ni mettre à jour `customer.balance` ni `usePeopleStore`).
  - Pire : la ligne 203 (`paymentMethod: transaction.paymentMethod === 'card' ? 'card' : 'cash'`) crée une dépense de remboursement en **espèces (`cash`)** pour une vente qui avait été passée en dette (`balance`) !

- **🟠 MAJEUR `BUG-RET-03` — Calcul erroné de `alreadyReturned` en cas de lignes multiples d'un même article et non-réintégration des lots `batches`** (`src/hooks/useReturnModalLogic.ts:37-56, 159-170`).

### 3.3. Achats Fournisseurs & Réceptions (`purchaseDbOperations.ts`, `useSmartPurchaseLogic.ts`, `useGRNLogic.ts`)

- **🔴 CRITIQUE `BUG-PUR-01` — Perte totale de la dette fournisseur lorsque le fournisseur est auto-créé lors de la confirmation d'achat** (`src/components/smart-purchase/useSmartPurchaseLogic.ts:378-423` & `purchaseDbOperations.ts:190`) :
  - `useSmartPurchaseLogic.ts` crée `autoSupplier` dans `localDb`, puis appelle immédiatement `savePurchaseDb` avec l'ancien tableau `suppliers` issu des props React (qui ne contient pas encore `autoSupplier`). `suppliers.find(s => s.id === selectedSupplierId)` retourne `undefined` et la dette du fournisseur n'est jamais enregistrée.

- **🔴 CRITIQUE `BUG-PUR-02` — Corruption de la dette fournisseur lors de la modification d'un bon d'achat avec changement de fournisseur, et non-rafraîchissement de `usePeopleStore`** (`src/components/smart-purchase/purchaseDbOperations.ts:176-197, 385`) :
  - `oldDebt` n'est jamais soustraite de `oldPurchase.supplierId` si le fournisseur a été changé, et `usePeopleStore.getState().setSuppliers` n'est pas appelé dans `savePurchaseDb` ni dans `handleSupplierPaymentDb`.

- **🔴 CRITIQUE `BUG-PUR-03` — Désynchronisation du stock Supabase quand un achat `'completed'` est repassé en `'draft'` ou `'ordered'`** (`src/components/smart-purchase/purchaseDbOperations.ts:200-213, 274-276`) :
  - La ligne 274 (`if (purchaseStatus === 'completed' && delta !== 0)`) bloque l'appel à `enqueueStockAdjustment(productId, delta)` lorsque le nouveau statut n'est plus `'completed'`, alors que le stock local a bien été réduit.

- **🔴 CRITIQUE `BUG-PUR-04` — `handleReceiveOrderDb` n'incrémente JAMAIS la dette du fournisseur (`supplier.balance`) et peut crasher sur `for (const item of order.items)`** (`src/components/smart-purchase/purchaseDbOperations.ts:409-519`, ligne 456) :
  - Crée un achat impayé (`paymentStatus: 'unpaid', paidAmount: 0`) sans ajouter `order.total` au solde du fournisseur (et si l'achat est ensuite supprimé via `handleDeletePurchaseDb`, `order.total` est soustrait du solde fournisseur !).
  - La ligne 456 itère directement sur `order.items` sans `safeGetItems(order)`.

- **🔴 CRITIQUE `BUG-GRN-01` — `useGRNLogic.ts` : absence de verrou `if (isProcessing) return;` dans `handleCreate` (double ajout de stock sur double F9/F10) et dette fournisseur jamais mise à jour** (`src/hooks/useGRNLogic.ts:161-168, 252-269`).

- **🟠 MAJEUR `BUG-PUR-05` — `purchaseHelpers.ts:194` (`items.map` sans garde `Array.isArray`), `useSmartPurchaseLogic.ts:399` (total imprimé sans remises/TVA), et `handleDeletePurchaseDb:599` (`Math.max(0)` local vs delta complet Supabase)**.

### 3.4. Clients, Fournisseurs, Commandes & Stores Zustand

- **🔴 CRITIQUE `BUG-CUS-01` — Double comptabilisation du bénéfice via l'injection d'une dépense négative (`amount: -change`) lors d'un versement client (`handleTopUp`) + crash `customers.length`** (`src/hooks/useCustomersLogic.ts:150, 233, 256-264`) :
  - Lorsqu'un client règle sa dette (`financialOpType === 'encaissement'`), une dépense de montant **négatif** (`-amount`) est créée dans `expenses`, ce qui diminue le total des dépenses et gonfle artificiellement le bénéfice net d'une vente à crédit déjà comptabilisée dans le chiffre d'affaires.

- **🔴 CRITIQUE `BUG-SUP-01` — Paiements fournisseurs (`useSupplierPayments.ts`) jamais enregistrés dans `localDb` et écrasement du solde fournisseur en cas de 2 paiements consécutifs** (`src/hooks/suppliers/useSupplierPayments.ts:69-105, 150-176`) :
  - `localDb.insert('supplierPayments/...')` n'est jamais appelé, et `currentBalance` est lu depuis l'état local figé `viewingDetailsSupplier.balance` qui n'est jamais mis à jour après le 1er paiement.

- **🔴 CRITIQUE `BUG-ORD-01` — `saveOrderItems` (`useOrdersLogic.ts:415-467`) modifie les articles d'une commande confirmée sans ajuster le stock ni la `Transaction` POS, faussant `restockOrder` en cas d'annulation + fuite `isSyncing` (ligne 621)**.

- **🔴 CRITIQUE `BUG-STR-01` — Impossibilité de supprimer ou purger une transaction dans `useTransactionStore.ts:28-52`** :
  - `setTransactions` fusionne systématiquement `[...(state.transactions || []), ...incoming]`, réinjectant toute transaction supprimée par `.filter()`.

- **🟠 MAJEUR `BUG-STR-03` — Crashs potentiels `.includes()` sur `listIds` et `.toLowerCase()` sur `name` + upserts partiels sans `name` dans `useShortageStore.ts:155, 237, 319-421, 508, 534, 603, 681, 696`**.

- **🟠 MAJEUR `BUG-INV-01` & `BUG-INV-02` — `useInventoryActions.ts:65-68, 140-161, 195`** :
  - `handleAutoResolveAll` ne passe pas `stock: totalStock` à `localDb.update`.
  - `handleBulkUpdate` et `handleBulkDelete` accèdent à `user.uid` sans `user?.uid` (crash hors-ligne) et `handleBulkUpdate` ne rafraîchit pas `useCoreStore`.

---

## 🛠️ Résultats Étape 6 : Plan d'Action & Liste de Tâches Anti-Coupure (Priorisée P0 / P1 / P2)

> **Instructions de reprise en cas de coupure réseau ou limite de tokens** : Cocher `[x]` chaque tâche au fur et à mesure de sa résolution.

### 🚨 PRIORITÉ P0 — BLOQUANTS CRITIQUES (Synchronisation, Intégrité Financière, Sécurité & Crashs)

- [x] **Tâche P0-01 (`P0-SYNC-01` & `P0-SYNC-02`) — Sécuriser `supabaseFetchHelper.ts` et `useProductsAndCoreData.ts` contre les timeouts et les réponses partielles** :
  - Dans `src/hooks/data-fetching/supabaseFetchHelper.ts:60-119`, si une page échoue lors de la boucle `while (hasMore)`, retourner `null` (ou un flag `isPartial = true`) et **ne jamais déclencher la suppression des orphelins** sur un catalogue incomplet.
  - Dans `src/hooks/data-fetching/useProductsAndCoreData.ts:317-325`, remplacer `localDb.delete('products/' + localId)` par `localDb.deleteLocalOnly` ET exclure tout ID présent dans `loadPendingSyncQueue()`.
  - Dans `src/hooks/data-fetching/supabaseFetchHelper.ts:261-333`, retourner `null` (et non `[]`) lorsqu'une erreur ou un timeout survient à la 1ère page, afin de ne jamais écraser les caches IndexedDB locaux par `[]`.

- [x] **Tâche P0-02 (`P0-SYNC-03` & `P0-SYNC-04`) — Éliminer la Race Condition In-Flight et le double comptage dans `SyncService.ts` et `StockAdjustmentModal.tsx`** :
  - Dans `src/services/SyncService.ts`, associer un identifiant d'opération unique (`opId` / `snapshotDelta`) à chaque élément capturé au début de `processSyncQueue()`, et dans le bloc `finally` (ligne 1228), soustraire uniquement le delta effectivement envoyé au lieu de supprimer aveuglément toute entrée partageant la clé `${table}:${recordId}`.
  - Gérer proprement `mode === 'set'` dans la déduplication de `SyncService.ts:273-284, 574-585` (ne pas additionner un delta à un mode `'set'`).
  - Dans `src/components/inventory/StockAdjustmentModal.tsx:96-119` (et `InventoryAuditModal.tsx`), utiliser `localDb.insertLocalOnly` pour l'historique local puisque `applyStockAdjustment` enfile et synchronise déjà l'ajustement sur Supabase.

- [x] **Tâche P0-03 (`P0-SYNC-05` & `P0-SYNC-06`) — Protéger les modifications en attente lors du Fetch initial et corriger `db-converters.ts`** :
  - Dans `src/hooks/data-fetching/useProductsAndCoreData.ts:272-298, 907-955`, préserver les enregistrements ayant des opérations en attente dans `loadPendingSyncQueue()`.
  - Dans `src/lib/db-converters.ts:32-57`, ajouter les mappings explicites `roleKPIs <-> role_kpis` et `displayPriceHT <-> display_price_ht`, et ne **pas** convertir récursivement les clés des dictionnaires JSONB (`itemMappings`, `rolePermissions`, `roleKPIs`, `metadata`).
  - Dans `src/lib/db-converters.ts:345-391`, étendre la fusion du cache local dans `preparePayload` aux tables `transactions`, `shortage_items` et `online_orders`, et ne jamais injecter `name: 'Sans nom'` sur un update partiel de produit.

- [x] **Tâche P0-04 (`P0-UI-01`, `P0-SEC-01`, `P0-SEC-02`) — Corriger le crash `#customers`/`#suppliers`, l'authentification `/api/auth/verify-password` et `PinLockModal`** :
  - Dans `src/hooks/useAppInitialization.ts:53-58` et `src/App.tsx:417-478`, distinguer les hashes d'onglets POS (`#customers`, `#suppliers`) des portails externes (`#portal-customer`, `#portal-supplier`, `#portal-camera`) et sécuriser le rendu de `<CustomerDashboard />` / `<SupplierDashboard />` si `currentCustomer` / `currentSupplier` est `null`.
  - Dans `server.ts:404-405`, inclure `password_hash, pin` dans `selectColumns` pour la vérification `bcrypt.compare` avant de les supprimer de la réponse JSON, et gérer `is_app_user` / `isAppUser` dans `CustomerLogin.tsx` et `SupplierLogin.tsx`.
  - Dans `src/components/AppHeader.tsx:471` et `src/components/PinLockModal.tsx:76-93, 140`, passer `expectedPin`, persister l'état de verrouillage et appliquer `z-[9999]`.

- [x] **Tâche P0-05 (`BUG-CHK-01` à `BUG-CHK-05`) — Fiabiliser l'encaissement, les packs `isBundle`, le déconditionnement `autoUnpack` et l'édition de vente (`useCheckoutProcess.ts`)** :
  - Vérifier `creditLimit` sur `unpaidShortfall` quel que soit le mode de paiement (`cash`, `card`, `balance`).
  - Conserver `bundleItems` dans `sanitizedCart` (ou réhydrater depuis `products` dans `loadTransactionToCart` et `useCheckoutProcess.ts`).
  - Lors d'un `autoUnpack`, injecter les unités déballées dans `updatedBatches` avant déduction, vérifier `parent.stock >= parentsNeeded`, et synchroniser `batches` vers Supabase.
  - Lors de l'édition d'une vente (`isEditing`), contrepasser l'ancien client si le client a changé, et ne pas recréditer une 2ème fois `keepExcessInBalance`.

- [x] **Tâche P0-06 (`BUG-RET-01` & `BUG-RET-02`) — Corriger les calculs de remboursement et de dette client lors des retours (`useReturnModalLogic.ts`)** :
  - Proratiser `totalRefund` en tenant compte des remises ligne/globales du ticket original.
  - Si la vente initiale comportait une dette (`balanceUsed > 0` ou `paymentMethod === 'balance'`), réduire d'abord la dette du client via `enqueueCustomerBalanceAdjustment` et n'enregistrer une dépense espèces (`expenses`) que pour la part réellement remboursée en espèces.

- [x] **Tâche P0-07 (`BUG-PUR-01` à `BUG-PUR-04` & `BUG-GRN-01`) — Corriger la gestion des dettes fournisseurs et du stock dans les Achats & GRN (`purchaseDbOperations.ts`, `useSmartPurchaseLogic.ts`, `useGRNLogic.ts`)** :
  - Mettre à jour le solde du fournisseur (`supplier.balance`) lors d'une auto-création de fournisseur, d'un changement de fournisseur à l'édition, d'une réception de commande (`handleReceiveOrderDb`), et d'un GRN (`useGRNLogic.ts`), ainsi que `usePeopleStore`.
  - Dans `purchaseDbOperations.ts:274`, envoyer `enqueueStockAdjustment(productId, delta)` dès que `delta !== 0` (même si le nouveau statut repasse en `draft` ou `ordered`).
  - Dans `purchaseDbOperations.ts:456`, utiliser `safeGetItems(order)` au lieu de `order.items`.
  - Dans `useGRNLogic.ts:161`, ajouter `if (isProcessing) return;` au début de `handleCreate`.

- [x] **Tâche P0-08 (`BUG-CUS-01`, `BUG-SUP-01`, `BUG-ORD-01`, `BUG-STR-01`) — Corriger les versements clients, paiements fournisseurs, commandes modifiées et suppression dans `useTransactionStore`** :
  - Dans `src/hooks/useCustomersLogic.ts:256-264`, ne pas injecter de dépense négative (`amount: -change`) dans `expenses` lors d'un encaissement de dette client, et protéger `(customers || []).length` (ligne 150).
  - Dans `src/hooks/suppliers/useSupplierPayments.ts:69-105`, persister les paiements dans `localDb.insert('supplierPayments/...')` et mettre à jour `viewingDetailsSupplier`.
  - Dans `src/hooks/useOrdersLogic.ts:415-467` et `src/hooks/useDeliveryActions.ts:148`, synchroniser le différentiel de stock lors de la modification d'une commande et placer l'attribution des points fidélité dans `if (!order.syncedToPos)`.
  - Dans `src/store/useTransactionStore.ts:28-52`, permettre à `setTransactions` de remplacer/filtrer la liste lorsqu'une fonction `prev => ...` est passée, au lieu de toujours ré-unifier avec l'ancien `state.transactions`.

---

### 🟠 PRIORITÉ P1 — MAJEURS (Performance, Sécurité Durcie & Robustesse UI)

- [x] **Tâche P1-01 (`P0-SEC-03` & `P1-SEC-04`) — Durcissement Sécurité Client, Serveur LAN & Electron** :
  - Ne plus exposer `password_hash` via `select('*')` côté client (`AuthService.ts`, `useAuthUser.tsx`), restreindre les RPC `is_admin()`/`is_staff()` sur Supabase, désactiver `F12` en production dans `electron/main.js:227`, et protéger `/api/customer-display*`.
- [x] **Tâche P1-02 (`P1-PERF-01` à `P1-PERF-04`) — Optimisations Performance React & Mémoire** :
  - Paginer `OrdersTable.tsx` (50 commandes/page) et sortir `.filter()` sur `employees` de la boucle `.map()`.
  - Appeler `useProductStats()` une seule fois au lieu de deux (`MainAppContent.tsx` + `AppModals.tsx`).
  - Mémoïser `canAccess` avec `useCallback` dans `useAppPermissionsAndStats.ts:63`.
  - Supprimer le polling `setInterval(3000)` redondant et indexer par `Map` dans `SyncStudio.tsx`.
- [x] **Tâche P1-03 (`BUG-STR-03`, `BUG-INV-01`, `BUG-INV-02`, `BUG-SUP-02`) — Gardes anti-crash (`listIds`, `name`, `user?.uid`, `purchases.filter`)** :
  - Sécuriser tous les accès `.includes()` et `.toLowerCase()` dans `useShortageStore.ts`, `user?.uid` dans `useInventoryActions.ts:156, 195`, et `(purchases || []).filter` dans `useSuppliersLogic.ts:262`.

---

### 🟡 PRIORITÉ P2 — MINEURS (Finitions UI & Nettoyage)

- [x] **Tâche P2-01 (`P2-UI-02`) — Corriger le bouton « Vendre » fiche client (`useCustomersLogic.ts:453`), la vue groupée (`InventoryProductsTab.tsx:354`), et nettoyer les imports morts (`TransactionHistory.tsx:14-22`)**.
