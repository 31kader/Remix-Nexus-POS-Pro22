# 🚦 Audit Pré-Livraison — Nexus POS Pro v1.2.33

> Fichier de suivi **incrémental** (reprise sur coupure Internet / tokens).
> Règle : chaque module est coché dès qu'il est analysé. En cas de reprise, repartir de la première case `[ ]`.
> Légende : 🔴 Bloquant livraison · 🟠 Important · 🟡 Mineur · ✅ OK

## Liste des modules à auditer

- [x] M1. Sécurité Supabase : RLS réel (`pg_policies`) + grants anon/authenticated + advisors
- [x] M2. Secrets & fichiers sensibles (`.env`, clés en dur, git tracking, build embarqué)
- [x] M3. Dépendances vulnérables (`npm audit`)
- [x] M4. Code : règles `GEMINI.md` (localDb 3 args, `<img>` bruts, sélecteurs Zustand, `window.confirm`)
- [x] M5. Code : dette technique (TODO/FIXME, `console.log`, `any`, `@ts-ignore`)
- [x] M6. Sync offline-first : cohérence `TABLE_COLUMNS` vs schéma Supabase réel
- [x] M7. Serveur Express / Electron (CORS, headers, routes sensibles)
- [x] M8. Packaging livrable (.exe, version, métadonnées, signature)
- [x] M9. Tests (tsc, vitest, live) — état final
- [x] M10. Synthèse & plan de correction priorisé

## Résultats par module

### M1 — Sécurité Supabase (analysé 13:40)
RLS activé sur les 32 tables ✅. Mais les politiques **réellement en base** restent ouvertes au rôle `anon` (clé publique embarquée dans l'app) :

- [ ] 🔴 **S1** `users` : `users_anon_select` (`qual = true`) → toute personne avec la clé anon lit emails, rôles et **`password_hash`** (confirmé : le test live lit `users` avec la clé anon, HTTP 200).
- [ ] 🔴 **S2** `transactions` (SELECT/INSERT/UPDATE `true`), `cash_shifts` (idem), `purchases`, `suppliers`, `supplier_payments`, `expenses`, `returns`, `stock_adjustments`, `damaged_items`, `audits`, `attendance`, `cart_drafts`, `cashier_alerts` (ALL `true` pour `anon`) → lecture/modification/**écriture totale** des données financières sans authentification.
- [ ] 🔴 **S3** `customers` : SELECT/INSERT/UPDATE `true` pour `anon` (soldes, téléphones, `password_hash` clients).
- [ ] 🟠 **S4** `audit_logs` : `anon` peut INSERT/SELECT/UPDATE (journal d'audit falsifiable).
- [ ] 🟠 **S5** `online_orders_anon_update_policy` : `anon` peut modifier n'importe quelle commande (`id IS NOT NULL`) — ajoutée par moi pour la compat boutique en ligne, à restreindre.
- [ ] 🟠 **S6** 17 fonctions `SECURITY DEFINER` exécutables par `anon` + `authenticated` (`adjust_customer_balance`, `apply_stock_adjustment`, `adjust_product_stock`, `login_app_customer`, `register_app_customer`, `is_admin`...) → n'importe qui peut modifier stock/solde client via `/rest/v1/rpc/...`.
- [ ] 🟡 **S7** Protection mots de passe compromis (HaveIBeenPwned) désactivée dans Supabase Auth.

> ⚠️ **Correction** : mon rapport précédent (`AUDIT_DIAGNOSTIC_COMPLET_V1.2.33.md` §5) indiquait la sécurité « résolue ». C'est **inexact** pour S1–S6 : seuls la vue `clients`, les `search_path` et les doublons de policies `customers`/`online_orders` ont été corrigés. Les advisors Supabase ne signalent pas ces policies `true`.
>
> **Cause racine** : l'app utilise la clé `anon` comme client POS (login local bcrypt, pas de session Supabase Auth). Fermer ces policies sans migrer vers une vraie session `authenticated` **casserait la synchronisation**. C'est un chantier d'architecture à décider (voir M10).

### M2 — Secrets & fichiers sensibles (analysé 13:41)
- ✅ `.env`, `.env.local`, `.env.production` ignorés par git ; seul `.env.example` est suivi.
- ✅ `.env` retiré de `build.files` (v1.2.33).
- [ ] 🟠 **K1** À vérifier : `release/win-unpacked` ne contient pas de `.env` ni de clé `service_role` (voir M8).

### M3 — Dépendances (`npm audit --omit=dev`, analysé 13:41)
- [ ] 🟠 **D1** `xlsx` (SheetJS) : 1 vulnérabilité **high** (Prototype Pollution GHSA-4r6h-8v6p-xvw6 + ReDoS GHSA-5pgg-2g8v-p4x9), **aucun correctif npm**. Atténuée par `excelSecurity.ts` (tests adversariaux OK) et chargement lazy, mais le risque résiduel persiste. Remplacement possible par `exceljs` ou SheetJS CDN (0.20.x).

### M4 — Règles `GEMINI.md` (analysé 13:42)
- ✅ `localDb.insert/update` : 0 appel à 3 arguments (les 2 correspondances sont des faux positifs : 2 args avec objet).
- ✅ Sélecteurs Zustand : 0 appel `useXxxStore()` sans sélecteur.
- ✅ `<img>` bruts : 2 occurrences, toutes deux dans des **templates HTML d'impression** (`CustomerDigitalCard.tsx:113`, `MarketingPosters.tsx:331`) avec `escapeHtml()` → conforme (`SafeImage` inapplicable hors React).
- [ ] 🟡 **C1** `useInventoryActions.ts:103` : appel résiduel `await localDb.delete('products')` (sans id) dans `handleMassDeleteProducts`. Neutralisé par la garde `id` vide ajoutée en v1.2.33 mais inutile → à supprimer.
- [ ] 🟡 **C2** Vérifier qu'un `ConfirmDialog`/`confirm()` précède bien `handleMassDeleteProducts` côté `Inventory.tsx` (8 `confirm()` natifs recensés : `QuickSelect`, `Returns`, `SyncStudio`, `VoucherManager` ; `useCategoryBrand.handleDeleteBrand` utilise `window.confirm`). Vérification manuelle recommandée.

### M5 — Dette technique (analysé 13:42)
- ✅ 0 `dangerouslySetInnerHTML`, 0 `eval`, 0 `new Function`, 0 `.innerHTML =` dans `src/`.
- ✅ 0 secret en dur (`service_role`, `sk-…`, `AIza…`, JWT) dans `src/`, `server.ts`, `electron/`.
- ✅ Encodage : 0 ligne corrompue (mojibake) dans `src/` (l'affichage `Ã©` vu en console était un artefact PowerShell).
- [ ] 🟡 **T1** 4 `@ts-ignore` : `BarcodeScanner.tsx:99,102`, `PriceCheckerModal.tsx:383,385` (API caméra/torche non typées) — acceptable, à documenter.
- [ ] 🟡 **T2** 19 `console.log` dans `src/` — à retirer ou garder derrière un flag debug avant livraison.
- [ ] 🟡 **T3** 2 `TODO/FIXME` restants — à relire.

### M6 — Synchronisation offline-first ↔ Supabase (analysé 13:43)
- ✅ Comparaison **automatisée** `TABLE_COLUMNS` vs `information_schema.columns` du projet `unlwfvldqxfccgrrgbwf` : **0 colonne fantôme, 0 table absente**. Seule `customer_balance_adjustments` n'a pas de `TABLE_COLUMNS` (normal : écrite uniquement par RPC).
- ✅ Live test E2E : 25/25.

### M7 — Serveur Express / Electron (analysé 13:42)
- ✅ CORS restreint (localhost + réseaux privés), headers de sécurité (CSP, nosniff, X-Frame-Options DENY, HSTS conditionnel), rate-limit login (5 essais), `query parser: simple`, SQL IPC validé (mono-requête, pas d'`ATTACH`), `sandbox`/`contextIsolation`/`webviewTag:false`, navigation filtrée.
- [ ] 🟠 **E1** `POST /api/ai/complete` et `/api/ai/scan` : **sans authentification ni rate-limit**, utilisent `GEMINI_API_KEY` du serveur si le client n'envoie pas `x-gemini-key`. Serveur écoute sur `0.0.0.0` (`server.ts:880`) → toute machine du LAN peut consommer le quota IA. → exiger un jeton de session ou lier à `127.0.0.1` en mode Electron.
- [ ] 🟠 **E2** `express.json({ limit: '50mb' })` global : surface DoS mémoire sur tout le LAN. → 50 Mo uniquement sur `/api/ai/scan`, ~1 Mo ailleurs.
- [ ] 🟠 **E3** `electron/main.js` (l.~312-318) force `access-control-allow-origin: *` + `allow-credentials: true` sur **toutes** les réponses de la session → annule la protection CORS du navigateur intégré. → limiter aux domaines Supabase.
- [ ] 🟡 **E4** CSP avec `'unsafe-inline'` et `'unsafe-eval'` dans `script-src` → à réévaluer.
- [ ] 🟡 **E5** IPC `sqlite-execute` / `sqlite-query` : SQL arbitraire exposé au renderer (validation minimale). Risque seulement si XSS. → whitelist / requêtes préparées nommées.
- [ ] 🟡 **E6** `/api/network-ip` et `/api/network-info` exposent l'IP LAN sans authentification (faible).

### M8 — Packaging livrable (analysé 13:42)
- ✅ Version `1.2.33` cohérente (`package.json`, `appConfig.ts`, `Sidebar`, `LoginView`).
- ✅ `app.asar` : aucun `.env` ni `service_role` ; pas de `.env` dans `win-unpacked`.
- [ ] 🟠 **P1** `NexusPOSPro-1.2.33-Setup.exe` **non signé** (`NotSigned`) → avertissement Windows SmartScreen chez les clients. Besoin d'un certificat de signature de code (OV/EV).
- [ ] 🟡 **P2** `signAndEditExecutable:false` → icône/métadonnées de l'`.exe` principal non injectées. `description` et `author` manquent dans `package.json`.
- [ ] 🟡 **P3** Mise à jour automatique : `latest.yml` généré, mais présence d'`electron-updater` à confirmer.

### M9 — Tests (état final)
- ✅ `npx tsc --noEmit` : 0 erreur · ✅ `vitest run` : 48/48 fichiers, 365/365 tests · ✅ `npm run test:live` : 25/25.
- ⚠️ Le test live vérifie l'**accessibilité** avec la clé `anon` : il ne détecte donc pas S1–S3 (c'est précisément la faille). Ajouter un test négatif après durcissement RLS.

---

## M10 — Verdict & Plan de correction priorisé (13:46)

### Verdict de livraison
| Public visé | Verdict | Raison |
| :--- | :---: | :--- |
| Démo / test interne / réseau fermé | 🟢 GO | Fonctionnel, 365 tests + 25 tests live verts, sync cohérente |
| **Livraison client (production réelle)** | 🔴 **NO-GO** tant que **S1–S3** ne sont pas traités | Base de données lisible/modifiable avec la seule clé `anon` publique (hashes de mots de passe inclus) |

### Plan de correction (cocher au fur et à mesure)

**Lot A — Correctifs code sans risque (≈ 1 h, aucune casse attendue)**
- [ ] A1 (C1) Supprimer `await localDb.delete('products')` résiduel — `useInventoryActions.ts:103`
- [ ] A2 (T2) Retirer/encadrer les 19 `console.log` de `src/`
- [ ] A3 (T3) Traiter les 2 `TODO/FIXME`
- [ ] A4 (E2) Limiter `express.json` à ~1 Mo, 50 Mo seulement sur `/api/ai/scan`
- [ ] A5 (E3) Restreindre l'override CORS d'Electron aux domaines `*.supabase.co`
- [ ] A6 (E1) Protéger `/api/ai/*` (jeton + rate-limit) ; écouter sur `127.0.0.1` en mode Electron
- [ ] A7 (P2) Ajouter `description` / `author` dans `package.json`
- [ ] A8 (C2) Vérifier les confirmations avant suppression en masse
- [ ] A9 Ajouter un test négatif RLS (la clé `anon` ne doit PAS lire `users`) — rouge tant que le Lot B n'est pas fait

**Lot B — Sécurité base de données (chantier d'architecture, décision requise)**
- [ ] B1 (S1) Retirer `users_anon_select` et ne plus exposer `password_hash` au rôle `anon`
- [ ] B2 (S2, S3, S4, S5) Remplacer toutes les policies `anon … true` par des policies `TO authenticated` (+ policies étroites pour la boutique en ligne : INSERT commande seulement)
- [ ] B3 (S6) `REVOKE EXECUTE` sur les RPC `SECURITY DEFINER` pour `anon` (garder uniquement `login_app_customer`, `register_app_customer`, `get_customer_email_by_phone` pour la boutique), contrôler `auth.uid()` dans les autres
- [ ] B4 Faire ouvrir au POS une **vraie session Supabase Auth** (`signInWithPassword` du propriétaire/employés) afin que le client utilise le rôle `authenticated` et non `anon`
- [ ] B5 (S7) Activer la protection « mots de passe compromis » dans Supabase Auth
- [ ] B6 Rejouer `npm run test:live` + parcours caisse/synchro/commande en ligne complets après B1–B5

**Lot C — Distribution**
- [ ] C1 (P1) Acheter un certificat de signature de code et signer l'installateur
- [ ] C2 (P3) Confirmer/ajouter `electron-updater` pour les mises à jour automatiques
- [ ] C3 (D1) Évaluer le remplacement de `xlsx` (vulnérabilité sans correctif)

### Reprise sur incident
Reprendre à la première case `[ ]` de la section « Plan de correction ». Ne pas recommencer l'audit M1–M9 (terminé et enregistré ci-dessus).
