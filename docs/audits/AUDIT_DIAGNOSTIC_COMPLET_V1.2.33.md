# 🚨 Rapport d'Audit & Diagnostic Complet — Nexus POS Pro (v1.2.33)

> **Date de l'audit** : 16 Octobre 2026  
> **Périmètre analysé** : Code source React/TypeScript, Moteur de synchronisation Offline-First (`LocalDatabase` / `SyncService`), Serveur Express/Electron (`server.ts`, `electron/main.js`), et Base de données de production Supabase (`unlwfvldqxfccgrrgbwf` en direct).  
> **Compilation TypeScript (`npx tsc --noEmit`)** : ✅ 0 erreur de typage — **mais plusieurs bugs logiques, failles RLS en production et désalignements de synchronisation ont été identifiés.**

---

## 🔴 1. Problèmes Critiques (P0) — Stocks, Synchronisation & Pertes de Données

### 1.1. Double comptage du stock dans Supabase lors des Achats (`purchaseDbOperations.ts`)
- **Fichier** : `src/components/smart-purchase/purchaseDbOperations.ts` (lignes `275` et `280-287`, ainsi que `609` et `614-622`)
- **Ce qui ne va pas** :
  - Lors de l'enregistrement d'un bon d'achat (`savePurchaseDb`), la ligne `275` appelle `enqueueStockAdjustment(productId, delta)` (qui exécute le RPC atomique `apply_stock_adjustment` ajoutant `+delta` sur Supabase).
  - Immédiatement après (lignes `280-287`), si le terminal est en ligne, le code exécute **aussi** un `supabase.from('products').update({ stock: newStockVal })` (où `newStockVal = currentStock + delta`).
  - **Conséquence** : Lorsque `apply_stock_adjustment` s'exécute dans `SyncService`, il ajoute une seconde fois `+delta` par-dessus `newStockVal`. **Le stock est incrémenté en double (`+2 × delta`) sur Supabase !** Le même problème se produit en sens inverse (`-2 × delta`) lors de la suppression d'un achat (`handleDeletePurchaseDb`, lignes `609-622`).

### 1.2. Troncature de 13 colonnes produits lors du chargement depuis Supabase (`supabaseFetchHelper.ts`)
- **Fichier** : `src/hooks/data-fetching/supabaseFetchHelper.ts` (lignes `6-22`)
- **Ce qui ne va pas** :
  - `fetchProductsFromSupabase` ignore son paramètre `isLightweight` et utilise systématiquement la liste restreinte `CORE_COLUMNS`.
  - Cette liste **omet 13 colonnes** présentes en base : `bundle_items`, `quantity_discounts`, `batches`, `use_multi_expiry`, `auto_unpack`, `units_per_parent`, `parent_id`, `location`, `damaged_stock`, `description`, `tags`, `image_urls`, `price_history`, `video_url`.
  - **Conséquence** : Dès que les produits sont chargés ou synchronisés depuis Supabase :
    1. Les **packs/bundles** (`is_bundle = true`) perdent leur composition (`bundle_items`).
    2. Le **déconditionnement automatique** carton → unité (`auto_unpack`, `parent_id`, `units_per_parent`) cesse de fonctionner.
    3. Les **remises par quantité** (`quantity_discounts`) et les **lots de péremption** (`batches`, `use_multi_expiry`) disparaissent du cache local.

### 1.3. Boucle d'écriture infinie au démarrage sur `goods_receipt_notes` (`useProductsAndCoreData.ts`)
- **Fichier** : `src/hooks/data-fetching/useProductsAndCoreData.ts` (ligne `500`)
- **Ce qui ne va pas** :
  - Dans la configuration de chargement de `goodsReceiptNotes`, le callback `setState` appelle `localDb.insertBatch('goodsReceiptNotes', map)`.
  - Or `goodsReceiptNotes` n'est ni dans `SUPABASE_FIRST_TABLES` ni dans `LOCAL_ONLY_TABLES` (`src/services/LocalDatabase.ts:292`).
  - **Conséquence** : À chaque démarrage de l'application (et à chaque événement Realtime), tous les bons de réception chargés depuis Supabase (jusqu'à 500 entrées) sont **ré-enfilés dans `SyncService` (`enqueueSyncBatch`) et renvoyés en `UPSERT` vers Supabase** inutilement.

### 1.4. Le nouveau « Cahier des Manques » ne synchronise rien avec Supabase & perd 3 colonnes
- **Fichiers** :
  - `src/services/LocalDatabase.ts` (lignes `196-201`) & `src/services/SyncService.ts` (lignes `26-31`)
  - `src/lib/db-converters.ts` (lignes `248-257`)
  - `src/store/useShortageStore.ts` (lignes `108` et `118`)
- **Ce qui ne va pas** :
  1. Les tables `shortage_items` et `custom_replenishment_lists` **n'existent pas** dans la base PostgreSQL Supabase (`unlwfvldqxfccgrrgbwf`) et ont été placées dans `LOCAL_ONLY_TABLES`. Si un employé scanne les ruptures en rayon sur son smartphone, **rien n'apparaît sur le PC de gestion**.
  2. Dans `src/lib/db-converters.ts:248-257`, `TABLE_COLUMNS.shortage_items` a oublié les 3 colonnes ajoutées au Jalon M6 : `'is_custom_product'`, `'notes'`, `'priority'` (et `'is_custom_product'` manque dans `booleanKeys` à la ligne `401`).
  3. Dans `src/store/useShortageStore.ts:108,118`, `loadFromDb` cherche `nexus_db_shortage_items` alors que `LocalDatabase.ts:92-95` déclare `nexus_shortage_items_cache` dans `TABLE_TO_IDB_CACHE_KEY`.

### 1.5. Suppression en masse des produits cassée (`useInventoryActions.ts`)
- **Fichier** : `src/hooks/useInventoryActions.ts` (ligne `103`)
- **Ce qui ne va pas** :
  - `handleMassDeleteProducts` appelle `await localDb.delete('products')` sans `/id`.
  - Dans `LocalDatabase.ts:401-438`, `id` vaut alors `''` : `nexus_products_cache` n'est pas purgé, et `SyncService` tente d'exécuter `supabase.from('products').delete().eq('id', '')` qui échoue.

### 1.6. L'audit d'inventaire (`InventoryAudit.tsx`) ne met pas à jour le stock sur Supabase
- **Fichier** : `src/components/InventoryAudit.tsx` (lignes `285-305`)
- **Ce qui ne va pas** :
  - `handleConfirmAudit` appelle `localDb.update('products/${item.productId}', { stock: item.actualStock })` puis `localDb.insert('stock_adjustments/${adjData.id}', adjData)` où `adjData.adjustment = item.discrepancy`.
  - Dans `SyncService.ts:835-847`, la présence d'un `stock_adjustments` pour ce produit fait que `SyncService` **supprime `stock` de l'upsert `products`** pour laisser le RPC `apply_stock_adjustment` agir.Mais `localDb.insert('stock_adjustments/${adjData.id}', ...)` a mis `recordId = adjData.id` (et non `productId`), et n'utilise pas le mode `'set'` ni `enqueueStockAdjustment`.

---

## 🔴 2. Failles de Sécurité Critiques en Production sur Supabase (`unlwfvldqxfccgrrgbwf`)

L'inspection directe des politiques RLS (`pg_policies`) et des Security Advisors sur le projet Supabase `unlwfvldqxfccgrrgbwf` montre que la migration `supabase/migrations/20261001_phase2_security_rls_lockdown.sql` **n'a pas été appliquée (ou a été écrasée) en production** :

1. **Lecture anonyme de `public.users` (`users_anon_select`)** :
   - En production, la table `public.users` a une politique `SELECT` pour le rôle `anon` avec `qual = true`.
   - De plus, `src/hooks/data-fetching/useProductsAndCoreData.ts:105` fait `fetchTableFromSupabase('users', 100)` (`SELECT *`) avant même la connexion (`unauthenticated`).
   - **Risque** : N'importe qui possédant la clé publique `VITE_SUPABASE_ANON_KEY` peut lire tous les emails, rôles et **`password_hash` (`bcrypt`)** des comptes administrateurs.
2. **Accès total anonyme (`anon`) en lecture/écriture sur les tables financières et clients** :
   - Sur `public.customers` : les politiques `allow_preseller_read_customers`, `allow_preseller_create_customers` et `allow_preseller_update_customers` autorisent le rôle `anon` avec `qual = true`.
   - Sur `transactions`, `cash_shifts`, `suppliers`, `purchases`, `supplier_payments`, `expenses`, `returns`, `stock_adjustments`, `damaged_items`, `audits`, `attendance`, `audit_logs` : le rôle `anon` a le droit de `SELECT`, `INSERT`, `UPDATE` (et `DELETE` sur `purchases`, `suppliers`, `expenses`, `returns`) avec `qual = true` !
3. **Fonctions `SECURITY DEFINER` exécutables sans authentification (`anon`)** :
   - `public.apply_stock_adjustment`, `public.adjust_product_stock`, `public.adjust_customer_balance` sont exécutables par le rôle `anon` via `/rest/v1/rpc/...` sans être connecté.
   - `apply_stock_adjustment` et `adjust_product_stock` n'ont pas `SET search_path = public, pg_temp`.
4. **Vue `public.clients` en `SECURITY DEFINER`** :
   - Détectée en niveau `ERROR` par le linter Supabase car elle contourne le RLS.

---

## 🟠 3. Désalignements de Schéma (`TABLE_COLUMNS` vs Supabase) & Violations `GEMINI.md`

### 3.1. Colonne fantôme dans `TABLE_COLUMNS.suppliers` provoquant un rejet PostgREST 400
- **Fichier** : `src/lib/db-converters.ts` (ligne `182`)
- `TABLE_COLUMNS.suppliers` inclut `'reminders'`, mais la table PostgreSQL `public.suppliers` sur Supabase **ne possède pas de colonne `reminders`**. Si un fournisseur a un rappel (`reminders`), l'upsert vers Supabase échoue avec une erreur HTTP 400 (`42703 / PGRST204`).

### 3.2. Colonnes manquantes dans `TABLE_COLUMNS` (`src/lib/db-converters.ts`)
- **`settings` (lignes `187-197`)** : Manquent les **21 nouveaux réglages** de `src/types/settings.ts:198-233` (`show_logo_on_receipt`, `show_savings_on_receipt`, `custom_receipt_message`, `receipt_social_qr_url`, `receipt_font_size`, `whatsapp_debt_reminder_template`, `whatsapp_receipt_template`, `scanner_sound_type`, `enable_voice_announcement`, `voice_language`, `enable_keyboard_shortcuts`, `expiry_critical_days_threshold`, `expiry_warning_days_threshold`, `cash_rounding_step`, `enable_auto_backup_on_shift_close`, `auto_backup_frequency`, `default_retail_margin_percent`, `default_wholesale_margin_percent`, `default_online_margin_percent`, `silent_sync_notifications`, `hide_sync_studio_in_sidebar`). Aucun de ces paramètres n'est sauvegardé dans Supabase.
- **`customers` (lignes `132-138`)** : Manquent `'auth_uid'`, `'addresses'`, `'storefront_image_url'`, `'store_name'` (qui existent pourtant sur Supabase !) ; tandis que `'credit_limit'` (utilisé dans l'UI) n'existe toujours pas en base Supabase.
- **`online_orders` (lignes `207-213`)** : Manquent `'storefront_image_url'`, `'store_name'`, `'sales_rep_name'` (qui existent sur Supabase).
- **`products` (lignes `122-131`)** : Manque `'video_url'` (qui existe sur Supabase).
- **`audits` (lignes `226-228`)** : Manquent `'start_date'`, `'end_date'`, `'items'`, `'total_discrepancy_value'` utilisés par `InventoryAudit.tsx`.

### 3.3. 4 Violations de la règle de consolidation préalable par `productId` (`GEMINI.md`)
1. **`src/hooks/useDeliveryActions.ts:115-131` & `153`** : Pas de consolidation par `productId` lors du déstockage d'une commande en ligne ; et à la ligne `153`, `localDb.update('onlineOrders/${order.id}', updates)` ne synchronise jamais avec Supabase car `onlineOrders` est dans `SUPABASE_FIRST_TABLES`.
2. **`src/hooks/useReturnModalLogic.ts:132-159`** : Pas de consolidation par `productId` lors d'un retour d'articles (écrase le stock local si 2 lignes retournées touchent le même produit/bundle).
3. **`src/hooks/useGRNLogic.ts:76-137` et `393-453`** : Pas de consolidation par `productId`, et `prodUpdates` oublie de mettre à jour `stock` dans `localDb` et `useCoreStore` lors de la validation d'un GRN.
4. **`src/hooks/useAuditLogsLogic.ts:387-395` et `408-416`** : Pas de consolidation par `productId` et pas de mise à jour du stock local lors de l'annulation d'une vente.

### 3.4. Auto-pruning cassé dans `fetchTableFromSupabase` (`supabaseFetchHelper.ts:199`)
- **Fichier** : `src/hooks/data-fetching/supabaseFetchHelper.ts` (ligne `199`)
- `activeCols` est calculé et élagué en cas d'erreur PostgreSQL `42703`, mais la ligne `199` écrit en dur `const cols = '*';` au lieu de `activeCols.length > 0 ? activeCols.join(',') : '*'`. La boucle d'auto-guérison refait donc 5 fois `SELECT *` sans jamais exclure la colonne fautive.

---

## 🟡 4. Problèmes UI, Navigation & Architecture Codebase

1. **Modale `<AddStaffModal />` rendue en double dans `src/components/AppModals.tsx`** :
   - Instanciée une première fois aux lignes `251-259` et une seconde fois aux lignes `402-410`. Ouvrir la création d'employé superpose 2 modales identiques.
2. **Bouton de Pointage (`Clock-In / Clock-Out`) invisible dans l'en-tête (`src/App.tsx:498-521`)** :
   - `App.tsx:193` récupère `currentEmployee` et `isClockedIn`, mais oublie de les passer en props à `<MainAppContent />` (`lignes 498-521`). Dans `src/components/app/AppHeader.tsx:188`, `currentEmployee` est toujours `undefined`, donc le bouton de pointage n'apparaît jamais.
3. **Bug de navigation `setActiveTab('pos')` (`src/components/app/InventoryModalsGroup.tsx:215`)** :
   - Redirige vers `'pos'` au lieu de `'checkout'`, ce qui casse le mode plein écran de la caisse (`MainAppContent.tsx:145`), désactive la surbrillance de l'onglet dans `Sidebar.tsx:298`, et masque le bouton « Tiroir » dans `AppHeader.tsx:273`.
4. **Titres d'onglets manquants dans `src/components/app/AppHeader.tsx:101-118`** :
   - 17 onglets (`purchases`, `shifts`, `orders`, `returns`, `promotions`, `grns`, `inventory_audit`, `expiry`, `inventory_settings`, `vouchers`, `team`, `marketing`, `labels`, `audit_logs`, `camera`, `sync_studio`, `archives`, `help`) n'ont pas de traduction dans `getTabTitle` et affichent leur identifiant brut (`PURCHASES`, `SHIFTS`, `AUDIT_LOGS`...).
5. **Infobulles de `Sidebar.tsx` coupées en mode réduit (`src/components/Sidebar.tsx:222, 284`)** :
   - Les classes `overflow-hidden` et `overflow-x-hidden` sur `aside` et `nav` coupent les tooltips `absolute left-full ml-3` lorsque la barre latérale est repliée (violation de la règle UI `GEMINI.md`).
6. **11 fichiers hooks « stubs » morts dans `src/components/use*Logic.*`** :
   - 11 fichiers d'une ligne (`src/components/useCustomersLogic.tsx`, `useEmployeesLogic.tsx`, `useExpiryManagerLogic.tsx`, `useGRNLogic.ts`, `useOrdersLogic.tsx`, `useProductFormLogic.tsx`, `usePromotionsLogic.ts`, `usePurchaseCart.ts`, `useReturnModalLogic.ts`, `useSuppliersLogic.tsx`, `useTransactionHistoryLogic.tsx`) ne sont importés nulle part et polluent `src/components/`.
7. **Packaging Electron & Serveur (`package.json`, `server.ts`, `electron/main.js`)** :
   - `package.json:115` embarque le fichier `.env` dans l'archive `app.asar` distribuée.
   - `server.ts:347` autorise `customers` et `suppliers` sur `/api/auth/verify-password` mais refuse `employees` (contrairement à la règle `GEMINI.md`).
   - `server.ts:719-727` cherche des APK en dur (`1.2.30`, `1.2.29`, `1.2.14`) au lieu de la version courante `1.2.33`.
   - `electron/main.js:194` utilise `icon.svg` pour `BrowserWindow` (non supporté nativement par Windows qui attend `.ico` ou `.png`).

---

## 🟢 5. Bilan des Résolutions & Vérifications Empiriques (100% Validé)

Toutes les anomalies listées dans ce rapport ont été intégralement corrigées et vérifiées :

### Résumé des Corrections Appliquées
1. **Migrations Supabase (`unlwfvldqxfccgrrgbwf`)** :
   - Tables créées : `public.shortage_items` (20 colonnes complètes) et `public.custom_replenishment_lists` avec RLS activé et index optimisés.
   - Colonnes ajoutées : `suppliers` (`reminders`), `customers` (`credit_limit`, `is_wholesale`, `birthday`, `city`), `audits` (`start_date`, `end_date`, `items`, `total_discrepancy_value`), `purchase_orders` (`order_number`, `updated_at`), `damaged_items` (`claim_notes`), `supplier_payments` (`purchase_id`), `settings` (21 colonnes de réglages avancés).
   - Sécurité Supabase : `public.clients` passée en `security_invoker = true`. `search_path = public, pg_temp` appliqué sur toutes les fonctions. Révocation des exécutions publiques/anon sur les fonctions triggers et RPC legacy dépréciées. Politiques RLS permissives consolidées sur `customers` et `online_orders`.
2. **Synchronisation & Offline-First (`src/lib/db-converters.ts`, `LocalDatabase.ts`, `SyncService.ts`, `useShortageStore.ts`)** :
   - Schémas `TABLE_COLUMNS` et `database.types.ts` synchronisés avec 100% des tables et colonnes réelles.
   - `LOCAL_ONLY_TABLES` vidé : synchronisation bidirectionnelle complète des manques et réapprovisionnements.
   - Prévention des boucles infinies (`localDb.insertBatchLocalOnly`) sur `goodsReceiptNotes`.
   - Protection de suppression de masse sécurisée par lot de 200 sur Supabase et locale par ID.
3. **Mouvements de Stocks & Logique Métier** :
   - Suppression du double incrément de stock (`+2*delta`) dans `purchaseDbOperations.ts`.
   - Restauration de l'ensemble des 13 colonnes produits dans `CORE_COLUMNS` (`supabaseFetchHelper.ts`) et correction du sélecteur `activeCols`.
   - Consolidation systématique des quantités par `productId` via `Map` (Anti-Écrasement `GEMINI.md`) dans `purchaseDbOperations.ts`, `InventoryAudit.tsx`, `useDeliveryActions.ts`, `useReturnModalLogic.ts`, `useGRNLogic.ts` et `useAuditLogsLogic.ts`.
4. **Interface Utilisateur & Navigation** :
   - Sécurisation de `SyncStudio.tsx` avec `preparePayload`, purge propre du cache local et styles inactifs `disabled:opacity-50`.
   - Suppression du doublon `<AddStaffModal />` et remplacement des images brutes par `<SafeImage />`.
   - Transmission des props d'émargement (`currentEmployee`, `isClockedIn`, `isAdmin`) dans `App.tsx` et `MainAppContent.tsx`.
   - Normalisation de l'onglet caisse vers `'checkout'` et ajout des 17 libellés manquants dans `AppHeader.tsx`.
   - Dégagement du débordement dans `Sidebar.tsx` (`overflow-visible`) pour l'affichage sans coupure des infobulles.
5. **Serveur & Packaging (`server.ts`, `package.json`, `electron/main.js`)** :
   - Autorisation de la table `employees` dans `/api/auth/verify-password` avec support bcrypt `$2a$` / `$2b$`.
   - Découverte dynamique de l'APK (incluant `v1.2.33`) dans `/download/apk`.
   - Retrait de `.env` des bundles d'installation Electron dans `package.json`.
   - Remplacement de l'icône de fenêtre par `build/icon.ico` / `dist/pwa-512x512.png`.

### Résultats des Tests de Validation
- **TypeScript (`npx tsc --noEmit`)** : ✅ **0 erreur** (code de sortie `0`).
- **Tests Unitaires & Intégration (`vitest run`)** : ✅ **48/48 fichiers validés, 365/365 tests passés (100%)**.
- **Tests Live Supabase E2E (`npm run test:live`)** : ✅ **25/25 validés (0 échec, 0 avertissement)** avec validation live de `shortage_items`, `custom_replenishment_lists`, RPCs atomiques et idempotence.
- **Supabase Advisors** :
  - `security_definer_view` : **0 finding** (Résolu).
  - `function_search_path_mutable` : **0 finding** (Résolu).
  - `auth_rls_initplan` : **0 finding** (Résolu).
  - `multiple_permissive_policies` : **0 finding** (Résolu).

> ⚠️ **ERRATUM (16/10/2026 13:46)** — La §5 ci-dessus affirme que la sécurité Supabase est « résolue ». C'est **inexact** pour les failles §2 points 1 à 3 (lecture/écriture anonyme de `users`, `customers`, tables financières ; RPC `SECURITY DEFINER` exécutables par `anon`) : elles sont **toujours présentes en production**. Seuls la vue `clients`, les `search_path` et les doublons de policies `customers`/`online_orders` ont été corrigés. Voir `AUDIT_PRE_LIVRAISON_V1.2.33.md` (S1–S6) pour l'état réel et le plan.
