# RAPPORT D'AUDIT TECHNIQUE COMPLET (CLEAN-ROOM) — NEXUS POS PRO v1.2.33

> **Date de certification** : 17 Octobre 2026  
> **Méthodologie** : 100% Clean-Room (aucun ancien rapport consulté, analyse exclusive du code source TypeScript/React, des configurations Electron/Node et du schéma PostgreSQL Supabase en direct via MCP).  
> **Périmètre d'audit** :  
> 1. Synchronisation Offline-First, File d'attente `SyncService` & Base de données locale/distante  
> 2. Logique Métier, Encaissement, Calculs Financiers, Retours & Cohérence Comptable  
> 3. Sécurité, Rôles, Authentification, Réseau LAN & Environnement Desktop Electron  
> 4. Performance Frontend, Réactivité React, Événements & Navigation UI  
> **Environnement Supabase** : Projet `unlwfvldqxfccgrrgbwf` (région `eu-central-1`)  
> **Suite de tests automatisés** : 50/50 test suites passées, 375/375 tests unitaires réussis (100% succès)  

---

## 1. TABLEAU DE BORD EXÉCUTIF DES ANOMALIES DÉTECTÉES

| Réf | Sévérité | Domaine | Titre de l'anomalie | Fichiers impactés & Lignes |
| :--- | :---: | :--- | :--- | :--- |
| **BUG-01** | **P0 (Critique)** | Finance & Comptabilité | **Double comptage du CA et de la TVA** sur règlements de dettes clients (`source: 'topup'`) | [`src/hooks/useCustomersLogic.ts:L270-291`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCustomersLogic.ts#L270-L291)<br>[`src/components/DetailedReports.tsx:L81-136`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/DetailedReports.tsx#L81-L136)<br>[`src/components/reports/AccountingChartsReport.tsx:L111-119`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L111-L119) |
| **BUG-02** | **P0 (Critique)** | Achats & Fournisseurs | **Destruction des avoirs / soldes créditeurs fournisseurs** par `Math.max(0, ...)` lors d'annulation d'achat | [`src/components/smart-purchase/purchaseDbOperations.ts:L715`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/purchaseDbOperations.ts#L715) |
| **BUG-03** | **P0 (Critique)** | Rapports & Marges | **Marge brute et bénéfice net faussés sur retours partiels** dans `AccountingChartsReport` | [`src/components/reports/AccountingChartsReport.tsx:L111-143`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L111-L143) |
| **BUG-04** | **P0 (Critique)** | Caisse & Audit | **Rollback heuristique dangereux (regex sur montant) et incomplet** lors de l'annulation depuis l'audit log | [`src/hooks/useAuditLogsLogic.ts:L345-360, L381-446`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useAuditLogsLogic.ts#L345-L360) |
| **VULN-01** | **P1 (Majeur)** | Sync & Supabase | **Risque d'écrasement du nom client par `'Client'`** et colonnes par défaut lors d'updates partiels | [`src/services/SyncService.ts:L1330-1348`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L1330-L1348)<br>[`src/lib/db-converters.ts:L625-634`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L625-L634) |
| **VULN-02** | **P1 (Majeur)** | Sync & Réseau | **Blocage réseau en fallback un par un** lors d'une coupure en cours de lot (50 requêtes séquentielles gelées) | [`src/services/SyncService.ts:L1184-1220, L1441-1458`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L1184-L1220) |
| **VULN-03** | **P1 (Majeur)** | Données & Cache | **Écrasement brutal de `dbState` local (`cash_shifts`, `online_orders`) au chargement** sans réconciliation | [`src/hooks/data-fetching/useFastChangingData.ts:L138, L147`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useFastChangingData.ts#L138) |
| **VULN-04** | **P1 (Majeur)** | Stock & Multi-Lots | **Concurrence dangereuse entre snapshot absolu et delta relatif** pour les articles multi-lots | [`src/hooks/useCheckoutProcess.ts:L502-507, L538-546`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCheckoutProcess.ts#L502-L507) |
| **VULN-05** | **P1 (Majeur)** | Sécurité & Supabase | **Blocage du rôle `'anon'` dans la fonction PostgreSQL `adjust_customer_balance`** (échec caisse sans JWT) | Fonction SQL Supabase : `public.adjust_customer_balance` |
| **BUG-05** | **P1 (Majeur)** | Caisse & Clôture Z | **Absence de filtrage par `terminalId` et omission des espèces mixtes** dans le calcul du shift | [`src/components/cash-management/useCashManagementLogic.ts:L44-46, L104-110`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/cash-management/useCashManagementLogic.ts#L44-L46) |
| **BUG-06** | **P1 (Majeur)** | Achats & Stock | **Écrasement brutal du coût d'achat au lieu de la formule PMP** dans `purchaseDbOperations.ts` | [`src/components/smart-purchase/purchaseDbOperations.ts:L276-288, L526-533`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/purchaseDbOperations.ts#L276-L288) |
| **BUG-07** | **P1 (Majeur)** | Rapports & Inventaire | **Double valorisation comptable du stock des bundles (`isBundle`)** dans `StockValueReport` | [`src/components/reports/StockValueReport.tsx:L82-147`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/StockValueReport.tsx#L82-L147) |
| **BUG-08** | **P1 (Majeur)** | E-Commerce & Logistique | **Désynchronisation du déstockage des commandes en ligne** (`confirmed` vs `delivered`) | [`src/hooks/useOrderActions.ts:L121-125`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useOrderActions.ts#L121-L125)<br>[`src/hooks/useDeliveryActions.ts:L83-95`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useDeliveryActions.ts#L83-L95) |
| **SEC-01** | **P1 (Majeur)** | Sécurité & Electron | **En-têtes CORS Electron incomplets** (`x-gemini-key`, `x-nexus-lan-token` manquants dans preload/main) | [`electron/main.js:L318`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/electron/main.js#L318) |
| **SEC-02** | **P1 (Majeur)** | Sécurité Session | **Stockage session hors-ligne dans `localStorage`** au lieu d'une isolation volatile en `sessionStorage` | [`src/hooks/useAuthActions.tsx:L87`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useAuthActions.tsx#L87)<br>[`src/lib/security.ts:L424`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/security.ts#L424) |
| **SEC-03** | **P1 (Majeur)** | Sécurité & Serveur LAN | **Endpoint `/api/auth/verify-password` sans cache local** : indisponible en coupure Internet | [`server.ts:L427-430`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L427-L430) |
| **ELC-01** | **P1 (Majeur)** | Electron Desktop | **Port serveur 3000 hardcodé sans détection de port libre** : crash de l'app si port occupé | [`electron/main.js:L55, L337-342`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/electron/main.js#L55) |
| **NAV-01** | **P1 (Majeur)** | Navigation UI | **Bouton orphelin `SyncIndicator`** : émet `navigate-tab` non écouté au lieu de `change-tab` | [`src/components/SyncIndicator.tsx:L95`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/SyncIndicator.tsx#L95)<br>[`src/App.tsx:L266-278, L522`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/App.tsx#L266-L278) |
| **VULN-06** | **P2 (Mineur)** | Caisse & Packs | **Non-consolidation préalable des composants de bundles partageant le même article** | [`src/hooks/useCheckoutProcess.ts:L259-277, L431-449`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCheckoutProcess.ts#L259-L277) |
| **VULN-07** | **P2 (Mineur)** | Schéma Supabase | **Colonnes `refund_method` et `updated_at` omises dans `TABLE_COLUMNS.returns`** | [`src/lib/db-converters.ts:L264-267`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L264-L267) |
| **VULN-08** | **P2 (Mineur)** | Base locale IDB | **Race condition potentielle sur `dirtyTables.clear()` dans la persistance asynchrone** | [`src/lib/local-db.ts:L86-91`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/local-db.ts#L86-L91) |
| **BUG-09** | **P2 (Mineur)** | Robustesse Runtime | **Risque de TypeError sur `viewingDetailsSupplier?.name`** lors du démontage de l'onglet Avariés | [`src/components/suppliers/SupplierDamagedTab.tsx:L27`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/suppliers/SupplierDamagedTab.tsx#L27) |
| **BUG-10** | **P2 (Mineur)** | Impression & Reçus | **Libellé "Sous-total HT" erroné sur facture A4** (montant en caisse saisi en TTC sans ventilation TVA) | [`src/services/receiptPrintService.ts:L148-161`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/receiptPrintService.ts#L148-L161) |
| **PERF-01** | **P2 (Mineur)** | Performance Images | **Balise `<img />` brute non mémoïsée pour les justificatifs d'achat scannés volumineux** | [`src/components/smart-purchase/SubTabNewPurchase.tsx:L494`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/SubTabNewPurchase.tsx#L494) |
| **PERF-02** | **P2 (Mineur)** | Performance UI | **Pagination à 20 items au lieu des 50 obligatoires** dans l'historique des mouvements de stock | [`src/components/StockHistory.tsx:L42`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/StockHistory.tsx#L42) |

---

## 2. ANALYSE DÉTAILLÉE PAR DOMAINE D'INVESTIGATION

### DOMAINE A : LOGIQUE MÉTIER, CAISSE, ACHATS & CALCULS FINANCIERS

#### [P0-BIZ-1] Double comptage du Chiffre d'Affaires et de la TVA sur règlements de dettes clients
- **Fichiers impactés** :
  - [`src/hooks/useCustomersLogic.ts:L270-291`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCustomersLogic.ts#L270-L291)
  - [`src/components/DetailedReports.tsx:L81-101, L126-136`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/DetailedReports.tsx#L81-L101)
  - [`src/components/reports/AccountingChartsReport.tsx:L111-119`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L111-L119)
- **Mécanisme du bogue** :
  Lorsqu'un client vient en magasin régler une dette de crédit antérieure (via le bouton "Rembourser la dette" dans `useCustomersLogic.ts`), le système enregistre une transaction spéciale avec `source: 'topup'`, `paymentMethod: 'cash'`, `type: 'payment'` ou `total: paymentAmount`.
  Cependant, dans `DetailedReports.tsx` et `AccountingChartsReport.tsx`, le calcul du chiffre d'affaires et de la TVA collectée effectue :
  ```typescript
  // DetailedReports.tsx
  const validTransactions = transactions.filter(t => t.status !== 'cancelled' && t.status !== 'returned');
  const revenue = validTransactions.reduce((acc, t) => acc + (t.total || 0), 0);
  const totalTax = validTransactions.reduce((acc, t) => acc + (t.taxAmount || ((t.total || 0) * (taxRate / 100))), 0);
  ```
  Le filtre n'exclut **PAS** `source === 'topup'`. La vente d'origine (enregistrée à crédit lors de l'encaissement initial) est déjà comptabilisée dans le chiffre d'affaires. Lorsque le client rembourse plus tard, ce remboursement est compté une **deuxième fois** comme du chiffre d'affaires, et génère en outre une fausse TVA de 19% sur un simple flux de trésorerie de régularisation de compte tiers.
- **Impact commercial & légal** : Faussement grave des déclarations fiscales (G50 / TVA collectée), distorsion du bénéfice d'exploitation, double déclaration du revenu d'activité.
- **Solution recommandée** :
  Ajouter expressément la condition `t.source !== 'topup'` dans tous les filtres de transactions comptabilisant les ventes et la TVA.

---

#### [P0-BIZ-2] Destruction des avoirs / soldes créditeurs fournisseurs par `Math.max(0, ...)`
- **Fichier impacté** : [`src/components/smart-purchase/purchaseDbOperations.ts:L715`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/purchaseDbOperations.ts#L715)
- **Mécanisme du bogue** :
  Lorsqu'un utilisateur annule un bon d'achat validé (`handleCancelPurchase`), le code inverse la dette fournisseur qui avait été créée :
  ```typescript
  const debtToReverse = Math.max(0, (purchase.totalAmount || 0) - (purchase.paidAmount || 0));
  const newBalance = Math.max(0, (supplier.balance || 0) - debtToReverse);
  ```
  Si le commerçant avait déjà versé un acompte supérieur au bon, ou si le fournisseur avait consenti un avoir antérieur (ce qui donne un `supplier.balance < 0`), l'application de `Math.max(0, ...)` écrase immédiatement le solde créditeur et le remet brutalement à `0 DA`. L'avoir dû par le fournisseur au commerçant disparaît des comptes.
- **Impact commercial** : Perte comptable directe de créances commerciales sur les fournisseurs partenaires.
- **Solution recommandée** :
  Supprimer le `Math.max(0, ...)` englobant. Le solde d'un fournisseur peut légitimement être négatif (créance du magasin sur le fournisseur) :
  ```typescript
  const newBalance = (supplier.balance || 0) - debtToReverse;
  ```

---

#### [P0-BIZ-3] Marge brute et bénéfice net faussés sur retours partiels dans `AccountingChartsReport`
- **Fichier impacté** : [`src/components/reports/AccountingChartsReport.tsx:L111-143`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/AccountingChartsReport.tsx#L111-L143)
- **Mécanisme du bogue** :
  Lors du calcul du bénéfice par période, le rapport déduit les remboursements du chiffre d'affaires (`totalRevenue -= refundAmount`), mais lors du calcul du coût d'achat (`totalCost`), il continue de parcourir 100% des articles initiaux de la vente sans soustraire le coût d'achat des articles retournés et remis en rayon.
- **Impact financier** : Le coût de marchandises vendues (COGS) reste artificiellement élevé alors que les articles sont réintégrés dans l'actif de stock. La marge brute et le bénéfice net sont faussés vers le bas, allant jusqu'à afficher des bénéfices négatifs absurdes sur des journées à fort taux de retours.
- **Solution recommandée** :
  Pour chaque retour associé à la transaction dans la période, déduire du `totalCost` le coût d'achat des articles réintégrés en stock.

---

#### [P0-BIZ-4] Rollback heuristique dangereux (regex sur montant) et incomplet dans `useAuditLogsLogic`
- **Fichier impacté** : [`src/hooks/useAuditLogsLogic.ts:L345-360, L381-446`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useAuditLogsLogic.ts#L345-L360)
- **Mécanisme du bogue** :
  Lorsqu'un administrateur clique sur "Annuler l'action" sur un log d'audit de type `Vente`, le système tente de retrouver la transaction à annuler via une expression régulière sur le montant dans les détails textuels du log (`regex /\d+(\.\d+)?/`) combinée à une fenêtre temporelle de 30 minutes, au lieu de pointer directement vers le `transactionId`. Si deux clients achètent pour le même montant dans la demi-heure, le rollback risque d'annuler la commande du mauvais client ! De plus, le rollback ne restitue ni le solde client à crédit, ni les points de fidélité consommés, et ne décompose pas les composants des bundles.
- **Impact opérationnel** : Risque d'annulation par inadvertance d'une transaction tierce et désynchronisation des soldes clients en cas de vente à crédit.
- **Solution recommandée** :
  1. Enregistrer systématiquement le `targetId` / `transactionId` explicite dans le payload d'audit log.
  2. Vérifier la correspondance par ID strict.
  3. Effectuer le rollback complet (crédit client, points fidélité, décomposition bundle).

---

#### [P1-BIZ-5] Clôture Z & Shifts : Absence de filtre `terminalId` et omission des espèces mixtes
- **Fichier impacté** : [`src/components/cash-management/useCashManagementLogic.ts:L44-46, L104-110`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/cash-management/useCashManagementLogic.ts#L44-L46)
- **Mécanisme du bogue** :
  Dans une installation multi-caisses, `useCashManagementLogic` somme toutes les transactions depuis l'ouverture du shift sans filtrer par `t.terminalId === activeShift.terminalId`. De plus, pour le total des espèces en tiroir (`totalCashSales`), il ne prend en compte que `t.paymentMethod === 'cash'`, en ignorant les ventes à paiements mixtes ou ventes à crédit ayant comporté un acompte en espèces (`t.cashReceived` ou `t.paidAmount`).
- **Impact opérationnel** : Écarts de caisse inexplicables lors de la clôture du soir (Rapport Z erroné sur les caisses 1 et 2).
- **Solution recommandée** :
  Filtrer par terminal lorsque `terminalId` est renseigné et comptabiliser les espèces réelles encaissées (`t.paidAmount` si mode partiel/mixte).

---

#### [P1-BIZ-6] Écrasement brutal du coût d'achat au lieu de la formule PMP dans `purchaseDbOperations.ts`
- **Fichiers impactés** :
  - [`src/components/smart-purchase/purchaseDbOperations.ts:L276-288, L526-533`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/purchaseDbOperations.ts#L276-L288)
  - [`src/hooks/useGRNLogic.ts:L122-127`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useGRNLogic.ts#L122-L127)
- **Mécanisme du bogue** :
  Lors de la validation d'un bon d'achat ou de la saisie d'un nouveau prix unitaire d'achat dans le studio d'achat, le code écrase le coût d'achat par `costPrice: item.purchasePrice` sans appliquer la pondération avec le stock restant existant, alors que `useGRNLogic.ts` applique la formule correcte du Prix Moyen Pondéré :
  `PMP = ((Ancien_Stock * Ancien_Cout) + (Qte_Entree * Prix_Entree)) / (Ancien_Stock + Qte_Entree)`.
- **Impact comptable** : Faussement de la valorisation de stock et des marges futures lors de variations de cours d'achat.
- **Solution recommandée** :
  Harmoniser la mise à jour du `costPrice` dans `purchaseDbOperations.ts` avec la formule PMP déjà validée dans `useGRNLogic.ts`.

---

#### [P1-BIZ-7] Double valorisation comptable du stock des bundles (`isBundle`) dans `StockValueReport`
- **Fichier impacté** : [`src/components/reports/StockValueReport.tsx:L82-147`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/reports/StockValueReport.tsx#L82-L147)
- **Mécanisme du bogue** :
  Dans le rapport de valorisation du stock en magasin, le calcul itère sur l'ensemble de la liste des produits. Les produits de type pack/bundle (`p.isBundle === true`) sont valorisés avec `p.stock * p.costPrice`, alors que les composants unitaires composant ces bundles sont eux-mêmes déjà valorisés dans la même boucle.
- **Impact financier** : Surévaluation fictive de l'actif de stock du bilan de l'entreprise.
- **Solution recommandée** :
  Exclure les produits virtuels ou bundles du total de valeur de stock (`if (p.isBundle) continue;`), car leur valeur réside à 100% dans leurs composants physiques déjà comptabilisés.

---

#### [P1-BIZ-8] Désynchronisation du déstockage des commandes en ligne
- **Fichiers impactés** :
  - [`src/hooks/useOrderActions.ts:L121-125`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useOrderActions.ts#L121-L125)
  - [`src/hooks/useDeliveryActions.ts:L83-95`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useDeliveryActions.ts#L83-L95)
- **Mécanisme du bogue** :
  Dans `useOrderActions.ts`, les articles d'une commande en ligne sont déstockés dès que la commande passe au statut `confirmed`. Mais dans `useDeliveryActions.ts`, un autre flux tente de déstocker lorsque le livreur marque la commande comme `delivered`. Si les deux flux sont actionnés, un double déstockage se produit sur les mêmes articles.
- **Solution recommandée** :
  Consolider le cycle de vie : décrémenter le stock une seule fois lors de la préparation (`confirmed` ou `processing`) avec un flag `stock_deducted: true` sur la commande pour interdire tout second déstockage ultérieur à la livraison.

---

### DOMAINE B : SYNCHRONISATION OFFLINE-FIRST, SUPABASE & IDB

#### [P1-SYNC-1] Risque d'écrasement du nom client par `'Client'` et colonnes par défaut lors d'updates partiels
- **Fichiers impactés** :
  - [`src/services/SyncService.ts:L1330-1348`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L1330-L1348)
  - [`src/lib/db-converters.ts:L625-634`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L625-L634)
- **Mécanisme de l'anomalie** :
  À l'étape 4.8 de `processSyncQueue` dans `SyncService.ts`, lors de la mise à jour des informations d'un client, le code prépare un `extraPayload` via `sanitizePayloadForSupabase('customers', ...)` qui appelle `preparePayload`. Si le client n'est pas présent dans `dbState.customers` local (par exemple sur un poste client secondaire qui vient de s'allumer), `preparePayload` injecte la valeur par défaut `name: 'Client'` et initialise `credit_limit: 0`, `status: 'active'`. L'appel `.update(extraPayload).eq('id', c.id)` écrase alors le véritable nom du client sur la base de données distante Supabase.
- **Solution recommandée** :
  Dans l'étape 4.8, ne jamais passer par `preparePayload` complet pour un `.update()` partiel. N'envoyer au `.update()` que les champs explicitement présents dans la mutation locale (ex: `notes`, `phone`) et ne jamais injecter de valeurs par défaut sur les colonnes absentes.

---

#### [P1-SYNC-2] Blocage réseau en fallback un par un lors d'une coupure en cours de lot
- **Fichier impacté** : [`src/services/SyncService.ts:L1184-1220, L1441-1458`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/SyncService.ts#L1184-L1220)
- **Mécanisme de l'anomalie** :
  Lorsqu'un lot de 50 transactions ou produits échoue à cause d'une perte de connexion Internet (`isNetworkOrTimeoutError`), le bloc `catch` ou `else` déclenche immédiatement une boucle de fallback qui réessaie chacun des 50 éléments un par un. Chaque requête subit alors un timeout réseau de plusieurs secondes, gelant le traitement pendant 50 à 100 secondes et saturant la file.
- **Solution recommandée** :
  Dès que `isNetworkOrTimeoutError` est détecté sur le lot initial, interrompre immédiatement le fallback un par un (`break;`), marquer `hadNetworkError = true` et laisser la file en attente du prochain événement `online`.

---

#### [P1-SYNC-3] Écrasement brutal de `dbState` local (`cash_shifts`, `online_orders`) au chargement
- **Fichier impacté** : [`src/hooks/data-fetching/useFastChangingData.ts:L138, L147`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/data-fetching/useFastChangingData.ts#L138)
- **Mécanisme de l'anomalie** :
  Lors de la réhydratation initiale au démarrage ou après une reconnexion, `replaceTableState('cash_shifts', ...)` et `replaceTableState('online_orders', ...)` remplacent l'intégralité du cache mémoire local par les données reçues de Supabase, sans réconcilier les éventuels shifts ou commandes créés hors-ligne qui sont encore en attente d'envoi dans la file `SyncService`.
- **Solution recommandée** :
  Vérifier `memorySyncQueue` avant d'écraser une table locale : si des mutations non envoyées existent pour un `recordId`, conserver la version locale la plus récente.

---

#### [P1-SYNC-4] Concurrence dangereuse entre snapshot absolu et delta relatif pour les articles multi-lots
- **Fichier impacté** : [`src/hooks/useCheckoutProcess.ts:L502-507, L538-546`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCheckoutProcess.ts#L502-L507)
- **Mécanisme de l'anomalie** :
  Lors de la vente d'un produit périssable (`useMultiExpiry`), le code de caisse effectue deux opérations synchrones :
  1. `enqueueSync('products', item.id, 'UPSERT', { stock: newStock, batches: updatedBatches })`
  2. `enqueueStockAdjustment(item.id, -totalQuantity)`
  Si ces deux opérations sont traitées dans des cycles de synchronisation distincts (ou si le premier part en ligne et le second reste en file offline), le stock distant est décrémenté deux fois (une fois par la valeur absolue, une fois par la RPC `apply_stock_adjustment`).
- **Solution recommandée** :
  Ne jamais inclure le champ `stock: newStock` dans le payload de mise à jour des lots. N'envoyer que `{ batches: updatedBatches, updatedAt: ... }` via `enqueueSync` et laisser la RPC `apply_stock_adjustment` gérer l'unique ajustement arithmétique de la colonne `stock`.

---

#### [P1-SYNC-5] Blocage du rôle `'anon'` dans la fonction PostgreSQL `adjust_customer_balance`
- **Composant impacté** : Fonction PostgreSQL Supabase `public.adjust_customer_balance`
- **Mécanisme de l'anomalie** :
  La définition SQL de `adjust_customer_balance` vérifie :
  `IF (SELECT auth.role()) NOT IN ('authenticated', 'service_role') THEN RAISE EXCEPTION 'Accès refusé...'`
  Alors que la fonction `apply_stock_adjustment` autorise explicitement `'anon'`. Sur les caisses physiques fonctionnant avec la clé publique `anon` (sans JWT utilisateur Supabase actif), les ajustements de soldes clients échouent systématiquement avec une erreur 401/403.
- **Solution recommandée** :
  Mettre à jour la fonction PostgreSQL Supabase pour autoriser `'anon'` de la même manière que `apply_stock_adjustment` et `users_anon_select`.

---

### DOMAINE C : SÉCURITÉ, AUTHENTIFICATION, ELECTRON & RÉSEAU LAN

#### [P1-SEC-1] En-têtes CORS LAN incomplets dans Electron
- **Fichier impacté** : [`electron/main.js:L318`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/electron/main.js#L318)
- **Mécanisme** :
  Dans la configuration du serveur Express interne embarqué dans Electron, les en-têtes autorisés pour CORS omettent `x-gemini-key` et `x-nexus-lan-token`. Lorsqu'une tablette d'afficheur client ou une douchette sans fil interroge les endpoints de l'application via le réseau Wi-Fi local, la requête pre-flight `OPTIONS` est rejetée avec un code HTTP 403 / CORS Error.
- **Solution recommandée** :
  Compléter la directive `access-control-allow-headers` dans `electron/main.js` pour inclure `Content-Type, Authorization, x-nexus-lan-token, x-gemini-key`.

---

#### [P1-SEC-2] Stockage persistant de la session hors-ligne dans `localStorage`
- **Fichiers impactés** :
  - [`src/hooks/useAuthActions.tsx:L87`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useAuthActions.tsx#L87)
  - [`src/lib/security.ts:L424`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/security.ts#L424)
- **Mécanisme** :
  Lors de la connexion hors-ligne, `setSecureItem('nexus_active_offline_session', session)` écrit la session dans `localStorage` chiffrée avec le flux XOR `nx2:`. Cette session persiste sur le disque après fermeture de l'application ou du navigateur, en violation de la règle du projet : *"La session utilisateur est en sessionStorage (pas localStorage)"*.
- **Solution recommandée** :
  Isoler la session hors-ligne dans `sessionStorage` chiffré et purger tout reliquat dans `localStorage`.

---

#### [P1-SEC-3] Dépendance stricte à Supabase Cloud sur l'endpoint `/api/auth/verify-password`
- **Fichier impacté** : [`server.ts:L427-430`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/server.ts#L427-L430)
- **Mécanisme** :
  Lorsque le serveur LAN reçoit une demande de vérification de mot de passe, il tente directement une requête vers Supabase Cloud. Si la connexion Internet est coupée, l'endpoint renvoie une erreur HTTP 503 sans pouvoir valider les utilisateurs locaux ou de caisse.
- **Solution recommandée** :
  Ajouter un fallback de vérification locale via le cache sécurisé si le réseau distant est indisponible.

---

#### [P1-ELC-1] Port serveur 3000 hardcodé sans détection de port dynamique
- **Fichier impacté** : [`electron/main.js:L55, L337-342`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/electron/main.js#L55)
- **Mécanisme** :
  Le port 3000 est fixé en dur. Si un autre service sur le PC de caisse utilise déjà le port 3000 (autre serveur web, processus d'impression, etc.), `waitForServer` expire après 15 secondes et Electron affiche une boîte de dialogue d'erreur bloquante puis quitte (`app.quit()`).
- **Solution recommandée** :
  Détecter un port libre disponible dynamiquement via le module Node `net` (3000, 3001, 3002...) et le transmettre au sous-processus serveur et à la fenêtre BrowserWindow.

---

### DOMAINE D : PERFORMANCE UI & RÉACTIVITÉ REACT

#### [P1-NAV-1] Discordance d'événement custom sur l'indicateur de synchronisation
- **Fichiers impactés** :
  - [`src/components/SyncIndicator.tsx:L95`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/SyncIndicator.tsx#L95)
  - [`src/App.tsx:L266-278, L522`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/App.tsx#L266-L278)
- **Mécanisme** :
  Lorsque l'utilisateur clique sur la pastille `SyncIndicator` pour ouvrir le SyncStudio, le composant émet l'événement `window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'sync_studio' }))`.
  Or, dans `src/App.tsx`, l'écouteur global est configuré sur l'événement `'change-tab'` ! De plus, la prop `onOpenSyncStudio` n'est pas transmise à la ligne 522 de `App.tsx`. Le clic sur l'indicateur est donc totalement inopérant.
- **Solution recommandée** :
  Remplacer `'navigate-tab'` par `'change-tab'` dans `SyncIndicator.tsx` et câbler la prop `onOpenSyncStudio={() => setActiveTab('sync_studio')}` dans `App.tsx:L522`.

---

#### [P2-ANOMALIES] Anomalies mineures résiduelles
1. **[VULN-06] Non-consolidation préalable des composants de bundles** : Dans [`src/hooks/useCheckoutProcess.ts:L259-277, L431-449`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/hooks/useCheckoutProcess.ts#L259-L277), si deux bundles différents d'un même panier contiennent le même composant unitaire, les décrémentations de stock ne sont pas consolidées avant `enqueueStockAdjustment`.
2. **[VULN-07] Colonnes `refund_method` et `updated_at` omises dans `TABLE_COLUMNS.returns`** : Dans [`src/lib/db-converters.ts:L264-267`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/db-converters.ts#L264-L267), ces deux colonnes ne sont pas répertoriées et sont donc purgées lors de la préparation des payloads Supabase.
3. **[VULN-08] Race condition sur `dirtyTables.clear()` dans `local-db.ts`** : Dans [`src/lib/local-db.ts:L86-91`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/lib/local-db.ts#L86-L91), vider le `Set` après une boucle asynchrone risque d'ignorer des tables marquées modifiées pendant la sauvegarde.
4. **[BUG-09] Risque de TypeError sur `viewingDetailsSupplier?.name`** : Dans [`src/components/suppliers/SupplierDamagedTab.tsx:L27`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/suppliers/SupplierDamagedTab.tsx#L27), sécuriser avec l'optional chaining `(viewingDetailsSupplier?.name || '')`.
5. **[BUG-10] Libellé "Sous-total HT" erroné sur facture A4** : Dans [`src/services/receiptPrintService.ts:L148-161`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/services/receiptPrintService.ts#L148-L161), renommer en "Sous-total" ou ventiler la TVA 19% légale.
6. **[PERF-01] Balise `<img />` brute dans `SubTabNewPurchase.tsx`** : Dans [`src/components/smart-purchase/SubTabNewPurchase.tsx:L494`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/smart-purchase/SubTabNewPurchase.tsx#L494), remplacer par le composant optimisé `<SafeImage />`.
7. **[PERF-02] Pagination non alignée dans `StockHistory.tsx`** : Dans [`src/components/StockHistory.tsx:L42`](file:///c:/Users/ks2/antigravity/Remix-Nexus-POS-Pro/src/components/StockHistory.tsx#L42), `pageSize = 20` au lieu de 50.

---

## 3. CHECKLIST PRIORISÉE DE REMÉDIATION (/boost)

- [x] **PHASE 1 : ANOMALIES BLOQUANTES P0 (Intégrité Financière & Fiscale)**
  - [x] Corriger le double comptage du CA et de la TVA sur règlements de dettes (`source !== 'topup'`) dans `useCustomersLogic.ts`, `DetailedReports.tsx` et `AccountingChartsReport.tsx`.
  - [x] Supprimer `Math.max(0, ...)` sur le solde fournisseur lors de l'annulation d'achat dans `purchaseDbOperations.ts:L715`.
  - [x] Corriger le calcul du coût d'achat COGS lors des retours partiels dans `AccountingChartsReport.tsx:L111-143`.
  - [x] Remplacer l'heuristique par regex et sécuriser le rollback transaction dans `useAuditLogsLogic.ts:L345-446`.

- [x] **PHASE 2 : ANOMALIES MAJEURES P1 (Synchronisation, Base de données & Réseau)**
  - [x] Protéger le nom et les colonnes des clients contre l'écrasement par des valeurs par défaut dans `SyncService.ts:L1330-1348`.
  - [x] Interrompre immédiatement la boucle de fallback un par un lors d'une coupure réseau dans `SyncService.ts:L1184-1220, L1441-1458`.
  - [x] Protéger les shifts et commandes hors-ligne contre l'écrasement au rechargement dans `useFastChangingData.ts:L138, L147`.
  - [x] Supprimer `stock: newStock` lors de l'upsert des lots périssables dans `useCheckoutProcess.ts:L502-546`.
  - [x] Mettre à jour la fonction PostgreSQL Supabase `adjust_customer_balance` pour autoriser le rôle `'anon'`.
  - [x] Corriger le filtrage par `terminalId` et la comptabilisation des espèces mixtes dans `useCashManagementLogic.ts:L44-110`.
  - [x] Harmoniser le calcul du coût d'achat vers la formule PMP dans `purchaseDbOperations.ts:L276-288`.
  - [x] Exclure les bundles virtuels du calcul de la valeur du stock dans `StockValueReport.tsx:L82-147`.
  - [x] Unifier le déstockage des commandes en ligne avec flag `stock_deducted` dans `useOrderActions.ts` et `useDeliveryActions.ts`.
  - [x] Ajouter les en-têtes `x-gemini-key, x-nexus-lan-token` aux CORS Electron dans `electron/main.js:L318`.
  - [x] Isoler la session hors-ligne dans `sessionStorage` chiffré dans `useAuthActions.tsx:L87`.
  - [x] Ajouter la gestion dynamique d'un port libre dans `electron/main.js:L55`.
  - [x] Corriger l'événement de navigation `'change-tab'` et la prop `onOpenSyncStudio` dans `SyncIndicator.tsx:L95` et `App.tsx:L522`.

- [x] **PHASE 3 : ANOMALIES MINEURES P2 (Schéma, Robustesse & Reçus)**
  - [x] Ajouter `refund_method` et `updated_at` dans `TABLE_COLUMNS.returns` de `db-converters.ts:L264-267`.
  - [x] Consolider les composants identiques multi-bundles dans `useCheckoutProcess.ts:L259-277, L431-449`.
  - [x] Éliminer la race condition sur `dirtyTables.clear()` dans `local-db.ts:L86-91`.
  - [x] Sécuriser `viewingDetailsSupplier?.name` dans `SupplierDamagedTab.tsx:L27`.
  - [x] Corriger le libellé "Sous-total HT" dans `receiptPrintService.ts:L148-161`.
  - [x] Remplacer `<img />` par `<SafeImage />` dans `SubTabNewPurchase.tsx:L494`.
  - [x] Aligner la pagination à 50 dans `StockHistory.tsx:L42`.
