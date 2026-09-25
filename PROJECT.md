# Project: Nexus POS Pro v1.2.14 — Audit Technique & Fonctionnel 360° et Remédiation

## Architecture
- **Framework** : React 18 + Vite + TypeScript
- **Base de données Cloud** : Supabase (PostgreSQL, `unlwfvldqxfccgrrgbwf`, `eu-central-1`)
- **Stockage Local & Offline** : IndexedDB (`idb-keyval` via `LocalDatabase.ts`), synchronisation bidirectionnelle via `SyncService.ts`
- **Gestion d'état** : Zustand stores (`useAppStore`, `useAuthStore`, `useCartStore`, etc.)
- **Composants & UI** : Tailwind CSS, Lucide React, SafeImage, Dark Mode support
- **Mobile Packaging** : Capacitor (Android)

## Scope de l'Audit 360° (6 Axes)
| # | Axe d'Audit | Périmètre & Fichiers Clés | Statut Audit | Statut Remédiation |
|---|-------------|---------------------------|--------------|-------------------|
| 1 | **Logique Métier & Caisse (POS)** | `src/components/pos/`, `src/hooks/useCart.ts`, `src/components/orders/`, `src/components/purchases/`, `src/components/cash/`, TVA 19%, remises, retours clients, dettes, fidélité | DONE (8.5/10) | EN COURS (Worker 1) |
| 2 | **Synchronisation Offline-First & DB** | `src/services/SyncService.ts`, `src/services/LocalDatabase.ts`, `src/lib/db-converters.ts`, `src/services/supabaseFetchHelper.ts`, `src/components/sync/SyncStudio.tsx`, conformité 2 arguments localDb | DONE (8.5/10) | EN COURS (Worker 1) |
| 3 | **Sécurité & Authentification** | `src/components/auth/`, `src/lib/security.ts`, `src/config/ownerConfig.ts`, bcrypt, sessionStorage, validation MIME, absence de secrets codés en dur, contrôle des rôles | DONE (8.5/10) | EN COURS (Worker 2) |
| 4 | **Performance & Ergonomie UI** | Pagination (50 items), Zustand selectors, `React.lazy` + `Suspense`, `<SafeImage />`, Dark mode, correspondance `Sidebar.tsx` ↔ `TabRenderer.tsx`, raccourcis F1-F10 | DONE (8.8/10) | EN COURS (Worker 2) |
| 5 | **Fiabilité des Rapports & Impression** | `src/components/reports/` (`DetailedReports`, `ProfitsReport`, `GroupedSalesAndBasketsReport`, `LossesReport`, `StockValueReport`, `CashflowReport`), `src/services/*PrintService.ts` | DONE (7.0/10) | EN COURS (Worker 3) |
| 6 | **Qualité du Code & Couverture Tests** | `tests/`, gestion `null`/`undefined`/`NaN`, fuites listeners/timers, dette technique, vérification `npx tsc --noEmit`, `npm test` (Vitest), `npm run build` | DONE (7.5/10) | EN COURS (Worker 3) |

## Milestones
| # | Nom | Objectif | Dépendances | Statut |
|---|-----|----------|-------------|--------|
| M1 | Survey & Audit 360° | Explorer les 6 axes, consigner les constats vérifiés (`src/...:Lxx`), répertorier points forts et bugs (Critique/Majeur/Mineur) | Aucun | DONE |
| M2 | Planification des Correctifs | Sélectionner tous les bugs Critiques et Majeurs, définir les stratégies de remédiation sans régression et le découpage strict des fichiers | M1 | DONE |
| M3 | Remédiation des Bugs Critiques & Majeurs | Exécution des correctifs par 3 Workers dédiés aux fichiers disjoints | M2 | IN_PROGRESS |
| M4 | Vérification & Tests Non-Régression | Validation par 2 Reviewers indépendants & 2 Challengers (`tsc`, `npm test`, `npm run build`) | M3 | PLANNED |
| M5 | Contrôle d'Intégrité Forensique | Audit forensique anti-triche par Forensic Auditor (`teamwork_preview_auditor`) | M4 | PLANNED |
| M6 | Rapport Final Exhaustif | Rédaction de `AUDIT_360_RAPPORT_COMPLET.md` selon la structure R3 | M5 | PLANNED |

## Code Layout & Découpage Exclusif des Fichiers (Worker Ownership)

### Worker 1 (Axe 1 & Axe 2) :
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

### Worker 2 (Axe 3 & Axe 4) :
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

### Worker 3 (Axe 5 & Axe 6) :
- `src/components/expiry/ExpiryListView.tsx`
- `src/components/reports/profits/useProfitsReportLogic.ts`
- `src/components/DetailedReports.tsx`
- `src/services/receiptPrintService.ts`
- `src/components/reports/CashflowReport.tsx`
- `src/components/reports/GroupedSalesAndBasketsReport.tsx`
- `src/components/reports/LossesReport.tsx`
- `tests/reports-and-printing.test.ts`
