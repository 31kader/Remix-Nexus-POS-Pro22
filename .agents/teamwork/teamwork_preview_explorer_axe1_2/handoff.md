# Rapport d'Audit & Handoff — Axe 1 (Caisse & Logique Métier) & Axe 2 (Synchronisation Offline-First & Base de Données)

**Auteur** : Explorateur 1 (`teamwork_preview_explorer_axe1_2`)  
**Version Cible** : Nexus POS Pro v1.2.14  
**Date** : 25 Septembre 2026  
**Statut** : Investigation Complète (Hard Handoff)

---

## 1. Observation

L'exploration statique et dynamique approfondie du code source a couvert l'ensemble des modules désignés pour l'Axe 1 et l'Axe 2 dans `src/` :
- `src/components/pos/`, `src/store/useCartStore.ts`, `src/hooks/useCheckoutCalculations.ts`, `src/hooks/useCheckoutProcess.ts`, `src/components/checkout/PaymentOrderSummary.tsx`, `src/components/checkout/CustomerSelection.tsx`
- `src/components/useReturnModalLogic.ts`, `src/components/Returns.tsx`, `src/components/ReturnModal.tsx`
- `src/components/useCustomersLogic.tsx`, `src/components/CustomerFinancialModal.tsx`, `src/components/customers/CustomerDebtsLedger.tsx`
- `src/components/CashManagement.tsx`, `src/components/cash-management/useCashManagementLogic.ts`, `src/components/Expenses.tsx`
- `src/components/Orders.tsx`, `src/components/useOrdersLogic.tsx`, `src/hooks/useOrderActions.ts`, `src/hooks/useDeliveryActions.ts`
- `src/components/smart-purchase/purchaseDbOperations.ts`, `src/components/SmartPurchase.tsx`
- `src/services/LocalDatabase.ts`, `src/lib/local-db.ts`, `src/services/SyncService.ts`, `src/lib/db-converters.ts`, `src/hooks/data-fetching/supabaseFetchHelper.ts`, `src/components/SyncStudio.tsx`, `src/services/backupRestoreService.ts`, `src/hooks/suppliers/useSupplierPayments.ts`

### 1.1 Observations Clés Identifiées

1. **Appel non conforme à 3 arguments sur `localDb.update`** :
   Dans `src/hooks/suppliers/useSupplierPayments.ts:L101` :
   ```typescript
   await localDb.update('suppliers', viewingDetailsSupplier.id, updatedSupplier);
   ```
   La signature requise par le projet (`GEMINI.md`) impose strictement 2 arguments : `(path, value)` avec `path = 'table/id'`.

2. **Insertion `localDb` avec chemin invalide sans identifiant** :
   Dans `src/services/backupRestoreService.ts:L120` :
   ```typescript
   await localDb.insert('settings', backup.settings);
   ```
   Tandis que la clé de stockage et les observateurs dans toute l'application utilisent `'settings/company'`.

3. **Utilisation erronée de `localDb.insert` pour des enregistrements existants** :
   Dans `src/components/useReturnModalLogic.ts:L165` et `L177` :
   ```typescript
   await localDb.insert(`customers/${customer.id}`, { ... });
   await localDb.insert(`transactions/${transaction.id}`, { ... });
   ```
   `localDb.insert` sur une transaction déclenche `offline-transaction-created` (`LocalDatabase.ts:L90`), faisant passer une mise à jour de statut de retour pour une nouvelle vente encaissée.

4. **Colonnes manquantes dans `TABLE_COLUMNS` (`src/lib/db-converters.ts`)** :
   - `TABLE_COLUMNS.customers` (L124-129) ne contient pas `credit_limit` (utilisé par `Customer.creditLimit` dans `src/types/customers.ts:L20` et `CustomersEditModal.tsx:L231`).
   - `TABLE_COLUMNS.transactions` (L130-138) ne contient pas `notes` (utilisé par `useOrderActions.ts:L243`, `L282`).
   Par conséquent, `preparePayload()` filtre et supprime ces champs lors de la synchronisation Supabase.

5. **Exclusion des dépenses du jour lors de la clôture de caisse** :
   Dans `src/components/cash-management/useCashManagementLogic.ts:L38-40` :
   ```typescript
   const shiftExpenses = (expenses || []).filter(e => 
     e && e.date && new Date(e.date) >= new Date(activeShift.openedAt)
   );
   ```
   Dans `src/components/Expenses.tsx:L33,L51` et `src/components/useCustomersLogic.tsx:L246`, `e.date` est formaté au format jour sans heure `YYYY-MM-DD` (ex: "2026-09-25"), ce qui correspond à `2026-09-25T00:00:00.000Z`. Si la caisse est ouverte le matin (ex: 08h30), `new Date("2026-09-25") >= new Date("2026-09-25T08:30:00.000Z")` retourne **`false`**.

6. **Absence de déstockage lors de la livraison des commandes en ligne** :
   Dans `src/hooks/useOrderActions.ts:L229-248` et `src/hooks/useDeliveryActions.ts:L78-112`, le passage au statut `'delivered'` génère une transaction de caisse mais ne déstocke aucun produit physique (`incrementStock` et `enqueueStockAdjustment` absents). Cependant, lors d'une annulation de commande (L136-146), le stock est augmenté (`qty > 0`), provoquant une désynchronisation positive des stocks.

7. **Blocage des ventes à crédit (carnet de dette) au point de vente** :
   Dans `src/hooks/useCheckoutProcess.ts:L86-89` :
   ```typescript
   if (method === 'balance') {
     if (!selectedCustomer) { ... }
     if (total > 0 && (selectedCustomer.balance || 0) < total) {
       toast.error("Solde insuffisant.");
       return;
     }
   }
   ```
   Si un client achète à crédit avec une dette autorisée (`creditLimit`), l'encaissement est bloqué car le code exige un solde créditeur préalable supérieur ou égal au panier.

8. **Omission de `globalDiscount` dans les dépendances de `useMemo`** :
   Dans `src/hooks/useCheckoutCalculations.ts:L137-146`, la variable `globalDiscount` passée en props est utilisée dans le calcul (L53-59) mais est omise du tableau de dépendances de `useMemo`.

9. **Calcul mathématique erroné de la TVA dans les rapports comptables** :
   Dans `src/components/DetailedReports.tsx:L73` :
   ```typescript
   (t.total * (settings.taxRate / 100)).toFixed(2)
   ```
   `t.total` est TTC. Appliquer `t.total * 0.19` calcule 19% sur le TTC au lieu de calculer la TVA collectée : `t.total - (t.total / (1 + 0.19))`.

10. **Surévaluation du Chiffre d'Affaires lors des retours partiels** :
    Dans `src/components/DetailedReports.tsx:L91` :
    ```typescript
    const totalRevenue = useMemo(() => {
      return transactions.reduce((sum, t) => sum + (t.status === 'returned' || t.status === 'cancelled' ? 0 : (t.total || 0)), 0);
    }, [transactions]);
    ```
    Si une transaction a le statut `'partially_returned'`, son montant total initial est comptabilisé à 100% sans déduire le montant remboursé.

11. **Requête Supabase non bornée pour `online_orders`** :
    Dans `src/components/useOrdersLogic.tsx:L151-155` :
    ```typescript
    const { data, error } = await supabase
      .from('online_orders')
      .select('*')
      .order('id', { ascending: false });
    ```
    Absence de clause `.limit(...)` ou de pagination par lot, contrairement aux préconisations de `GEMINI.md`.

---

## 2. Logic Chain

1. **Sur la gestion de caisse et le calcul des espèces attendues (Point 5)** :
   - `Expenses.tsx` initialise et enregistre le champ `date` sous la forme `format(new Date(), 'yyyy-MM-dd')`.
   - `useCashManagementLogic.ts` compare `new Date(e.date)` avec `new Date(activeShift.openedAt)`.
   - En JavaScript, parser une chaîne ISO date seule `"YYYY-MM-DD"` crée une date UTC à 00:00:00.000.
   - Toute session ouverte entre 00:00:01 et 23:59:59 possède une valeur `openedAt` supérieure à `00:00:00.000`.
   - Par déduction logique : toute dépense enregistrée le même jour après l'ouverture de caisse sera rejetée par le filtre `shiftExpenses`.
   - Conséquence directe : `totalExpenses` reste à 0, `expectedCash` surestime le montant en espèces devant être dans le tiroir, et le caissier est injustement accusé d'un trou de caisse (écart négatif).

2. **Sur la synchronisation des stocks des commandes livrées (Point 6)** :
   - Quand une commande passe au statut `'delivered'`, le système ajoute une transaction complétée (`useOrderActions.ts:L246`).
   - Cependant, aucun appel à `incrementStock` ou `enqueueStockAdjustment` n'est réalisé dans ce bloc.
   - Si cette même commande est annulée ultérieurement, la fonction `useOrderActions.ts:L142` boucle sur chaque article et appelle `enqueueStockAdjustment(prodId, qty)`.
   - Conséquence directe : le stock n'a jamais diminué lors de la vente, mais il augmente lors de l'annulation. Le stock physique et le stock théorique divergent.

3. **Sur le blocage des dettes clients au checkout (Point 7)** :
   - La comptabilité de Nexus POS Pro définit qu'un client endetté possède un solde négatif (`c.balance < 0`), comme en témoignent `CustomerDebtsLedger.tsx:L71` (`(Number(c.balance) || 0) < 0`) et `documentPrintService.ts:L364`.
   - Dans `useCheckoutProcess.ts:L86`, le garde-fou impose `(selectedCustomer.balance || 0) >= total`.
   - Par déduction logique : un client qui n'a pas versé d'argent d'avance (solde 0 DA) ou qui a déjà une dette ne peut jamais utiliser le mode de paiement `balance` (crédit / carnet), même si sa limite de crédit (`creditLimit`) est de 100 000 DA.

4. **Sur la conformité des schémas Supabase (Point 4)** :
   - `preparePayload` de `src/lib/db-converters.ts` applique un filtrage strict : seules les clés présentes dans `TABLE_COLUMNS[table]` sont conservées.
   - Ni `credit_limit` dans `customers`, ni `notes` dans `transactions` ne figurent dans le dictionnaire `TABLE_COLUMNS`.
   - Conséquence directe : ces données sont définitivement perdues lors de la synchronisation vers PostgreSQL.

---

## 3. Caveats

- Les tests d'exécution réseau réelle avec Supabase dépendent de la connectivité et des identifiants valides dans l'environnement local.
- Les tests unitaires Vitest existants (`npm test`) couvrent une partie des fonctions utilitaires, mais ne disposent pas d'un test spécifique pour la comparaison de dates `YYYY-MM-DD` vs ISO dans `useCashManagementLogic.ts`.
- L'audit a été mené en mode READ-ONLY strict selon les consignes de l'archétype explorer. Aucune modification de code n'a été appliquée directement dans `src/` au cours de cette phase.

---

## 4. Conclusion & Inventaire Structuré

### 4.1 ✅ Points Forts (Ce qui va bien)

| Domaine | Fichier & Lignes | Description du Mécanisme Robuste |
| :--- | :--- | :--- |
| **Sécurité Anti-Crash Synchro** | `src/services/SyncService.ts:L85-120` | Miroir d'urgence synchrone dans `localStorage` (`nexus_emergency_sync_queue`) déclenché sur `beforeunload`, `pagehide` et `visibilitychange`. Restauration automatique au démarrage. |
| **Déduplication Cumulée des Stocks** | `src/services/SyncService.ts:L218-230` | Cumul intelligent des ajustements de stocks successifs dans la file d'attente pour éviter les écrasements de deltas concurrents. |
| **Protection Upserts Partiels** | `src/lib/db-converters.ts:L434-478` | Remplissage automatique des champs obligatoires PostgreSQL `NOT NULL` (`unit`, `status`, `category_id`, `name`, `role`, `display_name`) en fusionnant avec l'état en cache local `dbState`. |
| **Pruning Automatique de Schéma** | `src/hooks/data-fetching/supabaseFetchHelper.ts:L63-88` | Détection dynamique des colonnes inexistantes côté Supabase (erreurs 42703 / PGRST204) avec élagage automatique et repli gracieux sans crash. |
| **Pagination par Lots (500 items)** | `src/hooks/data-fetching/supabaseFetchHelper.ts:L176-195` | Pagination transparente par tranche de 500 enregistrements, évitant les surcharges de mémoire sur les gros catalogues. |
| **Gestion Multi-Packs / Bundles en Restock** | `src/components/useReturnModalLogic.ts:L136-148` | Décomposition récursive des bundles et réintégration exacte du stock des composants enfants lors des retours. |
| **Calcul Monnaie & Rendu Espèces** | `src/components/checkout/PaymentOrderSummary.tsx:L320-388` | Rendu de monnaie instantané avec raccourcis coupures algériennes (500 DA, 1000 DA, 2000 DA, Compte Juste). |
| **Support Offline-First BroadcastChannel** | `src/services/LocalDatabase.ts:L33-53` | Synchronisation instantanée inter-onglets et multi-fenêtres via `BroadcastChannel('nexus_crosstab_sync')` à 0ms de latence. |

---

### 4.2 ❌ Anomalies Détectées & Correctifs Recommandés

#### A. Sévérité CRITIQUE 🔴

##### Anomalie C1 : Rejet systématique des dépenses journalières dans la clôture de caisse et le Rapport Z
- **Emplacement** : `src/components/cash-management/useCashManagementLogic.ts:L38-40`
- **Problème & Impact Métier** :
  `e.date` est formaté au format jour sans heure `YYYY-MM-DD` (ex: `"2026-09-25"`), ce qui produit un objet Date positionné à `00:00:00.000 UTC`. Lors de la comparaison avec `activeShift.openedAt` (qui contient l'heure exacte de l'ouverture de caisse, par ex. 08h30), la condition `new Date(e.date) >= new Date(activeShift.openedAt)` est **systématiquement fausse**.
  Toutes les dépenses payées en espèces par la caisse au cours de la journée sont ignorées. Le montant d'espèces calculé comme attendu en caisse (`expectedCash`) est surévalué du montant exact des dépenses, générant un faux déficit de caisse pour le caissier et faussant l'intégrité comptable du Rapport Z.
  De plus, les dépenses ne sont pas filtrées par mode de règlement espèces (`e.paymentMethod === 'cash'`).
- **Proposition de Correctif Technique** :
  Remplacer la comparaison stricte d'horodatage par une comparaison de date calendaire ou ajouter l'heure ISO à la création des dépenses, et filtrer uniquement les sorties d'espèces :
  ```typescript
  // Dans src/components/cash-management/useCashManagementLogic.ts:L38-40
  const shiftOpenDateStr = new Date(activeShift.openedAt).toISOString().split('T')[0];
  const shiftExpenses = (expenses || []).filter(e => {
    if (!e || !e.date) return false;
    const isCash = !e.paymentMethod || e.paymentMethod === 'cash';
    if (!isCash) return false;
    const expDateStr = e.date.includes('T') ? e.date.split('T')[0] : e.date;
    // Si la dépense a un timestamp complet, comparer les timestamps, sinon comparer le jour calendaire
    if (e.date.includes('T')) {
      return new Date(e.date) >= new Date(activeShift.openedAt);
    }
    return expDateStr >= shiftOpenDateStr;
  });
  ```

---

#### B. Sévérité MAJEURE 🟠

##### Anomalie M1 : Appel à 3 arguments non conforme sur `localDb.update`
- **Emplacement** : `src/hooks/suppliers/useSupplierPayments.ts:L101`
- **Problème & Impact Métier** :
  Ligne 101 : `await localDb.update('suppliers', viewingDetailsSupplier.id, updatedSupplier);`.
  Viole la règle stricte du projet (`GEMINI.md` : "localDb.insert et localDb.update n'acceptent que 2 arguments : `(path, value)` où `path = 'table/id'`, jamais 3 arguments"). Bien que `LocalDatabase.ts` possède une tolérance rétrocompatible, ce code contourne le standard architectural et risque de casser si la signature est durcie.
- **Proposition de Correctif Technique** :
  ```typescript
  // Remplacer :
  await localDb.update('suppliers', viewingDetailsSupplier.id, updatedSupplier);
  // Par :
  await localDb.update(`suppliers/${viewingDetailsSupplier.id}`, updatedSupplier);
  ```

##### Anomalie M2 : Colonnes `credit_limit` et `notes` absentes de `TABLE_COLUMNS`
- **Emplacement** : `src/lib/db-converters.ts:L124-138`
- **Problème & Impact Métier** :
  - `TABLE_COLUMNS.customers` ne comprend pas `credit_limit`. Les plafonds de crédit accordés aux clients sont rejetés par `preparePayload` et non sauvegardés dans Supabase.
  - `TABLE_COLUMNS.transactions` ne comprend pas `notes`. Les notes de commande et références de livraison associées aux transactions sont purgées à la synchronisation.
- **Proposition de Correctif Technique** :
  Dans `src/lib/db-converters.ts` :
  - Ajouter `'credit_limit'` dans `TABLE_COLUMNS.customers` (L127-128).
  - Ajouter `'notes'` dans `TABLE_COLUMNS.transactions` (L137-138).
  - Ajouter `['credit_limit', 'creditLimit']` dans `CONFLICT_MAPS.customers`.

##### Anomalie M3 : Absence de déstockage lors de la livraison des commandes en ligne
- **Emplacement** : `src/hooks/useOrderActions.ts:L229-248` et `src/hooks/useDeliveryActions.ts:L78-112`
- **Problème & Impact Métier** :
  Quand une commande en ligne passe au statut `'delivered'`, une transaction de vente est enregistrée en caisse, mais le stock des articles n'est pas décrémenté (`enqueueStockAdjustment` n'est pas appelé). Si la commande est annulée plus tard, le rollback réintègre le stock, créant un stock fantôme en excès.
- **Proposition de Correctif Technique** :
  Lors du passage au statut `'delivered'` dans `useOrderActions.ts` (L229-248), décrémenter le stock :
  ```typescript
  if (newStatus === 'delivered' && order.status !== 'delivered') {
    // Décrémenter le stock pour chaque article vendu
    for (const item of (order.items || [])) {
      const prodId = item.productId || item.id;
      const qty = Number(item.quantity || 1);
      if (prodId && qty > 0) {
        enqueueStockAdjustment(prodId, -qty);
      }
    }
  }
  ```

##### Anomalie M4 : Blocage des ventes à crédit (Dettes clients) en caisse
- **Emplacement** : `src/hooks/useCheckoutProcess.ts:L86-89`
- **Problème & Impact Métier** :
  Le contrôle `if (total > 0 && (selectedCustomer.balance || 0) < total) toast.error("Solde insuffisant.");` assimile le solde client à un compte prépayé et interdit la vente à dette, alors que l'application gère nativement le carnet de dettes (`CustomerDebtsLedger.tsx`).
- **Proposition de Correctif Technique** :
  Permettre le règlement par dette jusqu'à la limite autorisée (`creditLimit` ou seuil paramétré) :
  ```typescript
  if (method === 'balance') {
    if (!selectedCustomer) {
      toast.error("Veuillez sélectionner un client pour payer par compte/crédit.");
      return;
    }
    const currentBalance = Number(selectedCustomer.balance) || 0;
    const creditLimit = Number(selectedCustomer.creditLimit) || Number(settings?.maxCustomerCreditLimit) || 0;
    // Si une limite de crédit est définie (> 0), vérifier que (solde - total) ne dépasse pas -creditLimit
    if (creditLimit > 0 && (currentBalance - total) < -creditLimit) {
      toast.error(`Plafond de dette dépassé. Limite autorisée : ${creditLimit.toFixed(2)} ${settings.currency || 'DA'}`);
      return;
    }
  }
  ```

##### Anomalie M5 : Omission de `globalDiscount` dans les dépendances de `useMemo`
- **Emplacement** : `src/hooks/useCheckoutCalculations.ts:L137-146`
- **Problème & Impact Métier** :
  `globalDiscount` est passé en argument et utilisé dans le calcul du sous-total net, mais n'est pas présent dans la liste des dépendances du `useMemo`. Si la remise globale du panier est modifiée ou annulée, le montant total affiché et encaissé ne se met pas à jour tant qu'un autre article du panier n'est pas modifié.
- **Proposition de Correctif Technique** :
  Ajouter `globalDiscount` dans le tableau de dépendances de `useMemo` à la ligne 146 :
  ```typescript
    appliedVoucher,
    settings,
    globalDiscount
  ]);
  ```

##### Anomalie M6 : Calcul de TVA mathématiquement erroné dans `DetailedReports.tsx`
- **Emplacement** : `src/components/DetailedReports.tsx:L73`
- **Problème & Impact Métier** :
  Ligne 73 : `(t.total * (settings.taxRate / 100)).toFixed(2)`.
  Dans la caisse de détail, `t.total` est TTC. Pour une vente de 119 DA TTC avec TVA 19%, la TVA réelle est 19 DA (`119 - 119 / 1.19`). La formule actuelle produit 22,61 DA, faussant l'export comptable CSV.
- **Proposition de Correctif Technique** :
  ```typescript
  // Remplacer :
  (t.total * (settings.taxRate / 100)).toFixed(2)
  // Par :
  const taxRateVal = Number(settings.taxRate) || 0;
  const tva = taxRateVal > 0 ? (t.total - (t.total / (1 + taxRateVal / 100))) : 0;
  tva.toFixed(2)
  ```

##### Anomalie M7 : Non-déduction des retours partiels dans le chiffre d'affaires
- **Emplacement** : `src/components/DetailedReports.tsx:L91`
- **Problème & Impact Métier** :
  `totalRevenue` filtre uniquement `t.status === 'returned' || t.status === 'cancelled'`. Les transactions avec statut `'partially_returned'` continuent d'être ajoutées à 100% de leur montant d'origine sans déduire le montant remboursé (`totalRefund`), surévaluant le chiffre d'affaires de l'entreprise.
- **Proposition de Correctif Technique** :
  Déduire le montant des retours associés à la transaction ou calculer le CA effectif :
  ```typescript
  const totalRevenue = useMemo(() => {
    return transactions.reduce((sum, t) => {
      if (t.status === 'returned' || t.status === 'cancelled') return sum;
      let netTotal = Number(t.total) || 0;
      if (t.status === 'partially_returned') {
        const matchingReturns = (returns || []).filter((r: any) => r.transactionId === t.id);
        const refunded = matchingReturns.reduce((rSum: number, r: any) => rSum + (Number(r.totalRefund) || 0), 0);
        netTotal = Math.max(0, netTotal - refunded);
      }
      return sum + netTotal;
    }, 0);
  }, [transactions, returns]);
  ```

##### Anomalie M8 : Requête Supabase sans pagination ni limite dans `useOrdersLogic.tsx`
- **Emplacement** : `src/components/useOrdersLogic.tsx:L151-155`
- **Problème & Impact Métier** :
  `supabase.from('online_orders').select('*').order('id', { ascending: false })` rapatrie toutes les commandes sans limite. En production avec plusieurs milliers de commandes, cela entraîne une saturation réseau et des lenteurs au chargement du module.
- **Proposition de Correctif Technique** :
  Ajouter `.limit(500)` à la requête de rafraîchissement.

---

#### C. Sévérité MINEURE 🟡

##### Anomalie N1 : Libellé "Sous-total HT" erroné sur les tickets de caisse
- **Emplacement** : `src/services/receiptPrintService.ts:L125`
- **Description & Correctif** :
  Le ticket A4 affiche `Sous-total HT` pour `subtotalBeforeDiscounts` (qui est la somme des prix unitaires TTC avant remises).
  *Correctif* : Remplacer l'étiquette par `Sous-total Brut` ou calculer le montant HT réel `subtotalBeforeDiscounts / (1 + (settings.taxRate || 0) / 100)`.

##### Anomalie N2 : Bouton de montant erroné (505 DA) dans la modale financière client
- **Emplacement** : `src/components/CustomerFinancialModal.tsx:L140`
- **Description & Correctif** :
  `[10, 20, 50, 100, 200, 505].map(val => ...)` contient une faute de frappe manifeste (`505` au lieu de `500`), et les incréments ne sont pas adaptés aux coupures de Dinars Algériens.
  *Correctif* : Remplacer par `[500, 1000, 2000, 5000]`.

##### Anomalie N3 : Appel `localDb.insert` sur chemin sans ID dans `backupRestoreService.ts`
- **Emplacement** : `src/services/backupRestoreService.ts:L120`
- **Description & Correctif** :
  `await localDb.insert('settings', backup.settings);` utilise `'settings'` au lieu de `'settings/company'`, créant une divergence avec les observateurs de configuration.
  *Correctif* : Utiliser `await localDb.insert('settings/company', backup.settings);`.

##### Anomalie N4 : Non-mise à jour immédiate du store `usePeopleStore` lors d'un retour
- **Emplacement** : `src/components/useReturnModalLogic.ts:L165-171`
- **Description & Correctif** :
  Lors de la déduction des points de fidélité et des dépenses client, `localDb.update` est exécuté mais `usePeopleStore.getState().setCustomers(...)` n'est pas mis à jour immédiatement en mémoire, ce qui maintient les anciens points affichés à l'écran jusqu'au rechargement.
  *Correctif* : Ajouter l'actualisation du store Zustand `usePeopleStore`.

##### Anomalie N5 : Fallback TVA à 0% dans les formulaires et imports de produits
- **Emplacement** : `src/components/useProductFormLogic.tsx:L42,L185`, `src/hooks/useProductImport.ts:L185`, `src/components/QuickAddProductModal.tsx:L103`
- **Description & Correctif** :
  La TVA par défaut bascule à `'0'` au lieu de `19%` (taux légal standard en Algérie selon `appConfig.ts:20` et `GEMINI.md`).
  *Correctif* : Définir le fallback à `settings?.taxRate ?? 19`.

---

## 5. Verification Method

Pour vérifier de manière indépendante les constats et s'assurer qu'aucune régression n'est introduite lors de la future phase de remédiation :

1. **Vérification Statique & Contrôle de Types** :
   ```bash
   npx tsc --noEmit
   ```
   Valider qu'aucune erreur TypeScript n'est générée.

2. **Exécution des Tests Unitaires & Intégration** :
   ```bash
   npm test
   ```
   Exécuter l'ensemble des 22 suites de tests Vitest du projet.

3. **Vérification de Compilation de Production** :
   ```bash
   npm run build
   ```
   Valider que Vite compile le bundle complet sans erreur ni avertissement bloquant.

4. **Test de Détection Forensique des Appels 3 arguments** :
   ```powershell
   Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String "localDb\.(insert|update)\s*\(\s*['\"][a-zA-Z_]+['\"]\s*,\s*[^,]+,\s*[^)]+\)"
   ```
   Vérifier que ce filtre ne retourne strictement 0 résultat après correction de `useSupplierPayments.ts:L101`.

5. **Test Reproductible du Bug Date Clôture de Caisse (Anomalie C1)** :
   - Ouvrir une session de caisse à une heure quelconque du jour (ex: `2026-09-25T09:00:00.000Z`).
   - Enregistrer une dépense espèces de 1 000 DA (avec date `"2026-09-25"`).
   - Constater que sans le correctif, `currentShiftStats.totalExpenses` vaut 0 au lieu de 1 000 DA.
   - Avec le correctif, `totalExpenses` doit afficher exactement 1 000 DA et déduire ce montant des espèces attendues.
