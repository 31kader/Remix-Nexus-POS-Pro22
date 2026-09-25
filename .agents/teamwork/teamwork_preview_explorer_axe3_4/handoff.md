# Rapport d'Audit 360° — Explorateur 2 : Axe 3 (Sécurité & Auth) & Axe 4 (Performance & Ergonomie UI)

- **Date d'audit** : 2026-09-25T13:45:00Z
- **Version cible** : Nexus POS Pro v1.2.14
- **Auditeur** : Explorateur 2 (`teamwork_preview_explorer_axe3_4`)
- **Périmètre** : Code source complet (`src/`) sur les Axes 3 et 4

---

## 1. Observation (Faits Techniques Observés)

### Axe 3 : Sécurité & Authentification

1. **Variables d'environnement et secrets codés en dur** :
   - Dans `src/config/ownerConfig.ts:1-8` : Les emails du propriétaire et de l'administrateur sont chargés via `(import.meta as any).env?.VITE_OWNER_EMAIL` et `VITE_ADMIN_EMAIL`. Les UIDs proviennent de `VITE_OWNER_UID`. Aucun email ou UID personnel n'est codé en dur.
   - Dans `src/supabase.ts:7-8` : `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont lus via `(import.meta as any).env?.VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Aucune clé d'API Supabase n'est présente en dur dans `src/`.
   - Dans `src/lib/security.ts:3-4` : La clé de dérivation locale provient de `VITE_SUPABASE_ANON_KEY` avec un repli non critique salé.

2. **Stockage de session (`sessionStorage` vs `localStorage`)** :
   - Dans `src/services/AuthService.ts:86-93` : `AuthEmulator` stocke `safeUserData` dans `sessionStorage.setItem('nexus_auth_user', ...)` et exécute `localStorage.removeItem('nexus_auth_user')`.
   - **Observation d'anomalie** dans `src/hooks/useAuthUser.tsx:217` : Lors de la connexion en ligne, le cache de session est stocké en clair dans `localStorage` :
     ```typescript
     localStorage.setItem('nexus_active_online_session', JSON.stringify(sessionToCache));
     ```
   - Dans `src/App.tsx:90-91` : L'initialisation du state `loading` lit directement `localStorage.getItem('nexus_active_online_session')` et `localStorage.getItem('nexus_active_offline_session')`.

3. **Hachage des mots de passe et codes PIN (bcrypt)** :
   - Dans `src/lib/db-converters.ts:310-330` : `preparePayload` vérifie la présence de `password` ou `passwordHash`. S'il ne commence pas par `$2a$`, `$2b$` ou `$2y$`, il le hache immédiatement avec `bcrypt.hashSync(hasPlain, 10)` et supprime les clés en clair avant toute expédition vers Supabase (`delete (payload as any).password`).
   - Dans `src/services/AuthService.ts:191, 270, 288, 305, 332` : Comparaison et hachage systématiques avec `bcrypt.compareSync` et `bcrypt.hashSync(password, 10)`.
   - Dans `src/scripts/sanitizePlainPasswords.ts:14-48` : Migration automatique en tâche de fond des mots de passe en clair vers bcrypt pour `users`, `customers` et `suppliers`.
   - **Observation d'anomalie** dans `src/components/PinLockModal.tsx:50, 62` : Le master PIN est manipulé directement dans `localStorage.getItem('nexus_pos_master_pin')` sans passer par `getSecureItem`/`setSecureItem` de `src/lib/security.ts`.

4. **Contrôle d'accès et authentification par rôle** :
   - Dans `src/services/AuthService.ts:238` : La fonction `findLocalUser` restreint explicitement la recherche à `lookup('users') || lookup('employees')`. Les tables `customers` et `suppliers` sont formellement exclues du login caisse.
   - Dans `src/hooks/useAppPermissionsAndStats.ts:67-70` : Vérification renforcée pour le rôle `admin` : `isVerifiedAdmin = isOwner || (user?.email && (user.email === profile.email || user.email === settings?.email))`.

5. **Validation MIME des fichiers et uploads** :
   - Dans `src/supabase.ts:112-116` : `uploadImageBlobToStorage` valide strictement la liste blanche MIME (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, `image/svg+xml`), compresse en WebP (`compressImage`) et limite la taille à 5 Mo.
   - **Observation d'anomalie** dans `src/hooks/employees/useEmployeeCamera.ts:77-90` : `handleFileUpload` lit le fichier via `new FileReader()` et l'encode directement en Base64 sans vérifier ni `file.type` ni `file.size`.

6. **Actions destructives et confirmation** :
   - Dans `src/components/employees/useTeamManagementLogic.ts:188-230` : Purge des comptes utilisateurs protégée par `window.confirm` avec garde-fou empêchant la suppression des comptes liés à des transactions de vente.
   - Dans `src/components/Returns.tsx:25` : Purge des retours protégée par `window.confirm`.
   - Dans `src/components/ArchiveManager.tsx:215-224` : Purge post-archivage protégée par modale de confirmation.
   - **Observation d'anomalie** dans `src/hooks/useCategoryBrand.ts:101-125` : `handleDeleteCategory` supprime immédiatement la catégorie via `await localDb.delete('categories/${targetCategory.id}')` sans aucun `window.confirm()` ni modal de confirmation (contrairement à `handleDeleteBrand` à la ligne 161 du même fichier).

---

### Axe 4 : Performance & Ergonomie UI

1. **Routage et Navigation (`Sidebar.tsx` ↔ `TabRenderer.tsx`)** :
   - Dans `src/components/Sidebar.tsx` : 26 onglets sont déclarés (`checkout`, `orders`, `customers`, `transactions`, `returns`, `promotions`, `inventory`, `grns`, `audit`, `expiry`, `inventory_settings`, `vouchers`, `suppliers`, `purchases`, `expenses`, `reports`, `shifts`, `employees`, `team`, `marketing`, `catalog_printer`, `audit_logs`, `camera`, `settings`, `sync_studio`, `archives`, `help`).
   - Dans `src/components/TabRenderer.tsx:380-466` : Chaque identifiant sans exception possède son `case` dédié, ainsi que des alias de compatibilité (`caisse`, `pos`, `dashboard`, `ai_assistant`, `posters`, `labels`, `grn`, `inventory_audit`, `sync`). Taux de correspondance : **100%**.

2. **Chargement différé (`React.lazy()` + `Suspense`)** :
   - Dans `src/components/TabRenderer.tsx:15-42` : Tous les 28 modules d'onglets sont importés en `React.lazy()` et rendus sous `<Suspense fallback={loadingFallback}>` avec `<ErrorBoundary>`.
   - Dans `src/App.tsx:45-54` : 9 vues secondaires et modales lourdes sont en `lazy()`.
   - Dans `src/components/inventory/InventoryModalsGroup.tsx:12-20` : 7 modales d'inventaire sont découpées en `lazy()`.

3. **Utilisation de `<SafeImage />` vs balises `<img />` brutes** :
   - **Observation d'anomalies** : Des balises `<img />` brutes non mises en cache WebP IndexedDB sont présentes dans :
     - `src/components/Brands.tsx:130`
     - `src/components/BrandModal.tsx:112`
     - `src/components/label-printer/LabelSimulator.tsx:94, 240`
     - `src/components/expiry/ExpiryListView.tsx:109, 341`

4. **Pagination des listes volumineuses** :
   - Pagination à 50 items/page effective dans :
     - `src/hooks/useInventoryData.ts:29` (Produits : 50/page)
     - `src/components/transactions/TransactionTable.tsx:24` (Transactions : 50/page)
     - `src/components/Returns.tsx:19` (Retours : 50/page)
     - `src/components/Expenses.tsx:26` (Dépenses : 50/page)
     - `src/components/reports/GroupedSalesAndBasketsReport.tsx:51` (50/page)
   - **Observation d'anomalies** :
     - `src/components/Customers.tsx:48` : `TABLE_PAGE_SIZE = 20` (au lieu de 50).
     - `src/components/reports/stock/useStockHistoryLogic.ts:14` : `pageSize = 20` (au lieu de 50).
     - `src/components/usePromotionsLogic.ts:23` : `pageSize = 12` (au lieu de 50).

5. **Raccourcis clavier Caisse (F1-F10) vs Interface Visuelle** :
   - Dans `src/components/checkout/useCheckoutShortcuts.ts:31-60` :
     - `F1` : Valider sans imprimer
     - `F2` : Vider le panier (`window.confirm`)
     - `F4` : Nouveau panier (`addNewSession`)
     - `F5` / AltGr+P : Valider & Imprimer
   - **Observation d'anomalie** dans `src/components/checkout/PaymentOrderSummary.tsx:416, 444, 470` :
     - Le bouton "CARTE / TPE" affiche le badge `F2`.
     - Le bouton "VALIDER & IMPRIMER" affiche le badge `[F4]`.
     Divergence ergonomique critique entre ce qui est affiché au caissier et ce qui est exécuté.

6. **Cohérence Mode Sombre & Styles d'inactivité** :
   - `src/components/ui/index.tsx:6, 141` : Les composants de base `<Button />` et `<Modal />` gèrent le mode sombre et l'inactivité (`disabled:opacity-50 disabled:cursor-not-allowed`).
   - **Observation d'anomalies** :
     - `src/components/AddStaffModal.tsx:63, 79, 89` : Inputs en `bg-slate-50 border-slate-200` en dur sans classes `dark:`.
     - `src/components/ExpirationModal.tsx:31-38` : Cartes en `bg-red-50` / `bg-amber-50` sans `dark:`.
     - `src/components/LowStockModal.tsx:21` : Cartes en `bg-rose-50` sans `dark:`.
     - `src/components/Checkout.tsx:542` : Bouton validation avec `disabled:bg-slate-900` sans `disabled:cursor-not-allowed` ni `disabled:opacity-50`.

---

## 2. Logic Chain (Démarche d'Analyse Logique)

1. **Règle GEMINI.md sur la session** :
   - Observation : `useAuthUser.tsx:217` fait `localStorage.setItem('nexus_active_online_session', ...)`.
   - Déduction : Si un opérateur ferme sa fenêtre sans déconnexion explicite, le token de session reste en clair dans le stockage persistant du navigateur. Cela contrevient à l'exigence `sessionStorage` et crée un risque d'usurpation de session locale sur terminal partagé.

2. **Règle GEMINI.md sur la validation MIME** :
   - Observation : `useEmployeeCamera.ts:77-90` lit tout fichier avec `FileReader` sans tester `file.type`.
   - Déduction : N'importe quel fichier malformé ou exécutable peut être encodé en base64 et persisté dans les documents d'employés.

3. **Règle GEMINI.md sur les actions destructives** :
   - Observation : `useCategoryBrand.ts:101-125` supprime la catégorie dès l'appel de `handleDeleteCategory`.
   - Déduction : Une erreur de manipulation de l'utilisateur détruit définitivement la catégorie sans possibilité de confirmation.

4. **Règle GEMINI.md sur les raccourcis caisse** :
   - Observation : L'UI indique au caissier `F2` pour Carte et `F4` pour Imprimer, mais l'écouteur `keydown` vide le panier sur `F2` et ouvre un nouveau panier sur `F4`.
   - Déduction : Risque d'erreur opérationnelle majeure en caisse (perte du panier du client au moment de payer par carte).

5. **Règle GEMINI.md sur la pagination (50 items/page)** :
   - Observation : `Customers.tsx:48` fixe la pagination à 20 items.
   - Déduction : Dégradation de l'ergonomie lors de la consultation de répertoires clients volumineux.

---

## 3. Caveats (Limites & Précisions)

- L'investigation s'est déroulée en mode strict lecture seule (`read-only`), aucune modification de code n'a été effectuée.
- Les balises `<img>` présentes dans les services d'impression (`receiptPrintService.ts`, `catalogPrintService.ts`, `labelPrintService.ts`, `printDossier.ts`) sont des chaînes HTML destinées aux fenêtres d'impression système (`window.print()`) et ne constituent pas une anomalie.
- Le terminal POS Android Capacitor n'a pas été testé dynamiquement sur matériel physique, mais les points d'API `@capacitor/browser` et les URLs de redirection OAuth ont été inspectés dans `AuthService.ts:119-136`.

---

## 4. Conclusion & Synthèse des Constats

### Synthèse Globale

| Axe | Note Estimée | Points Forts Clés | Points de Vigilance Principaux |
|---|:---:|---|---|
| **Axe 3 — Sécurité & Auth** | **8.5 / 10** | Zéro secret en dur, bcrypt automatique dans converters, login caisse restreint, vérification admin contre email. | Session en clair dans `localStorage`, upload sans check MIME dans `useEmployeeCamera`, suppression catégorie sans confirm. |
| **Axe 4 — Performance & UI** | **8.8 / 10** | Correspondance routage 100%, lazy loading généralisé sur onglets et modales, fetch helper paginé par tranches de 500. | Désynchronisation UI vs raccourcis clavier F1-F5 en caisse, 4 composants avec balises `<img>` brutes, pagination clients à 20 au lieu de 50. |

---

### Tableau Détaillé des Anomalies Détectées

#### 🔴 Anomalies Critiques & Majeures

| # | Axe | Sévérité | Emplacement | Problème & Impact Métier | Solution Technique Recommandée |
|---|:---:|:---:|---|---|---|
| **A1** | Axe 3 | **MAJEUR** | `src/hooks/useAuthUser.tsx:217` & `src/App.tsx:90-91` | Session active persistée en clair dans `localStorage` au lieu de `sessionStorage`. Risque d'usurpation sur caisse partagée après fermeture du navigateur. | Remplacer `localStorage` par `sessionStorage.setItem('nexus_active_online_session', ...)` et mettre à jour la lecture dans `App.tsx:91`. |
| **A2** | Axe 4 | **MAJEUR** | `src/components/checkout/PaymentOrderSummary.tsx:416, 444, 470` ↔ `src/components/checkout/useCheckoutShortcuts.ts:31-60` | Incohérence critique entre les badges affichés (F2 = Carte, F4 = Valider/Imprimer) et les actions réelles du hook (F2 = Vider Panier, F4 = Nouvelle Session). Risque de perte de panier en caisse. | Harmoniser `useCheckoutShortcuts.ts` et `PaymentOrderSummary.tsx` : câbler F1 = Espèces, F2 = Carte, F4 = Valider & Imprimer, et déplacer le vidage panier sur `Ctrl+Delete`. |
| **A3** | Axe 3 | **MAJEUR** | `src/hooks/employees/useEmployeeCamera.ts:77-90` | Absence de vérification du type MIME (`file.type`) et de la taille (`file.size`) avant conversion en Base64 lors de l'upload de pièces d'identité d'employés. | Ajouter un garde-fou vérifiant `ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']` et `file.size <= 5 * 1024 * 1024` avant d'instancier `FileReader`. |
| **A4** | Axe 3 | **MAJEUR** | `src/hooks/useCategoryBrand.ts:101-125` | La suppression d'une catégorie dans `handleDeleteCategory` est exécutée immédiatement sans `window.confirm()` ni modal, contrairement à `handleDeleteBrand` (L161). | Insérer `if (!window.confirm("Supprimer cette catégorie ?")) return;` avant `localDb.delete`. |
| **A5** | Axe 4 | **MAJEUR** | `src/components/Brands.tsx:130`, `src/components/BrandModal.tsx:112`, `src/components/label-printer/LabelSimulator.tsx:94, 240`, `src/components/expiry/ExpiryListView.tsx:109, 341` | Utilisation de `<img />` brutes au lieu de `<SafeImage />`. Pas de cache WebP IndexedDB ni de gestion de fallback en mode déconnecté. | Remplacer les balises `<img />` par `<SafeImage src={...} fallback={...} />`. |

#### 🟡 Anomalies Mineures

| # | Axe | Sévérité | Emplacement | Problème & Impact | Solution Technique Recommandée |
|---|:---:|:---:|---|---|---|
| **A6** | Axe 4 | **MINEUR** | `src/components/Customers.tsx:48` | `TABLE_PAGE_SIZE = 20` au lieu des 50 items/page requis par `GEMINI.md`. | Passer `TABLE_PAGE_SIZE = 50`. |
| **A7** | Axe 4 | **MINEUR** | `src/components/reports/stock/useStockHistoryLogic.ts:14`, `src/components/usePromotionsLogic.ts:23` | Pagination à 20 et 12 items/page au lieu de 50. | Aligner `pageSize = 50`. |
| **A8** | Axe 4 | **MINEUR** | `src/components/AddStaffModal.tsx:63, 79, 89`, `src/components/ExpirationModal.tsx:31`, `src/components/LowStockModal.tsx:21` | Manque de classes `dark:` sur les inputs et cartes de ces modales (flash clair en mode sombre). | Ajouter les classes Tailwind `dark:bg-zinc-800 dark:border-zinc-700 dark:text-white`. |
| **A9** | Axe 4 | **MINEUR** | `src/components/Checkout.tsx:542`, `src/components/BrandModal.tsx:79` | Boutons avec attribut `disabled` sans les classes complètes `disabled:opacity-50 disabled:cursor-not-allowed`. | Ajouter les styles d'inactivité requis par `GEMINI.md`. |
| **A10** | Axe 3 | **MINEUR** | `src/components/PinLockModal.tsx:50, 62` | Code PIN maître stocké directement dans `localStorage` sans passer par `getSecureItem`/`setSecureItem`. | Utiliser `getSecureItem` et `setSecureItem` de `src/lib/security.ts`. |
| **A11** | Axe 4 | **MINEUR** | `src/hooks/useDataFetching.ts:29-33` | Souscription globale non ciblée aux 5 stores Zustand au lieu d'utiliser `.getState()` pour les setters. | Remplacer par `useCoreStore.getState().setSettings`, etc. |

---

## 5. Verification Method (Méthode de Reproduction Indépendante)

1. **Vérification de la session en clair dans `localStorage` (A1)** :
   - Ouvrir l'application dans le navigateur, se connecter.
   - Ouvrir la console DevTools : `localStorage.getItem('nexus_active_online_session')`.
   - Constat : La chaîne JSON de session est présente en clair dans `localStorage`.

2. **Vérification du conflit de raccourcis clavier F2/F4 (A2)** :
   - Inspecter `src/components/checkout/PaymentOrderSummary.tsx:444` et constater le libellé `F2` sur le bouton Carte.
   - Inspecter `src/components/checkout/useCheckoutShortcuts.ts:36` et constater que `F2` déclenche `window.confirm("Voulez-vous vraiment vider le panier ?")`.

3. **Vérification de l'absence de vérification MIME dans `useEmployeeCamera.ts` (A3)** :
   - Inspecter les lignes 77 à 90 de `src/hooks/employees/useEmployeeCamera.ts`.
   - Constat : Aucun test sur `file.type` ni sur `file.size` avant `reader.readAsDataURL(file)`.

4. **Vérification de la suppression de catégorie sans confirmation (A4)** :
   - Inspecter `src/hooks/useCategoryBrand.ts:101-125`.
   - Constat : Absence de `confirm()` ou modal sur `handleDeleteCategory`.

5. **Vérification des balises `<img />` brutes (A5)** :
   - Exécuter : `git grep -n "<img" src/components/Brands.tsx src/components/BrandModal.tsx src/components/expiry/ExpiryListView.tsx`.
   - Constat : Balises HTML `<img>` présentes au lieu de `<SafeImage />`.

6. **Validation TypeScript et Tests Vitest** :
   - Compiler : `npx tsc --noEmit`
   - Tester : `npm test`
   - Bundle : `npm run build`
