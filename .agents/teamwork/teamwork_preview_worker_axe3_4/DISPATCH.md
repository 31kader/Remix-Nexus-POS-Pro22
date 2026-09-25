## 2026-09-25T13:48:07Z
Vous êtes le Travailleur 2 (teamwork_preview_worker) pour la remédiation de Nexus POS Pro v1.2.14.

Votre répertoire de travail dédié est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_worker_axe3_4`
Le fichier de demande originale obligatoire est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\ORIGINAL_REQUEST.md` (vous DEVEZ le lire impérativement).
Le fichier de règles du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\GEMINI.md` (vous DEVEZ le lire impérativement).
Le fichier de cadrage du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\PROJECT.md`.
Le rapport d'exploration détaillé à corriger est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_explorer_axe3_4\handoff.md`.

MANDATORY INTEGRITY WARNING :
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Périmètre exclusif de vos fichiers modifiables (Write Ownership strict) :
- `src/hooks/useAuthUser.tsx`
- `src/App.tsx`
- `src/components/checkout/PaymentOrderSummary.tsx`
- `src/components/checkout/useCheckoutShortcuts.ts`
- `src/hooks/employees/useEmployeeCamera.ts`
- `src/hooks/useCategoryBrand.ts`
- `src/components/Brands.tsx`
- `src/components/BrandModal.tsx`
- `src/components/label-printer/LabelSimulator.tsx`
- `src/components/PinLockModal.tsx`
- `src/components/Customers.tsx`

Tâches à exécuter :
1. **[M9] Session active en `sessionStorage` (`src/hooks/useAuthUser.tsx` & `src/App.tsx`)** :
   - Remplacer `localStorage.setItem('nexus_active_online_session', ...)` par `sessionStorage.setItem('nexus_active_online_session', ...)` dans `src/hooks/useAuthUser.tsx`.
   - Dans `src/App.tsx`, lire la session depuis `sessionStorage` (avec repli gracieux et nettoyage éventuel de l'ancien `localStorage`).
2. **[M10] Raccourcis clavier Caisse F1-F4 (`PaymentOrderSummary.tsx` & `useCheckoutShortcuts.ts`)** :
   Harmoniser parfaitement l'interface visuelle et le hook d'écoute :
   - F1 : Espèces / Valider
   - F2 : Carte / TPE
   - F4 : Valider & Imprimer
   - Déplacer la purge du panier (`clearCart()`) sur une combinaison sécurisée (`Ctrl+Delete` ou confirmation explicite sans conflit avec F2).
3. **[M11] Validation MIME et taille uploads employés (`src/hooks/employees/useEmployeeCamera.ts`)** :
   Valider strictement que `file.type` fait partie des types images autorisés (`image/jpeg`, `image/png`, `image/webp`) et que `file.size <= 5 * 1024 * 1024` avant de lire en Base64.
4. **[M12] Confirmation destruction catégorie (`src/hooks/useCategoryBrand.ts`)** :
   Ajouter une confirmation explicite (`window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")`) dans `handleDeleteCategory` avant l'appel de suppression DB.
5. **[M13] Remplacement des `<img />` brutes par `<SafeImage />`** :
   Dans `src/components/Brands.tsx`, `src/components/BrandModal.tsx`, `src/components/label-printer/LabelSimulator.tsx`, remplacer les balises `<img />` brutes par le composant `<SafeImage />`.
6. **[A6 & A10] Correctifs complémentaires** :
   - `src/components/Customers.tsx` : passer `TABLE_PAGE_SIZE = 50`.
   - `src/components/PinLockModal.tsx` : utiliser `getSecureItem` et `setSecureItem` de `src/lib/security.ts` pour `nexus_pos_master_pin`.

Validation :
Exécuter `npx tsc --noEmit`, `npm test` et consigner les résultats dans votre `handoff.md`.
Quand vous avez terminé, envoyez un message au parent (orchestrateur).
