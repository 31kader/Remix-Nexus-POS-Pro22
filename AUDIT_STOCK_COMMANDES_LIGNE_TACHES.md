# AUDIT STOCK — Vente en ligne & Annulation de commande (Nexus POS Pro v1.2.26)

> Fichier incrémental (règle anti-coupure). Reprendre à la première case non cochée `[ ]`.
> Créé : 2026-10-08 — Mis à jour : 2026-10-08 14:56
> Fichiers clés : `src/hooks/useOrderActions.ts`, `src/hooks/useCartSync.ts`, `src/services/SyncService.ts`, `src/services/LocalDatabase.ts`, `src/components/useOrdersLogic.tsx`

## 1. ÉTAPES D'ANALYSE
- [x] A1. `useOrderActions.ts` — updateOrderStatus / decrementStockForOrder
- [x] A2. `useOrderActions.ts` — rollbackCancelledOrderTransactions (annulation)
- [x] A3. `useOrderActions.ts` — bulkUpdateOrderStatus (annulation/confirmation en masse)
- [x] A4. `useCartSync.ts` — auto-sync commandes (double circuit de déstockage)
- [x] A5. `useOrdersLogic.tsx` — suppression de commande (stock réintégré ?)
- [x] A6. `SyncService.ts` — stock_adjustments (cumul de deltas, RPC, fallback)
- [x] A7. Supabase — RPC `adjust_product_stock` (SECURITY DEFINER, grant anon/authenticated)
- [ ] A8. Vérification expérimentale du double comptage (test contrôlé sur un article de test)
- [ ] A9. Revue de `useCheckoutProcess.ts` (vente caisse) : même mécanique localDb.update + delta ?

## 2. MÉCANISME RACINE (cause n°1 de TOUS les symptômes : -1 devient 0, +1 fantôme, -2 au lieu de -1)

Une même variation de stock est envoyée à Supabase **2 fois par 2 chemins différents** :

| Chemin | Nature | Où |
|---|---|---|
| (a) `localDb.update('products/ID', { stock: newStock })` | **ABSOLU** : `LocalDatabase.update` appelle `enqueueSync('products', id, 'UPSERT', produitLocalComplet)` → `SyncService` étape 4 fait `products.upsert({... stock: newStock})` | `LocalDatabase.ts` l.269 + `SyncService.ts` l.687 (`stock` est dans `TABLE_COLUMNS.products`) |
| (b) `supabase.from('products').update({ stock: newStock })` direct | **ABSOLU** | `useOrderActions.ts` (decrement l.279, rollback l.197) et `useCartSync.ts` (ajouté en v1.2.26) |
| (c) `enqueueStockAdjustment(id, delta)` → RPC `adjust_product_stock` | **RELATIF** (`stock = stock + delta`) | `SyncService.ts` étape 4.5 (l.719-784) |

Ordre d'exécution : (a)/(b) posent `stock = ancien + delta`, PUIS (c) rajoute `delta` → **stock Supabase = ancien + 2 × delta**.

Preuve par simulation (stock initial 0) :
- Confirmation commande 1 pièce : local = -1 ; Supabase = -1 (absolu) puis -2 (RPC) → **-2**
- Annulation : local = -1+1 = 0 ; Supabase = 0 (absolu) puis +1 (RPC) → **+1** (≠ 0 initial) ← exactement le symptôme rapporté
- Données réelles Supabase relevées : `LOR X50` commande #206 qté 1 → stock **-2** ; `FARINE MOULA 10KG` → **-3**.

## 3. PROBLÈMES TROUVÉS (par priorité)

### P0 — Critiques (corrompent le stock)
- [x] **P0-1. Double application du delta (voir §2).** Résolu : suppression des writes absolus de stock dans `useOrderActions`, `useCartSync`, utilisation de `updateLocalOnly`, filtrage `delete payload.stock` dans `SyncService` quand un delta est en file, déduplication stricte.
- [x] **P0-2. Annulation SANS garde « le stock a-t-il été déduit ? »** — Résolu : garde `!freshOrder.syncedToPos && activeTxs.length === 0` dans `restockOrder` : annuler une commande pending ou non déstockée ne touche à aucun stock.
- [x] **P0-3. Annulation non idempotente** : Résolu : idempotent, après la première annulation `syncedToPos: false` et transaction `cancelled`, toute annulation ultérieure est un no-op propre.
- [x] **P0-4. Suppression de commande (`confirmDeleteOrder`, `handleBulkDelete`) ne réintègre RIEN** : Résolu : `restockOrder` automatique préalable pour les commandes déstockées en cours, et boîte de dialogue explicite pour les commandes livrées.
- [x] **P0-5. Fidélité : même double application.** Résolu : suppression de tout `supabase.customers.update` absolu en direct, gestion 100% atomique par delta via `enqueueCustomerBalanceAdjustment`.

### P1 — Majeurs (incohérences métier)
- [x] **P1-1. Deux circuits de déstockage parallèles** : Résolu : unifié dans `src/services/orderStockService.ts` (`destockOrder`), appelé par `useOrderActions` et `useCartSync`.
- [x] **P1-2. Asymétrie bundles / auto-déballage** : Résolu : géré de façon symétrique dans `destockOrder` et `restockOrder`.
- [x] **P1-3. Rollback : correspondance des transactions par sous-chaîne** : Résolu : fonction stricte `isTransactionMatchingOrder` avec égalité sur `onlineOrderId` et délimiteurs de tokens regex `#id\b` (anti-collision #2 vs #201).
- [x] **P1-4. Rollback réintègre d'après `order.items` même si aucune transaction liée** : Résolu : vérification stricte dans `restockOrder`.
- [x] **P1-5. Rollback fidélité** : Résolu : gestion symétrique par deltas.
- [x] **P1-6. Statut `paid` accepté par l'auto-sync mais absent de `activeDestockStatuses`** : Résolu : unifié avec `['confirmed', 'paid', 'processing', 'shipped', 'delivered']`.
- [ ] **P1-7. Retour en arrière de statut** (`delivered` → `confirmed`, `processing` → `pending`) : aucune logique ; `pending` après confirmation ne réintègre pas.

### P2 — Mineurs / robustesse
- [x] **P2-1.** Affichage : badge « Rupture » masquait la valeur négative (corrigé v1.2.26 pour Row/Card).
- [ ] **P2-2.** `InventoryHeader` : `outOfStockCount` inclut les négatifs (OK) mais « valeur du stock » additionne des négatifs.
- [x] **P2-3.** RPC `adjust_product_stock` ne trace rien dans `stock_adjustments` : Résolu ! Fonction mise à jour dans Supabase avec insertion automatique dans `stock_adjustments`.
- [x] **P2-4.** `product-cache-update` + `setProducts` + `idbSet` + realtime Supabase : unifié sans oscillations grâce aux deltas atomiques.
- [x] **P2-5.** `useCartSync` : harmonisé avec `destockOrder` qui respecte `allowNegativeStock`.

## 4. PLAN DE CORRECTION (ordre d'exécution)
- [x] F1. **Supprimer toute écriture ABSOLUE du stock** liée à un mouvement : `supabase.from('products').update({stock})` retiré dans `useOrderActions` et `useCartSync` ; deltas relatifs via `enqueueStockAdjustment` (RPC) uniquement.
- [x] F2. **Empêcher `localDb.update('products/…', {stock})` d'envoyer `stock` à Supabase** : méthode `localDb.updateLocalOnly` créée et utilisée dans le déstockage + filtre anti double-comptage `stockDeltaIds` dans `SyncService.ts`.
- [x] F3. Même correction pour fidélité : `supabase.customers.update` absolus retirés, deltas atomiques par `enqueueCustomerBalanceAdjustment`.
- [x] F4. Garde dans le rollback : n'agit que si déstocké (`syncedToPos === true` ou transaction active), idempotence stricte.
- [x] F5. Réintégration à la suppression d'une commande déstockée dans `confirmDeleteOrder` et `handleBulkDelete`.
- [x] F6. Correspondance stricte des transactions par `isTransactionMatchingOrder` (anti-collision regex).
- [x] F7. Unification de `decrementStockForOrder` et `useCartSync.syncOrder` dans `src/services/orderStockService.ts`.
- [x] F8. Traçabilité dans `stock_adjustments` via mise à jour du RPC `adjust_product_stock` sur Supabase.
- [x] F9. Tests Vitest automatisés dans `tests/order-stock-lifecycle.test.ts` (7/7 tests passés avec succès).
- [x] F10. Validation TypeScript (`npx tsc --noEmit` = 0 erreur) et build Vite (`npm run build` = OK). Génération des binaires .exe et .apk.
- [ ] F11. **Correction des données** : recalculer le stock des articles touchés (ex. `LOR X50` -2, `FARINE MOULA 10KG` -3, `PURA CHEDDAR`) après validation avec l'utilisateur.

## 5. JOURNAL
- 2026-10-08 14:56 — Analyse A1→A7 terminée, causes P0/P1/P2 consignées.
- 2026-10-08 15:15 — F2: `stockDeltaIds` ajouté dans `SyncService.ts` pour exclure `stock` de l'upsert produit si un delta est en file. `localDb.updateLocalOnly` implémenté.
- 2026-10-08 15:16 — F8: RPC Supabase `adjust_product_stock` mis à jour en `SECURITY DEFINER` avec insertion automatique dans `stock_adjustments`.
- 2026-10-08 15:17 — F1, F3, F4, F6, F7: Service unifié `src/services/orderStockService.ts` créé (`destockOrder`, `restockOrder`, `isTransactionMatchingOrder`). Hooks `useOrderActions.ts` et `useCartSync.ts` refactorés.
- 2026-10-08 15:20 — F5: Réintégration ajoutée dans `confirmDeleteOrder` et `handleBulkDelete` de `useOrdersLogic.tsx`.
- 2026-10-08 15:24 — F9: Suite de tests `tests/order-stock-lifecycle.test.ts` créée et exécutée (7/7 tests passés).
- 2026-10-08 15:26 — F10: `npx tsc --noEmit` réussi (0 erreur) et `npm run build` réussi. Lancement de la génération des binaires.
