## 2026-09-25T13:48:06Z

Vous êtes le Travailleur 1 (teamwork_preview_worker) pour la remédiation de Nexus POS Pro v1.2.14.

Votre répertoire de travail dédié est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_worker_axe1_2`
Le fichier de demande originale obligatoire est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\ORIGINAL_REQUEST.md` (vous DEVEZ le lire impérativement).
Le fichier de règles du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\GEMINI.md` (vous DEVEZ le lire impérativement).
Le fichier de cadrage du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\PROJECT.md`.
Le rapport d'exploration détaillé à corriger est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_explorer_axe1_2\handoff.md`.

MANDATORY INTEGRITY WARNING :
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Périmètre exclusif de vos fichiers modifiables (Write Ownership strict) :
- `src/components/cash-management/useCashManagementLogic.ts`
- `src/hooks/suppliers/useSupplierPayments.ts`
- `src/lib/db-converters.ts`
- `src/hooks/useOrderActions.ts`
- `src/hooks/useDeliveryActions.ts`
- `src/hooks/useCheckoutProcess.ts`
- `src/hooks/useCheckoutCalculations.ts`
- `src/components/useOrdersLogic.tsx`
- `src/services/backupRestoreService.ts`
- `src/components/CustomerFinancialModal.tsx`

Tâches à exécuter :
1. **[C1] Clôture de caisse & Rapport Z (`src/components/cash-management/useCashManagementLogic.ts`)** :
   Corriger la comparaison de dates `shiftExpenses` pour que les dépenses du jour (formatées en `YYYY-MM-DD` ou ISO) soient correctement incluses dans la session en cours, et s'assurer que seules les dépenses en espèces (`paymentMethod === 'cash'`) impactent le tiroir-caisse attendu (`expectedCash`).
2. **[M1] Signature 2 arguments `localDb` (`src/hooks/suppliers/useSupplierPayments.ts:L101`)** :
   Remplacer `await localDb.update('suppliers', viewingDetailsSupplier.id, updatedSupplier)` par `await localDb.update(`suppliers/${viewingDetailsSupplier.id}`, updatedSupplier)`.
3. **[M2] Schéma Supabase complet (`src/lib/db-converters.ts`)** :
   - Ajouter `'credit_limit'` dans `TABLE_COLUMNS.customers` et dans `CONFLICT_MAPS.customers`.
   - Ajouter `'notes'` dans `TABLE_COLUMNS.transactions`.
4. **[M3] Déstockage commandes en ligne (`src/hooks/useOrderActions.ts` & `src/hooks/useDeliveryActions.ts`)** :
   Lors du passage au statut `'delivered'`, décrémenter le stock des articles vendus via `enqueueStockAdjustment` pour éviter les stocks fantômes.
5. **[M4] Autorisation du carnet de dettes au checkout (`src/hooks/useCheckoutProcess.ts`)** :
   Autoriser le paiement par solde client / dette (`balance`) jusqu'au plafond de crédit (`creditLimit`) sans bloquer les clients à solde 0 ou négatif autorisé.
6. **[M5] Dépendance `globalDiscount` (`src/hooks/useCheckoutCalculations.ts`)** :
   Ajouter `globalDiscount` dans le tableau de dépendances de `useMemo`.
7. **[M8] Limite de requête commandes (`src/components/useOrdersLogic.tsx`)** :
   Ajouter `.limit(500)` sur la requête Supabase de `online_orders`.
8. **[N2 & N3] Correctifs mineurs** :
   - `src/components/CustomerFinancialModal.tsx` : corriger la coquille `505` en coupures algériennes adaptées (`[500, 1000, 2000, 5000]`).
   - `src/services/backupRestoreService.ts` : corriger `'settings'` en `'settings/company'`.

Validation :
Exécuter `npx tsc --noEmit`, `npm test` et consigner les résultats dans votre `handoff.md`.
Quand vous avez terminé, envoyez un message au parent (orchestrateur).
