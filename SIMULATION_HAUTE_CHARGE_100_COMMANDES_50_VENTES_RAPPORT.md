# Rapport de Simulation Haute Charge : 100 Commandes en Ligne + 50 Ventes Comptoir + Approvisionnement Concurrente (10 min)

- **Date / Horodatage** : 2026-11-01T22:15:00+01:00
- **Projet Supabase** : `unlwfvldqxfccgrrgbwf` (eu-central-1)
- **Environnement** : Offline-First (IndexedDB / LocalDb) + Supabase Pro
- **Devise** : Dinars Algériens (`DA` / `DZD`)
- **TVA standard** : 19%

---

## 📋 Tableau de Bord de la Simulation

| Étape | Statut | Détails |
| :--- | :---: | :--- |
| **Étape 0 : Échantillonnage Produits Réels** | ✅ Validé | 150 vrais produits extraits de la table `products` Supabase (`tests/simulations/realProductsSample.json`) |
| **Étape 1 : Création du Shift de Travail** | ✅ Validé | Shift `shift_sim_stress_10m` ouvert avec fond de caisse de 25 000 DA sur le terminal principal. |
| **Étape 2 : Réception de 100 Commandes en Ligne** | ✅ Validé | 100 commandes générées (3350 lignes articles, CA Total Web: 2 022 340,07 DA, Panier moyen: 20 223 DA). |
| **Étape 3 : 50 Ventes Comptoir Directes** | ✅ Validé | 50 ventes comptoir encaissées (1650 lignes, CA Comptoir: 734 365,36 DA, Panier moyen: 14 687 DA, Déstockage consolidé sans collision). |
| **Étape 4 : Réassort / Approvisionnement Concurrente** | ✅ Validé | Bon de réception `BL-2026-11-RUSH-001` validé (+2 960 unités sur 40 références, Montant achat: 889 871 DA). |
| **Étape 5 : Bilan Comptable, Déstockage & Résilience** | ✅ Validé | Vérification arithmétique 100% exacte, 0 discrépance de stock, rapport final complet généré. |

---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **751 166,21 DA** (Espèces: 557 796,51 DA, Carte CIB: 193 369,7 DA).
- **Volume Financier Commandes Web** : **1 980 178,68 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 731 344,89 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **582 796,51 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **753 266,29 DA** (Espèces: 573 372,87 DA, Carte CIB: 179 893,42 DA).
- **Volume Financier Commandes Web** : **2 062 407,06 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 815 673,35 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **598 372,87 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **765 786,55 DA** (Espèces: 563 696,83 DA, Carte CIB: 202 089,72 DA).
- **Volume Financier Commandes Web** : **1 978 142,29 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 743 928,84 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **588 696,83 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **699 007,04 DA** (Espèces: 526 642,61 DA, Carte CIB: 172 364,43 DA).
- **Volume Financier Commandes Web** : **2 059 263,29 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 758 270,33 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **551 642,61 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **722 244,62 DA** (Espèces: 550 705,87 DA, Carte CIB: 171 538,75 DA).
- **Volume Financier Commandes Web** : **2 070 142,32 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 792 386,94 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **575 705,87 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **727 889,97 DA** (Espèces: 565 496,51 DA, Carte CIB: 162 393,46 DA).
- **Volume Financier Commandes Web** : **2 062 516,62 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 790 406,59 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **590 496,51 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **773 561,53 DA** (Espèces: 579 921,77 DA, Carte CIB: 193 639,76 DA).
- **Volume Financier Commandes Web** : **1 959 107,75 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 732 669,28 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **604 921,77 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **792 566,4 DA** (Espèces: 602 996,98 DA, Carte CIB: 189 569,42 DA).
- **Volume Financier Commandes Web** : **1 998 530,04 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 791 096,44 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **627 996,98 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **742 947,25 DA** (Espèces: 561 188,19 DA, Carte CIB: 181 759,06 DA).
- **Volume Financier Commandes Web** : **2 000 917,12 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 743 864,37 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **586 188,19 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **767 319,96 DA** (Espèces: 575 476,89 DA, Carte CIB: 191 843,07 DA).
- **Volume Financier Commandes Web** : **1 986 975,54 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 754 295,5 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **600 476,89 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **732 782,66 DA** (Espèces: 551 568,87 DA, Carte CIB: 181 213,79 DA).
- **Volume Financier Commandes Web** : **2 059 117,19 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 791 899,85 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **576 568,87 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **758 079,3 DA** (Espèces: 575 135,53 DA, Carte CIB: 182 943,77 DA).
- **Volume Financier Commandes Web** : **1 959 707,82 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 717 787,12 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **600 135,53 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **779 217,37 DA** (Espèces: 596 424,25 DA, Carte CIB: 182 793,12 DA).
- **Volume Financier Commandes Web** : **2 021 830,69 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 801 048,06 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **621 424,25 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.



---

## 📊 Synthèse Finale Chiffrée de la Simulation (Période 10 Minutes)

### 1. Volumétrie des Flux Traités
- **Commandes en Ligne Ingestées** : **100 commandes** réparties de 22:00:00 à 22:10:00.
- **Ventes Comptoir Encaissées** : **50 transactions directes** sur le terminal caisse.
- **Lignes d'Articles Commandes Web** : **3 350 lignes** (moyenne : 33.5 articles / panier, strict > 30).
- **Lignes d'Articles Ventes Caisse** : **1 650 lignes** (moyenne : 33.0 articles / panier, strict > 30).
- **Lignes d'Approvisionnement Livrées** : **40 références réapprovisionnées** (**+2 960 unités** physiques).
- **Total Mouvements d'Articles Traités** : **7 960 mouvements / unités** en 10 minutes !

### 2. Performance Financière & Caisse
- **Chiffre d'Affaires Comptoir (Caisse)** : **734 365,36 DA** (Espèces: 572 141,9 DA, Carte CIB: 162 223,46 DA).
- **Volume Financier Commandes Web** : **2 022 340,07 DA**.
- **Chiffre d'Affaires Global Période (10 min)** : **2 756 705,43 DA**.
- **Montant des Achats Fournisseur (Réassort)** : **889 871 DA**.
- **Fond de Caisse Initial** : **25 000 DA**.
- **Caisse Finale à la Clôture** : **597 141,9 DA** (Écart de caisse : **0.00 DA**).

### 3. Résilience & Intégrité des Stocks
- **Consolidation Préalable par `productId` (Anti-Écrasement)** : **100% conforme** (aucune race condition, zéro ligne écrasée).
- **Discrépance ou perte de stock détectée** : **0 anomalie sur 150 produits audités** (formule mathématique $S_f = S_i - V + A$ vérifiée avec une exactitude de 100%).
- **Conformité Schéma Supabase / db-converters** : **100% valide** sur les colonnes déclarées dans `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.
