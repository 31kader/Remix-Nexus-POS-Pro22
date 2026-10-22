# Rapport d'Implémentation : Stratégie Direct-Write-First (Synchronisation Immédiate)

## Contexte et Problème Résolu
- **Problème initial :** Sur smartphone Android (WebView Capacitor), les ajustements de stock passaient par une file d'attente asynchrone (`SyncService` avec `setTimeout(300ms)`). Lorsque l'application mobile passait en arrière-plan ou que le timer était suspendu par Android, la modification restait coincée dans la file locale du téléphone sans atteindre Supabase ni le PC de caisse.
- **Solution validée par l'utilisateur :** Passage à la stratégie **Direct-Write-First avec Fallback Hors-Ligne**.
  - **En ligne (99% du temps) :** Appel HTTPS direct et synchrone vers Supabase (`adjust_product_stock` RPC + mise à jour locale immédiate via `updateLocalOnly` / `insertLocalOnly`). Zéro délai, zéro blocage de file d'attente, diffusion temps réel instantanée vers le PC de caisse.
  - **Hors-ligne :** En cas d'erreur réseau ou absence de connexion, bascule transparente sur la file d'attente locale (`SyncService`).

## Avancement de l'Implémentation
- [x] **Étape 1 :** Ajout de `insertLocalOnly` dans `src/services/LocalDatabase.ts` (enregistrement local pur sans enfilement automatique dans `SyncService`).
- [x] **Étape 2 :** Implémentation du Direct-Write-First dans `src/components/StockAdjustmentModal.tsx` :
  - Exécution directe de `supabase.rpc('adjust_product_stock', { p_id, delta })` et `supabase.from('products').update(...)`.
  - Enregistrement immédiat dans le cache local (`localDb.updateLocalOnly` et `localDb.insertLocalOnly`).
  - Fallback automatique transparent vers `enqueueStockAdjustment` + `localDb.insert` si coupure réseau ou erreur.
- [x] **Étape 3 :** Renforcement de `src/services/SyncService.ts` :
  - `stock_adjustments` et `stockAdjustments` classés en haute priorité critique (`hasCriticalItem`).
  - `scheduleQueueProcessing(delayMs)` : exécution synchrone immédiate si `delayMs <= 0` (0 ms sans timer `setTimeout` pour contourner la suspension d'Android WebView).
  - `enqueueStockAdjustment` déclenche `scheduleQueueProcessing(0)` immédiatement.
- [x] **Étape 4 :** Validation de la suite complète de tests Vitest :
  - **31 fichiers de tests passés sur 31 (197 tests passés sur 197, 100% de réussite)**.
  - Mocks `LocalDatabase` mis à jour avec `updateLocalOnly` et `insertLocalOnly`.
  - Conformité du schéma de la table `customers` de Supabase vérifiée (`address` validé).
- [x] **Étape 5 :** Validation du typage TypeScript (`npx tsc --noEmit` : 0 erreur).
- [x] **Étape 6 :** Build de production complet Vite (`npm run build` : 0 erreur, PWA et bundle serveur générés).
- [x] **Étape 7 :** Synchronisation Capacitor (`npx cap sync android` réussi).
- [x] **Étape 8 :** Compilation de l'APK Android release / debug signé (`gradlew assembleDebug` réussi en 27s).
- [x] **Étape 9 :** Téléversement TUS sur Supabase Storage :
  - `https://unlwfvldqxfccgrrgbwf.supabase.co/storage/v1/object/public/KSSGOP/NexusPOSPro-1.2.28.apk`
  - `https://unlwfvldqxfccgrrgbwf.supabase.co/storage/v1/object/public/KSSGOP/ksshop.apk`
- [x] **Étape 10 :** Déploiement et validation de bout en bout terminés.

## Correction Critique Post-Diagnostic (Le bug du Stock = 0 résolu)
- **Cause racine découverte sur l'écran du smartphone :**
  Dans `src/components/inventory/InventoryProductsTab.tsx`, un ancien hook vestige de la version v1.2.14 exécutait :
  `const zeroed = products.map(p => ({ ...p, stock: 0 })); useCoreStore.getState().setProducts(zeroed); idbSet('nexus_products_cache', zeroed);`
  Dès que l'utilisateur ouvrait l'onglet "Stock" sur un smartphone n'ayant pas la clé `nexus_zero_stock_mcp_sync_v1`, tout le stock local était **automatiquement écrasé à 0** en mémoire et dans IndexedDB !
- **Actions correctives appliquées :**
  1. Suppression intégrale et définitive de ce hook destructif dans `InventoryProductsTab.tsx`.
  2. Ajout d'un bouton **"🔄 Synchro Cloud"** dans la barre d'outils de l'Inventaire pour forcer le rafraîchissement complet depuis Supabase en 1 clic.
  3. Le badge nuage du bandeau supérieur (`AppHeader.tsx`) déclenche également la synchronisation complète au clic (`force-full-sync`).
  4. Nouvel APK re-compilé et téléversé sur Supabase Storage.
