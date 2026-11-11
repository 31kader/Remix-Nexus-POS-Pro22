# Rapport de Benchmark des Performances Générales (Nexus POS Pro)

> **Projet** : Nexus POS Pro (`v1.2.81`)  
> **Environnement de mesure** : Vitest + V8 Engine + Node.js (Windows)  
> **Date du Benchmark** : 11 Novembre 2026  
> **Statut global** : ⚡ **Performances Exceptionnelles — 5 / 5 Benchmarks Validés**

---

## 📊 Tableau de Synthèse des Mesures Réelles

| Module & Opération Testée | Volume & Charge | Temps Total Mesuré | Débit Réel / Vélocité | Latence par Opération | Standard Industrie | Statut |
|---|---|---|---|---|---|---|
| **1. Calculs Caisse & TVA 19%** | 10 000 tickets complets | 364 ms | **~27 500 calculs/s** | **0.036 ms** (36 µs) | < 10 ms | ⚡ **Fulgurant** |
| **2. Scan Douchette Code-Barres** | 50 000 résolutions O(1) | 710 ms | **~70 500 scans/s** | **0.014 ms** (14 µs) | < 50 ms | ⚡ **Instantané** |
| **3. Recherche Plein Texte** | 15 000 articles du catalogue | 45 ms (5 requêtes) | **~110 recherches/s** | **9.0 ms** | < 100 ms | ⚡ **Fluide** |
| **4. Historique Transactions** | 10 000 ventes (Filtre + Tri + Page 50) | 10 ms | **100 requêtes/s** | **10.0 ms** | < 200 ms | ⚡ **Instantané** |
| **5. Débit Ingestion Sync Queue** | 5 000 mouvements de stock | 6 ms | **~830 000 ops/s** | **0.0012 ms** (1.2 µs) | < 5 ms | ⚡ **Fulgurant** |

---

## 🔬 Analyse Détaillée des 5 Piliers de Performance

### 1. Pilier Caisse : Calculs Financiers DZD & Ventilation Fiscale
- **Ce qui est calculé :** Panier multi-articles avec prix unitaires en DA, remises en pourcentage par ligne, total net HT, TVA légale algérienne de 19%, total TTC et calcul de rendu de monnaie sur gros billet (ex: 5 000 DA).
- **Résultat :** **36 microsecondes par panier**. Le calcul complet d'un ticket de caisse s'exécute à la vitesse de la lumière, sans aucune latence ressentie par le client ou le caissier.

### 2. Pilier Matériel : Réactivité au Lecteur Code-Barres (Douchette)
- **Ce qui est mesuré :** Résolution par table de hachage `Map<string, Product>` d'un code EAN-13 parmi 15 000 références.
- **Résultat :** **70 500 scans par seconde** (soit 0.014 milliseconde par bip de douchette). L'ajout au panier est immédiat dès l'émission du bip sonore de la douchette.

### 3. Pilier Recherche : Filtrage en Temps Réel dans le Catalogue
- **Ce qui est mesuré :** Recherche textuelle floue sur 15 000 articles combinant nom de produit, catégorie, marque (ex: Cevital, Candia, Ifri) et code-barres.
- **Résultat :** **9 millisecondes**. À chaque lettre tapée au clavier par le caissier, la liste des produits s'actualise instantanément sans gel de l'affichage (60 FPS garanti).

### 4. Pilier Données : Tri et Pagination de l'Historique de Vente
- **Ce qui est mesuré :** Filtrage par employé, tri chronologique décroissant et extraction de la première page de 50 transactions sur une base de 10 000 ventes.
- **Résultat :** **10 millisecondes**. Grâce à la règle obligatoire de pagination (50 items/page), l'écran des ventes reste ultra-rapide même après plusieurs années d'historique en magasin.

### 5. Pilier Offline-First : Moteur de Synchronisation et Consolidation Relative
- **Ce qui est mesuré :** Ingestion en rafale de 5 000 deltas de stock et fusion arithmétique intelligente par clé de produit.
- **Résultat :** **6 millisecondes pour 5 000 opérations**, soit un débit maximal théorique de **830 000 deltas par seconde** en mémoire avant écriture locale.

---

## 📦 Poids & Optimisation Frontend (Bundle & Assets)

- **Architecture :** Découpage modulaire complet (`React.lazy` + `Suspense`) en **261 micro-chunks**.
- **Taille totale décompressée (`dist/assets`) :** 12.4 Mo (répartis intelligemment par onglet).
- **Taille du Patch de mise à jour compressé :** **3.25 Mo** (téléchargement et application en moins de 5 secondes).
