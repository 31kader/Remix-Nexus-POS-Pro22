# Exploration Progress — Axe 1 & Axe 2

Last visited: 2026-09-25T14:40:00Z
Status: SYNTHESIS_AND_HANDOFF

## Roadmap
- [x] Initialisation de l'environnement de travail et lecture des consignes (ORIGINAL_REQUEST, GEMINI, PROJECT)
- [x] Axe 2 : Audit de conformité des appels `localDb.insert` et `localDb.update` (stricte vérification des 2 arguments)
  - Identifié : appel à 3 arguments dans `src/hooks/suppliers/useSupplierPayments.ts:L101`
  - Identifié : appel sans ID 'settings' dans `src/services/backupRestoreService.ts:L120`
  - Identifié : utilisation de `insert` au lieu de `update` pour records existants dans `src/components/useReturnModalLogic.ts:L165,L177`
- [x] Axe 2 : Audit de `src/lib/db-converters.ts` (`TABLE_COLUMNS`, `TABLE_NAME_MAPPINGS`, `preparePayload`)
  - Identifié : colonne `credit_limit` manquante dans `TABLE_COLUMNS.customers`
  - Identifié : colonne `notes` manquante dans `TABLE_COLUMNS.transactions`
- [x] Axe 2 : Audit des upserts partiels (préservation des champs NOT NULL)
  - Analyse approfondie de `preparePayload` et de `updateLocalState` dans `local-db.ts`
- [x] Axe 2 : Audit de résilience `SyncService.ts`, `supabaseFetchHelper.ts` (limits >= 500) et `SyncStudio.tsx`
  - Identifié : requête non paginée et sans limit dans `src/components/useOrdersLogic.tsx:L151-155`
  - Identifié : limits à 100 sans ordre descendant dans `src/hooks/data-fetching/useSupplierAndCustomerData.ts:L43,L116`
- [x] Axe 1 : Audit du panier (`useCartStore.ts`, `useCheckoutCalculations.ts`, `PaymentOrderSummary.tsx`), TVA 19%, devise DZD/DA, arrondis, remises
  - Identifié : omission de `globalDiscount` dans les dépendances de `useMemo` de `useCheckoutCalculations.ts:L137-146`
  - Identifié : fallback à 0% de TVA dans `useProductFormLogic.tsx:42,185`, `useProductImport.ts:185`, `QuickAddProductModal.tsx:103`
  - Identifié : calcul erroné de TVA sur TTC dans `DetailedReports.tsx:73`
  - Identifié : libellé erroné "Sous-total HT" dans `receiptPrintService.ts:L125`
- [x] Axe 1 : Audit des retours clients (points fidélité, recalcul CA, restock)
  - Identifié : `totalRevenue` dans `DetailedReports.tsx:91` ignore `partially_returned`
  - Identifié : non-mise à jour du store `usePeopleStore` après déduction des points dans `useReturnModalLogic.ts`
- [x] Axe 1 : Audit des dettes clients (limites de crédit, remboursements)
  - Identifié : blocage des ventes à crédit en caisse par `(selectedCustomer.balance || 0) < total` dans `useCheckoutProcess.ts:86`
  - Identifié : faute de frappe et incréments inadaptés dans `CustomerFinancialModal.tsx:140`
- [x] Axe 1 : Audit gestion des commandes (`Orders`), achats intelligents (`SmartPurchase`), clôture caisse (`CashManagement.tsx`)
  - Identifié (CRITIQUE) : bug de comparaison de date `YYYY-MM-DD` vs ISO dans `useCashManagementLogic.ts:38-40` ignorant toutes les dépenses du jour
  - Identifié : absence de déstockage lors de la livraison de commande dans `useOrderActions.ts:229-248`
  - Identifié : absence d'`enqueueStockAdjustment` dans les achats directs `purchaseDbOperations.ts:223-248`
- [ ] Rédaction du rapport complet `handoff.md` et notification orchestrateur
