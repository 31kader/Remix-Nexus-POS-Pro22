# 🏷️ Rapport Officiel : Simulation Moteur Promotionnel, Vouchers, Fidélité & Déduction Mixte

- **Date / Horodatage** : 2026-11-03T17:45:00+01:00
- **Version Nexus POS Pro** : v1.2.70
- **Projet Supabase** : `unlwfvldqxfccgrrgbwf` (eu-central-1)
- **Devise** : Dinars Algériens (`DA` / `DZD`)
- **Taux de TVA Standard** : 19.00%
- **Périmètre Testé** : Remises %, Remises Fixes, Buy X Get Y, Vouchers avec Décrémentation, Fidélité & Anti-Total Négatif

---

## 📋 Tableau de Bord de la Simulation Moteur Promotionnel & Fidélité

| Étape | Statut | Détails |
| :--- | :---: | :--- |
| **Étape 0 : Initialisation Référentiel Commercial, Promos, Vouchers & Fidélité** | ✅ Validé| Catalogue 10 articles, 3 règles promos (% rayon, seuil 10k, B2G1 café), 5 vouchers (dont expiré et avec seuil), 5 clients fidélité initialisés.|
| **Étape 1 : Ventes avec Promotions Dynamiques (% Catégorie et Remise Fixe)** | ✅ Validé| 15 ventes enregistrées (Brut : 198 000 DA, Remises : 30 000 DA, Net : 168 000 DA). Remises 15% électronique et franchissements du seuil 10k vérifiés.|
| **Étape 2 : Offres Conditionnelles "Achetez X, Obtenez Y" (Lots / Bundle)** | ✅ Validé| 10 ventes de cafés traitées (Brut : 18 500 DA, 11 cafés offerts déstockés pour 5 500 DA, Net : 13 000 DA).|
| **Étape 3 : Application & Décrémentation Fractionnée des Bons d'Achat** | ✅ Validé| 10 transactions vouchers traitées (Brut : 48 200 DA, Déductions Vouchers : 17 000 DA, Net : 31 200 DA). Décrémentation fractionnée, passage à used et rejets vérifiés.|
| **Étape 4 : Déduction Mixte Points Fidélité & Ré-accumulation sur le Net** | ✅ Validé| 5 ventes fidélité traitées (Brut : 34 000 DA, Promo : 1 000 DA, Réduction Fidélité : 4 750 DA, Net : 28 250 DA). 950 pts déduits, 282 pts crédités sur le net.|
| **Étape 5 : Audit Comptable, Assiette Fiscale TVA 19% & Écart 0.00 DA** | ✅ Validé| Balance certifiée (Brut : 298 700 DA, Remises : 58 250 DA, Net : 240 450 DA, HT : 202 058.82 DA, TVA 19% : 38 391.18 DA, Écart : 0.00 DA).|

---

---

---

---

---

## 📊 Synthèse Finale Officielle de la Campagne Promotionnelle

### 1. Volumes & Transactions de la Campagne (40 Ventes)
- **Ventes Promotionnelles Dynamiques (% et Fixe)** : **15 ventes** (Brut : **198 000.00 DA**, Remises : **30 000.00 DA**, Net : **168 000.00 DA**)
- **Ventes Offres Conditionnelles (Lots Buy X Get Y)** : **10 ventes** (Brut : **18 500.00 DA**, Déstockage 11 cafés offerts : **5 500.00 DA**, Net : **13 000.00 DA**)
- **Ventes avec Bons d'Achat (Vouchers)** : **10 ventes** (Brut : **48 200.00 DA**, Déductions bons : **17 000.00 DA**, Net : **31 200.00 DA**)
- **Ventes avec Déduction Points Fidélité** : **5 ventes** (Brut : **34 000.00 DA**, Remises promo : **1 000.00 DA**, Fidélité : **4 750.00 DA**, Net : **28 250.00 DA**)

### 2. Grand Livre des Remises et Déductions Commerciales
| Catégorie de Réduction | Règle / Mécanisme Appliqué | Montant Déduit |
| :--- | :--- | :---: |
| **Remises Promotionnelles Spéciales** | Remise 15% Rayon Électronique + Remise Fixe 1 000 DA (seuil 10k) | **31 000.00 DA** |
| **Offres Conditionnelles Lots (B2G1)** | 11 unités déstockées gratuitement (Café P05) | **5 500.00 DA** |
| **Bons d'Achat & Vouchers Décomptés** | Cartes cadeaux et coupons consommés (fractionnés & soldés) | **17 000.00 DA** |
| **Programme de Fidélité Client** | 950 points convertis en réduction monétaire (1 pt = 5.00 DA) | **4 750.00 DA** |
| **TOTAL DES RÉDUCTIONS COMMERCIALES** | **Cumul de toutes les remises accordées** | **58 250.00 DA** |

### 3. Rapprochement Fiscal & Assiette TVA 19% (Algérie)
- **Chiffre d'Affaires Brut Commercial** : **298 700.00 DA**
- **(-) Total des Réductions Commerciales** : **-58 250.00 DA**
- **(=) Chiffre d'Affaires Net Facturé & Encaissé** : **240 450.00 DA**
- **Assiette Fiscale Hors Taxes (HT)** : **202 058.82 DA**
- **TVA à Reverser (Taux 19.00%)** : **38 391.18 DA**
- **Écart de Réconciliation Comptable** : **0.00 DA (Équilibre Absolu)**.
