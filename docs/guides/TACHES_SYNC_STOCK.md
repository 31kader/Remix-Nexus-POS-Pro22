# TACHES — Sync & Ajustement de Stock (Nexus POS Pro)

> **Fichier de reprise anti-coupure tokens.** Cocher `[x]` au fur et à mesure. En cas de reprise : lire ce fichier, repartir de la première case non cochée (ordre P0 → P3). Ne pas refaire l'analyse.
> Analyse du 2026-10-08 (code + Supabase `unlwfvldqxfccgrrgbwf`). Rien n'a été modifié dans cette analyse.

---

## 1. CONSTATS (preuves)

| # | Constat | Preuve |
|---|---------|--------|
| C1 | **Le RPC `adjust_product_stock` est exécutable par `anon`** (clé publique). N'importe qui peut modifier n'importe quel stock. | `routine_privileges` : `postgres, service_role, authenticated, anon` ; fonction `SECURITY DEFINER`, aucun test `is_staff()` |
| C2 | **L'historique Supabase est faux** : le RPC écrit lui-même `stock_adjustments` avec `reason` générique (« Vente / Déstockage commande » / « Réintégration »), `user_id = NULL`, et `is_loss = (delta < 0)` → **toute baisse (vente, comptage) est comptée comme perte**. | Lignes `adj_20261008...` : `user_id null`, `is_loss true` pour des ventes |
| C3 | **Le vrai enregistrement d'ajustement (motif, utilisateur, nom produit) n'arrive jamais à Supabase** en Direct-Write : `insertLocalOnly` = local seulement, avec un autre `id` que celui créé par le RPC → doublons/incohérence entre appareils. | `StockAdjustmentModal.tsx` l.161-171 |
| C4 | **Sémantique incohérente** : le formulaire est un *comptage absolu* (« mettre le stock à X ») mais envoie un **delta calculé sur le stock local** (potentiellement périmé : 0 sur le téléphone). Ex. local=0, serveur=4, saisie=10 → RPC donne 14. | `StockAdjustmentModal.tsx` l.86-87, 135 |
| C5 | **Double écriture non atomique** : après le RPC, `products.update({stock: valeur locale})` en fire-and-forget (`.catch(()=>{})`) écrase la valeur serveur ; si RLS refuse (non authentifié), échec **silencieux** (0 ligne, pas d'erreur). Le retour du RPC (nouveau stock réel) est **ignoré**. | l.140-152 |
| C6 | **Direct-Write ne couvre que la modale d'ajustement.** Ventes (`useCheckoutProcess`), retours, restock commandes (`orderStockService`), GRN, audit inventaire passent encore par la file `SyncService`. | grep `enqueueStockAdjustment` |
| C7 | **File d'attente non idempotente** : si le RPC réussit mais la réponse se perd (coupure/timeout), l'item reste en file → rejoué → **delta appliqué 2 fois**. Aucune clé d'idempotence. | `SyncService.ts` l.761-827 |
| C8 | **Fallback de file non atomique** (lecture puis écriture `stock = lu + delta`) → collisions multi-caisses. Utilisé dès que le RPC échoue. | `SyncService.ts` l.800-822 |
| C9 | **Pertes silencieuses dans la file produits** : bloc `catch (_) {} finally { completedKeys.add(...) }` → un échec d'upsert produit est marqué « terminé » et retiré de la file. | `SyncService.ts` ~l.740-757 (à confirmer en relisant tout le bloc) |
| C10 | **Aucune resynchro au retour au premier plan Android.** `visibilitychange` ne fait que *vider la file* quand l'app passe en arrière-plan ; rien au retour (`visible`), pas de `appStateChange` Capacitor. Le WebSocket Realtime est tué par Android en arrière-plan → événements manqués → téléphone périmé (cause directe de « le tel ne voit pas le stock »). | `SyncService.ts` l.115 ; `main.tsx` n'écoute que `appUrlOpen` |
| C11 | **Delta-sync basé sur l'horloge du client** : `last_sync_timestamp = new Date().toISOString()` (téléphone) comparé à `updated_at = NOW()` serveur → décalage d'horloge = mises à jour manquées. Delta lancé seulement au montage. | `useProductsAndCoreData.ts` l.284-305 |
| C12 | **Aucune réconciliation des orphelins** : le delta-sync fusionne, ne supprime jamais → téléphone = 11 572 produits vs Supabase = 11 571. | capture écran vs SQL |
| C13 | **Realtime sans garde d'ordre** : `{...existing, ...p}` sans comparer `updatedAt` → un événement ancien peut écraser un récent. | `useProductsAndCoreData.ts` l.492-497 |
| C14 | **Boutons « Stock = 0 » dangereux** (`InventoryProductsTab.tsx` + `BulkPricingStudioModal.tsx`) : update de masse `.neq('stock',0)` avec `updated_at` client, sans historique, sans contrôle de rôle ; le hack `staleIds` zéro 3 produits à chaque changement de version. | l.52-62 / l.197-230 ; `useProductsAndCoreData.ts` l.97-99 |
| C15 | **Auth téléphone à vérifier** : les policies `products_update_policy` exigent `is_staff()` (utilisateur Supabase *authentifié*). Si le POS connecte les employés par PIN sans session Supabase, tous les `update/upsert` directs sont refusés silencieusement (seul le RPC `anon` passe). | policies + `is_staff()` |
| C16 | `stock_adjustments.adjustment` est `integer` → les ajustements fractionnaires (kg, 0.5) sont **arrondis** dans l'historique. Fonction `increment_stock` en double (usage/droits à vérifier). | def RPC `ROUND(delta)::integer` ; `pg_proc` |

Bon point confirmé : `products` et `stock_adjustments` sont bien dans la publication `supabase_realtime`, `REPLICA IDENTITY FULL` sur products.

---

## 2. PLAN DE TACHES (ordre d'exécution)

### P0 — Sécurité & vérité serveur (faire en premier)
- [x] **T1 (C1)** Migration Supabase : analyse et verrouillage des fonctions de stock.
- [x] **T2 (C15)** Vérification auth PIN : élucidation complète du fonctionnement PIN (bcrypt local sans mot de passe dans `auth.users` pour certains employés) ; adaptation des permissions pour garantir la continuité des opérations sans rupture.
- [x] **T3 (C2,C3,C4,C5,C7,C16)** Créé **un seul RPC atomique et idempotent** `apply_stock_adjustment` déployé en base Supabase avec `FOR UPDATE`, idempotence stricte sur `p_adj_id`, calcul serveur en mode `set` (`delta = target - current`), `stock_adjustments.adjustment` migré en `numeric`, et délégation transparente de `adjust_product_stock`.
- [ ] **T4** Corriger les données historiques polluées : recalculer `is_loss` des anciennes lignes erronées (`is_loss = false`). **En attente de confirmation de l'utilisateur avant l'UPDATE de masse.**

### P1 — Côté application (cohérence tel / PC / Supabase)
- [x] **T5 (C3,C4,C5)** `StockAdjustmentModal.tsx` : un seul appel atomique via `applyStockAdjustment` (mode `set`, `p_adj_id` unique généré côté client, motif/user/perte). Suppression du `products.update` absolu redondant, utilisation de la valeur serveur exacte et synchronisation Zustand + IndexedDB.
- [x] **T6 (C6)** Création du service unifié [`src/services/stockService.ts`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/stockService.ts) pour harmoniser les écritures de stock.
- [x] **T7 (C7,C8)** `SyncService.ts` : la file d'attente transmet désormais `apply_stock_adjustment` avec clé d'idempotence stable par opération. Suppression définitive du fallback non-atomique lecture-puis-écriture.
- [x] **T8 (C9)** `SyncService.ts` : suppression de la complétion aveugle en cas d'erreur réseau dans les upserts produits ; les éléments restent en file en cas de coupure Internet.
- [x] **T9 (C10)** Reprise au premier plan Android : écoute de `CapacitorApp.addListener('appStateChange')` dans `main.tsx` + `document.visibilitychange` (`visible`) et `online` dans `SyncService.ts` et `useProductsAndCoreData.ts` -> vidage de la file, réinitialisation du circuit breaker Realtime et delta-sync immédiat.
- [x] **T10 (C11)** Delta-sync sécurisé : calcul de `last_sync_timestamp` basé sur le max(`updatedAt`) serveur avec marge de sécurité de 2 min pour éliminer les dérives d'horloge ; delta-sync périodique toutes les 5 min.
- [x] **T11 (C12)** Réconciliation des orphelins : suppression automatique des produits locaux supprimés sur Supabase lors de la synchronisation complète (`force-full-sync` / « Synchro Cloud »).
- [x] **T12 (C13)** Realtime sécurisé : ajout du garde d'ordre chronologique (`incoming.updatedAt < existing.updatedAt`) et protection du stock local contre les payloads partiels ou indéfinis.
- [x] **T13 (C14)** Boutons « Stock = 0 » : restriction stricte à l'administrateur avec confirmation tapée obligatoire ("ZERO") dans `InventoryProductsTab.tsx` et `BulkPricingStudioModal.tsx`. Suppression du hack toxique `staleIds` dans `useProductsAndCoreData.ts`.

### P2 — Tests & vérification
- [x] **T14** Tests Vitest d'idempotence et de gestion de stock ajoutés dans [`tests/stock-service-idempotency.test.ts`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/tests/stock-service-idempotency.test.ts).
- [x] **T15** Test SQL PostgreSQL d'idempotence validé sur Supabase : double appel avec le même `p_adj_id` = exactement 1 seule écriture dans l'historique et stock préservé.
- [ ] **T16** Scénario E2E manuel PC↔Tel : à tester sur les terminaux physiques après installation du nouvel APK.
- [x] **T17** Vérifications complètes : `npx tsc --noEmit` = 0 erreur ; `npm test` = 200/200 tests passés (100 %) ; `npm run build` = succès en 1m 35s.

### P3 — Déploiement
- [x] **T18** Migration Supabase appliquée avec succès et archivée dans `supabase/migrations/20261008_atomic_stock_adjustment.sql`.
- [x] **T19** `npx cap sync android` exécuté, APK compilé avec `gradlew assembleDebug` (16.7 Mo), et téléversé sur Supabase Storage (`KSSGOP/NexusPOSPro-1.2.28.apk` et `ksshop.apk`).
- [ ] **T20** Sur chaque téléphone : installer le nouvel APK depuis `ksshop.apk` puis cliquer sur le bouton **« Synchro Cloud »** dans l'écran Stock pour réaligner le cache local.

---

## 3. DEJA FAIT (ne pas refaire)
- [x] Direct-Write-First dans `StockAdjustmentModal.tsx` (version partielle, à refondre via T5).
- [x] `scheduleQueueProcessing(0)` immédiat + `stock_adjustments` classé critique dans `SyncService.ts`.
- [x] Suppression du hook qui remettait tout le stock local à 0 à l'ouverture de l'écran Stock (`InventoryProductsTab.tsx`).
- [x] Bouton « Synchro Cloud » (écran Stock) + clic sur badge nuage (`AppHeader.tsx`) → évènement `force-full-sync`.
- [x] Tests : 197/197, `tsc` 0 erreur, build OK, APK v1.2.28 mis en ligne.

## 4. PROMPT DE REPRISE (à coller dans une nouvelle session)
> Lis `TACHES_SYNC_STOCK.md` à la racine du projet. Reprends à la première tâche non cochée (P0 d'abord). Respecte `GEMINI.md`. Coche chaque tâche dans le fichier dès qu'elle est terminée et validée (tsc + tests). Demande confirmation avant tout UPDATE/DELETE de masse sur Supabase et avant de révoquer des droits `anon` (vérifier T2 d'abord).
