# Rapport de Simulation Haute Charge Extrême & Coupure Réseau : 200 Commandes Web + 100 Ventes Caisse (Paniers > 30 Produits)

- **Date / Horodatage** : 2026-11-02T14:55:00+01:00
- **Version Nexus POS Pro** : v1.2.70
- **Projet Supabase** : `unlwfvldqxfccgrrgbwf` (eu-central-1)
- **Environnement** : Mode Hybride & Offline-First (IndexedDB / LocalDb / RealtimeCircuitBreaker)
- **Devise** : Dinars Algériens (`DA` / `DZD`)
- **Taux TVA standard** : 19.00%

---

## 📋 Tableau de Bord de la Simulation

| Étape | Statut | Détails |
| :--- | :---: | :--- |
| **Étape 0 : Cadrage & Échantillonnage** | ✅ Validé | 150 produits réels initialisés. Shift `shift_sim_rush_extreme_300` ouvert avec **30 000.00 DA** de fond de caisse. |
| **Étape 1 : Phase 1 Connectée (100 Web + 50 Caisse)** | ✅ Validé | Phase 1 réussie : 100 commandes web (2 562 582,01 DA) et 50 ventes caisse (1 316 450 DA) synchronisées en direct. |
| **Étape 2 : Coupure Réseau Brutale & Bascule Offline** | ✅ Validé | 🚨 Panne Internet simulée. Circuit-breaker activé : bascule instantanée en mode 100% Offline-First sans aucun gel ni blocage de caisse. |
| **Étape 3 : Phase 2 Hors-Ligne (100 Web + 50 Caisse + Réassort)** | ✅ Validé | Phase 2 Offline réussie : 100 commandes web + 50 ventes comptoir + réapprovisionnement BL de **4 500 unités** (1 221 213,75 DA) absorbés 100% hors-ligne dans la file locale (151 opérations empilées). |
| **Étape 4 : Rétablissement Réseau & Synchronisation** | ✅ Validé | Rétablissement réseau validé : 151 opérations hors-ligne synchronisées avec succès. **Zéro collision 409** et respect absolu de l'idempotence. |
| **Étape 5 : Bilan Comptable, Déstockage & Rapprochement** | ✅ Validé | Audit mathématique 100% exact sur les 150 produits ($S_f = S_i - V + A$). Écart de caisse : **0.00 DA**. CA Total : **8 009 455,25 DA**. |

---

## 📊 Synthèse Finale Chiffrée de la Simulation Haute Charge & Coupure Réseau

### 1. Volumétrie des Flux Traités en 30 Minutes
- **Total Commandes en Ligne Ingestées** : **200 commandes** (100 en ligne + 100 en coupure réseau).
- **Total Ventes Comptoir Directes** : **100 ventes caisse** (50 en ligne + 50 en coupure réseau).
- **Total Opérations Commerciales Traitées** : **300 transactions complètes**.
- **Lignes d'Articles Commandes Web** : **6 698 lignes** (moyenne : 33.5 articles / panier).
- **Lignes d'Articles Ventes Caisse** : **3 300 lignes** (moyenne : 33.0 articles / panier).
- **Total Réassort Fournisseur Livré** : **60 références réapprovisionnées** (**+4 500 unités** physiques).
- **Volume Global de Mouvements d'Unités** : **14 498 mouvements / unités**.

### 2. Performance Financière & Rapprochement de Caisse
- **Chiffre d'Affaires Ventes Caisse (POS)** : **2 880 981,25 DA**
  - Dont Espèces : **1 914 910,83 DA**
  - Dont Carte CIB : **966 070,42 DA**
- **Volume Financier Commandes Web** : **5 128 474,00 DA**
- **Chiffre d'Affaires Global de la Session** : **8 009 455,25 DA**
- **Montant des Réceptions Fournisseur (BL)** : **1 221 213,75 DA**
- **Fond de Caisse Initial** : **30 000,00 DA**
- **Caisse Finale à la Clôture** : **1 944 910,83 DA**
- **Écart de Caisse Constaté** : **0.00 DA (Équilibre Parfait)**

### 3. Résilience & Intégrité des Données
- **Bascule Réseau en Coupure** : **100% sans perte ni plantage** (passage immédiat à IndexedDB / queue locale).
- **Consolidation Préalable par `productId`** : **100% conforme** (aucune perte de delta sur les multi-lignes).
- **Rapprochement Mathématique des Stocks ($S_f = S_i - V + A$)** : **0 discrépance sur les 150 articles audités**.
- **Conformité Schéma Supabase PostgREST** : **100% conforme** avec `TABLE_COLUMNS` pour `online_orders`, `transactions` et `purchases`.
