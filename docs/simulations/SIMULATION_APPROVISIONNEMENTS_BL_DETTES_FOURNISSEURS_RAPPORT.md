# 🚛 Rapport Officiel : Simulation Approvisionnements Fournisseurs, Réceptions BL, Colisage/Cartons & Dettes Fournisseurs

- **Date / Horodatage** : 2026-11-02T17:50:00+01:00
- **Version Nexus POS Pro** : v1.2.70
- **Projet Supabase** : `unlwfvldqxfccgrrgbwf` (eu-central-1)
- **Devise** : Dinars Algériens (`DA` / `DZD`)
- **Taux TVA Standard** : `19.00%`
- **Périmètre Fournisseurs** : 5 Fournisseurs Algériens Majeurs (Moula, Cevital, Ifri, Soummam, Henkel)
- **Catalogue Simulé** : 50 Références Produits dont 20 avec Gestion Cartons / Colisage (`autoUnpack: true`)

---

## 📋 Tableau de Bord de la Simulation Supply Chain & Dettes Fournisseurs

| Étape | Statut | Détails |
| :--- | :---: | :--- |
| **Étape 0 : Cadrage & Référentiel Fournisseurs & Cartons** | ✅ Validé | 5 fournisseurs algériens configurés (dette initiale : 405 000 DA). 50 références initialisées dont 20 avec conditionnement en cartons et déconditionnement automatique (autoUnpack). |
| **Étape 1 : Émission de 20 Bons de Commande (Purchase Orders)** | ✅ Validé | 20 commandes d'achats (PO) générées pour un montant prévisionnel total de 2 764 433,19 DA TTC. Mixte de colisage au carton et à l'unité. |
| **Étape 2 : Réception Physique (BL / GRN) & Déconditionnement** | ✅ Validé | 20 réceptions physiques : 14 complètes, 4 partielles, 2 avec litige déchargement. Déconditionnement automatique de 5632 unités au détail. Isolement de 36 unités avariées (11 040,12 DA) en fiches de réclamation (DamagedRecord). |
| **Étape 3 : Recalcul Dynamique du PAMP & Historique Prix** | ✅ Validé | PAMP actualisé avec succès sur 90 flux d'entrées. Formule mathématique pondérée respectée à 100%. Valorisation du stock disponible au nouveau PAMP : 2 913 871 DA. |
| **Étape 4 : Grand Livre Dettes Fournisseurs & Règlements** | ✅ Validé | Grand Livre Dettes Fournisseurs : 2 463 592,48 DA de factures enregistrées. 16 paiements émis (Comptant & Acomptes) pour 1 438 089,22 DA. |
| **Étape 5 : Clôture Comptable Supply Chain & Rapprochement Exact** | ✅ Validé | Clôture Supply Chain certifiée : Dette finale de 1 430 503,26 DA. Écart de balance constaté : 0.00 DA. Synthèse finale générée. |

---

## 📊 Synthèse Finale Officielle de la Simulation Supply Chain

### 1. Volumétrie des Commandes & Réceptions Fournisseurs
- **Commandes d'Achat (PO) Émises** : **20 bons de commande**.
- **Montant Total Commandé Prévisionnel** : **2 764 433,19 DA TTC**.
- **Bons de Livraison Réceptionnés (BL / GRN)** : **20 réceptions**.
- **Montant Réceptionné Réel (Facturé)** : **2 463 592,48 DA TTC**.
- **Taux de Conformité des Livraisons** :
  - **Livraisons Conformes (100%)** : **14 réceptions** (70%).
  - **Livraisons Partielles (Reliquats)** : **4 réceptions** (20%).
  - **Livraisons avec Litiges (Casse)** : **2 réceptions** (10%).

### 2. Colisage & Déconditionnement Automatique des Cartons
- **Articles Conditionnés en Cartons** : **20 références** (colisage 12 ou 24 unités/carton).
- **Unités au Détail Générées par Auto-Unpack** : **5 632 unités** directement injectées dans le stock caisse.
- **Incidents & Avaries de Transport** : **36 unités brisées** (**11 040,12 DA**) isolées en fiches de réclamation (`DamagedRecord`) sans gonfler le stock marchand.

### 3. Balance & Grand Livre des Dettes Fournisseurs
| Fournisseur Partenaire | Dette Initiale | Achats BL TTC | Règlements Effectués | Dette Finale Réelle |
| :--- | :---: | :---: | :---: | :---: |
| **Sarl Moula Agro & Minoterie** | 120 000 DA | 392 845,27 DA | 273 204,77 DA | **239 640,5 DA** |
| **Spa Cevital Distribution** | 85 000 DA | 607 857,36 DA | 233 253,99 DA | **459 603,37 DA** |
| **Ifri Boissons & Eaux** | 45 000 DA | 305 884,74 DA | 177 518,25 DA | **173 366,49 DA** |
| **Snc Laiterie Soummam & Frais** | 60 000 DA | 394 875,46 DA | 108 643,12 DA | **346 232,34 DA** |
| **Henkel Algérie & Droguerie** | 95 000 DA | 762 129,65 DA | 645 469,09 DA | **211 660,56 DA** |
| **TOTAL GÉNÉRAL** | **405 000 DA** | **2 463 592,48 DA** | **1 438 089,22 DA** | **1 430 503,26 DA** |

### 4. Rapprochement Mathématique des Soldes Fournisseurs
- **Dette Initiale Cumulée** : **405 000 DA**
- **(+) Achats Facturés Réceptionnés** : **2 463 592,48 DA**
- **(-) Règlements Imputés** : **1 438 089,22 DA**
- **(=) Dette Finale Théorique Attendue** : **1 430 503,26 DA**
- **Dette Finale Réelle Constatée** : **1 430 503,26 DA**
- **Écart de Balance Fournisseurs** : **0.00 DA (Équilibre Absolu)**.
