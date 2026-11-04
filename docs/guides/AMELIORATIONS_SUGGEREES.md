# Feuille de Route & Améliorations Suggérées — Nexus POS Pro v1.2.14

**Date** : 25 Septembre 2026  
**Version** : v1.2.14 (Post-Audit 360° et Remédiation)  
**État Actuel** : ✅ **Base ultra-stable — 0 erreur TypeScript, 117 tests Vitest réussis (100%), bundle épuré (-131 KB sans Framer Motion)**

---

## 1. Bilan Post-Modifications : Ce qui va bien vs Ce qui reste perfectible

### ✅ Ce qui va parfaitement bien (Points Forts Établis)
1. **Fluidité & Réactivité Immédiate (0 ms de latence)** :
   - Élimination complète du moteur lourd d'animation (`vendor-motion`) au profit d'un shim DOM pur (< 1 KB).
   - Suppression des délais d'attente à l'ouverture des modals et lors du basculement d'onglets.
   - Thème Clair Pro Minimaliste sobre, lisible et reposant pour les yeux des caissiers en journée.
2. **Caisse & Ergonomie d'Encaissement** :
   - Raccourcis clavier conformes et sans conflit :
     - `F1` : Encaissement Espèces direct.
     - `F2` : Encaissement Carte / TPE direct.
     - `F3` : Focus immédiat sur la barre de recherche produit.
     - `F4` : Valider & Imprimer le ticket thermique.
     - `F8` : Nouveau panier / session.
     - `Ctrl+Delete` : Purge sécurisée du panier avec confirmation.
   - Lignes de panier compactes (44px) avec boutons tactiles ergonomiques (36x36px).
   - Calcul de panier temps réel prenant en compte la remise globale (`globalDiscount`) et les remises par article.
3. **Gestion des Dettes & Carnet de Crédit Client** :
   - Déblocage du paiement par dette dans la limite du plafond de crédit autorisé (`creditLimit`).
   - Persistance cloud sans perte de la colonne `credit_limit` sur Supabase.
4. **Comptabilité, Trésorerie & Rapports Fiscaux** :
   - Clôture de caisse (Rapport Z) exacte : prise en compte fiable des dépenses du jour et isolation des sorties d'espèces réelles.
   - Formule fiscale d'extraction de TVA 19% DZD exacte sur les montants TTC : `total - (total / (1 + vatRate))`.
   - Rapport des flux de trésorerie (`CashflowReport`) assaini : exclusion des ventes annulées et déduction des remboursements clients.
   - Rapport des bénéfices (`ProfitsReport`) : isolation stricte des retours d'hier sur le filtre de la veille.
   - QR Code de ticket de caisse généré localement en Base64 : **100% autonome et fonctionnel sans connexion Internet**.
5. **Fiabilité des Données & Synchronisation Offline-First** :
   - Conformité totale des écritures IndexedDB (2 arguments stricts `localDb.insert/update('table/id', value)`).
   - Déstockage physique automatique lors de la livraison des commandes en ligne.
   - Sauvegarde de session volatile en `sessionStorage` et chiffrement `nx2` du Master PIN.

---

### ⚠️ Ce qui reste perfectible (Axes d'Améliorations Détectés)
1. **Caisse** :
   - L'encaissement espèces peut être encore plus rapide grâce à des touches de coupures directes pour le rendu de monnaie (ex: client donne un billet de 1 000 DA ou 2 000 DA).
   - L'ajout d'articles en quantité multiple nécessite encore d'ajuster le champ quantité après ajout plutôt que de pouvoir taper `5*` puis scanner.
2. **Gestion Commerciale & Dettes** :
   - Lors du remboursement partiel d'une dette par un client, aucun reçu thermique spécifique "Reçu de Versement / Règlement de Dette" n'est imprimé pour preuve.
   - La relance des impayés se fait manuellement sans vue récapitulative des dettes par tranche d'ancienneté (>30 jours, >60 jours).
3. **Réapprovisionnement & Stocks** :
   - Les commandes fournisseurs sont créées manuellement article par article sans possibilité de générer automatiquement un bon de commande pour tous les articles en alerte de stock.
4. **Export pour Expert-Comptable** :
   - Bien que l'export CSV existe, il manque un format Excel dédié "Grand Livre des Ventes" avec colonnes séparées HT / TVA 19% / TTC prêt à être remis au comptable.

---

## 2. Liste de Tâches des Améliorations Suggérées (Feuille de Route)

### 🚀 Priorité 1 : Vitesse d'Encaissement & Confort de Caisse Tactile

- [x] **T1.1 — Boutons de Coupures Rapides & Calculateur de Rendu de Monnaie en Caisse** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Quand un client paye en espèces, permettre au caissier de cliquer en 1 touche sur `500 DA`, `1 000 DA`, `2 000 DA` ou `5 000 DA` (ou `Montant Exact`). L'application affiche en très gros le rendu de monnaie à rendre au client (ex: Total 1 450 DA, Reçu 2 000 DA $\rightarrow$ **Rendre 550 DA**).
  - **Fichiers impactés** : `src/components/checkout/PaymentOrderSummary.tsx`, `src/hooks/useCheckoutProcess.ts`.
  - **Bénéfice** : Réduit le temps d'encaissement espèces de 5 à 2 secondes et élimine les erreurs de rendu de monnaie lors des heures d'affluence.

- [x] **T1.2 — Saisie Rapide de Quantité par Préfixe Scanner (`X*CodeBarre`)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Permettre au caissier de taper `6*` puis de scanner le code-barres (ou de valider le produit) pour ajouter instantanément 6 unités dans le panier sans avoir à cliquer sur le bouton `+` six fois.
  - **Fichiers impactés** : `src/components/checkout/SearchOverlay.tsx`, `src/hooks/useCart.ts`, `src/components/checkout/useCheckoutBarcode.ts`.
  - **Bénéfice** : Gain de temps massif pour les quincailleries, supermarchés et grossistes vendant des packs ou lots.

- [x] **T1.3 — Raccourci Clavier d'Appel Rapide du Dernier Ticket (`F10`)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Permettre de réimprimer en une seule touche le dernier ticket de caisse validé en cas de bourrage papier ou à la demande du client.
  - **Fichiers impactés** : `src/components/checkout/useCheckoutShortcuts.ts`, `src/services/receiptPrintService.ts`.
  - **Bénéfice** : Évite de devoir quitter l'écran de vente pour aller chercher la transaction dans l'historique.

---

### 💳 Priorité 2 : Gestion Avancée des Dettes & Règlements Clients

- [x] **T2.1 — Impression du Reçu Thermique de Règlement de Dette / Acompte** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Quand un client vient verser 5 000 DA pour réduire son solde débiteur, imprimer immédiatement un reçu ticket 80mm/58mm mentionnant : Nom du client, Ancien Solde Débiteur, Montant Versé, Nouveau Solde Restant Dû, Date et Signature/Tampon.
  - **Fichiers impactés** : `src/components/CustomerFinancialModal.tsx`, `src/services/receiptPrintService.ts`.
  - **Bénéfice** : Sécurité juridique et transparence totale pour le client et le gérant du magasin.

- [x] **T2.2 — Balance Âgée des Créances Clients (Dettes par Ancienneté)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Tableau de bord classant les clients débiteurs par tranches : Dettes < 30 jours, 30 à 60 jours, > 60 jours, avec bouton direct d'envoi de rappel WhatsApp pré-rempli.
  - **Fichiers impactés** : `src/components/customers/CustomerDebtsLedger.tsx`, `src/components/customers/CustomerAnalyticsView.tsx`.
  - **Bénéfice** : Réduction des impayés et accélération des rentrées de trésorerie.

---

### 📦 Priorité 3 : Automatisation des Stocks & Réapprovisionnement

- [x] **T3.1 — Générateur Automatique de Bons de Commande Fournisseurs par Seuil d'Alerte** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Un bouton "Générer les Réapprovisionnements" dans l'onglet Achats (`SmartPurchase`) qui filtre tous les articles dont le stock actuel est inférieur ou égal au `minStock`, calcule la quantité à commander pour atteindre le stock optimal, et groupe automatiquement les articles par fournisseur attitré.
  - **Fichiers impactés** : `src/components/SmartPurchase.tsx`, `src/components/smart-purchase/PurchaseCartTable.tsx`, `src/components/smart-purchase/SubTabNewPurchase.tsx`.
  - **Bénéfice** : Zéro rupture de stock sur les produits phares et gain de plusieurs heures de commande chaque semaine.

- [x] **T3.2 — Étiquettes de Gondole avec Prix au Kilo / Litre (Périmètre Magasin)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Modèle d'étiquette de rayon A4 et thermique affichant le prix unitaire et, pour les produits au poids/volume, le prix de référence au kilo ou au litre.
  - **Fichiers impactés** : `src/components/LabelPrinter.tsx`, `src/services/labelPrintService.ts`.
  - **Bénéfice** : Conformité légale pour l'affichage en magasin et meilleure clarté pour les clients.

---

### 📊 Priorité 4 : Conformité Comptable & Fiscalité Algérienne

- [x] **T4.1 — Export Excel Officiel "Grand Livre des Ventes TVA" (Format Expert-Comptable)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Export XLSX/CSV (UTF-8 BOM `;`) mensuel avec colonnes strictes : Date, Heure, N° Ticket/Facture, Vendeur/Caisse, Montant Total HT, TVA 19% Collectée, Montant Total TTC, Mode de Règlement (Espèces, Carte, Crédit).
  - **Fichiers impactés** : `src/components/DetailedReports.tsx`, `src/services/excelExportService.ts`.
  - **Bénéfice** : Remise directe du fichier au comptable chaque mois sans aucune retouche manuelle.

- [x] **T4.2 — Journal des Clôtures de Caisse (Historique des Rapports Z)** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Écran dédié permettant de consulter et de réimprimer n'importe quel Rapport Z de fin de journée passé avec écart de caisse constaté (`difference`), chiffre d'affaires, ventilation par mode de paiement et total des dépenses.
  - **Fichiers impactés** : `src/components/cash-management/CashManagement.tsx`, `src/components/cash-management/CashManagementHistory.tsx`.
  - **Bénéfice** : Traçabilité absolue contre les écarts de caisse et les contestations d'équipes.

---

### 🌐 Priorité 5 : Résilience Multi-Terminaux & Haute Disponibilité

- [x] **T5.1 — Widget Indicateur de File d'Attente de Synchronisation dans le Header** `[✅ IMPLÉMENTÉ]`
  - **Besoin** : Petit badge discret dans `AppHeader.tsx` affichant l'état du moteur de synchronisation :
    - Vert fixe : *Toutes les données sont synchronisées avec le cloud*.
    - Bleu pulsant avec compteur (ex: *3 en attente*) : *Modifications locales en cours d'envoi*.
    - Ambre : *Mode hors-ligne actif (IndexedDB opérationnel)*.
  - **Fichiers impactés** : `src/components/AppHeader.tsx`, `src/services/SyncService.ts`.
  - **Bénéfice** : Confiance totale du commerçant dans l'état de synchronisation de ses données lors des changements de réseau.

---

## 3. Matrice de Réalisation & Statut Final

| Tâche | Complexité | Impact Métier | Statut Réalisation |
| :--- | :---: | :---: | :---: |
| **T1.1 — Boutons de Coupures Rapides & Rendu Monnaie** | Faible | ⭐⭐⭐⭐⭐ (Très Fort) | ✅ **100% Implémenté** (500, 1000, 2000, 5000 DA) |
| **T2.1 — Reçu Thermique de Règlement de Dette** | Faible | ⭐⭐⭐⭐⭐ (Très Fort) | ✅ **100% Implémenté** (Ticket thermique 80/58mm) |
| **T1.2 — Saisie Quantité par Préfixe Scanner (`X*`)** | Moyenne | ⭐⭐⭐⭐ (Fort) | ✅ **100% Implémenté** (`6*CodeBarre`) |
| **T4.1 — Export Excel Grand Livre des Ventes TVA** | Faible | ⭐⭐⭐⭐ (Fort) | ✅ **100% Implémenté** (CSV Excel UTF-8 BOM `;`) |
| **T3.1 — Réassort Automatique par Seuil de Stock** | Moyenne | ⭐⭐⭐⭐ (Fort) | ✅ **100% Implémenté** (Bouton réassort minStock) |
| **T5.1 — Badge d'état de synchronisation Header** | Faible | ⭐⭐⭐ (Moyen) | ✅ **100% Implémenté** (Badge live + push 1-clic) |
| **T2.2 — Balance Âgée des Créances Clients** | Moyenne | ⭐⭐⭐ (Moyen) | ✅ **100% Implémenté** (Tranches + relance WhatsApp) |
| **T4.2 — Journal Historique des Rapports Z** | Faible | ⭐⭐⭐ (Moyen) | ✅ **100% Implémenté** (Historique & réimpression Z) |
| **T3.2 — Étiquettes de Gondole Prix au Kilo/Litre** | Moyenne | ⭐⭐ (Spécifique) | ✅ **100% Implémenté** (Détection kg/L/cl/g) |
