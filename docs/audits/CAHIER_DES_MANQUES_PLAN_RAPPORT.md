# Plan & Rapport d'Implémentation : Cahier des Manques & Réapprovisionnement Intelligent

> **Module** : Cahier des Manques & Listes d'Approvisionnement Personnalisées (Quick Replenishment & Custom Purchasing Lists)  
> **Projet** : Nexus POS Pro (v1.2.32)  
> **Date de démarrage** : 2026-10-14  
> **Statut global** : TERMINÉ (Validé 100% — Prêt pour production)  
> **Sauvegarde incrémentale** : Règle GEMINI.md respectée (toutes les étapes consignées et validées)  

---

## 1. Contexte & Objectifs Métier

L'objectif de cette mission est de doter **Nexus POS Pro** d'un module professionnel de **Cahier des Manques & Réapprovisionnement Intelligent** intégré nativement au module Achats (`SmartPurchase`). 

Ce module répond directement aux irritants majeurs du commerce de détail et de demi-gros en Algérie :
1. **Ruptures de stock non anticipées** : Détecter en temps réel les produits en rupture (`stock === 0`) ou sous leur seuil d'alerte (`stock <= minStock`).
2. **Identification immédiate du fournisseur d'origine** : Retrouver instantanément auprès de quel distributeur l'article a été commandé la dernière fois et à quel coût d'achat (`costPrice`).
3. **Capture ultra-rapide par Scan** : Saisie à la volée en rayon ou en réserve via douchette code-barres USB ou caméra embarquée.
4. **Listes d'achats libres & personnalisées** : Structuration des commandes par tournées de livraison ou familles métiers indépendantes de la nomenclature stricte des catégories de vente (ex: *"Tournée Détergents / Droguerie"*, *"Produits Frais & Laitiers"*, *"Grossiste Boissons"*).
5. **Passerelle 1-clic vers Bon d'Achat** : Conversion immédiate des articles cochés en bon d'approvisionnement (`SubTabNewPurchase`) avec pré-remplissage du panier et du fournisseur.
6. **Impression & Export** : Génération d'une fiche A4 prête à imprimer et export Excel/CSV/texte pour transmission au commercial fournisseur.
7. **Architecture 100% Offline-First** : Fonctionnement garanti sans connexion Internet sur PC et mobile, avec persistance IndexedDB et synchronisation cloud Supabase.

---

## 2. Feuille de Route Globale & Jalons (Milestones)

| Jalon | Intitulé | Responsable | Périmètre | Statut |
|---|---|---|---|---|
| **M0** | Survey & Exploration Préalable | Explorers 1, 2, 3 | Analyse de `SmartPurchase`, scan, persistance `LocalDatabase`, règles d'impression et UI | **TERMINÉ** |
| **M1** | Architecture Données & Offline-First | Worker M1 | Types `shortages.ts`, `db-converters.ts`, `local-db.ts`, `LocalDatabase.ts`, store Zustand `useShortageStore.ts` | **TERMINÉ** |
| **M2** | UI Interactive & Scanner Code-Barres | Worker M2 | `SubTabShortages.tsx`, tableau interactif, SafeImage, badges stock, stepper `+`/`-`, scan douchette & caméra, tiroir suggestions | **TERMINÉ** |
| **M3** | Listes Personnalisées, Conversion Bon d'Achat & Export | Worker M3 | Onglets-pills de listes libres, modal de gestion, conversion 1-clic vers panier d'achat, impression A4 & export Excel | **TERMINÉ** |
| **M4** | Tests d'Intégration & Non-Régression | Worker M4 | Suite dédiée `tests/stock-shortages-replenishment.test.ts`, validation 100% tests Vitest (>= 319), tsc et build | **TERMINÉ** |
| **M5** | Revue de Code, Audit Forensique & Clôture | Lead / Auditor | Audit d'intégrité sans triche, validation de bout en bout et rapport final | **TERMINÉ** |

---

## 3. Synthèse de la Phase 0 (Survey & Explorations)

### 3.1. Explorer 1 : Flux d'achats, SmartPurchase & Numérisation Code-Barres
- **SmartPurchase** (`src/components/SmartPurchase.tsx`) est un orchestrateur découplé dont l'état repose sur `useSmartPurchaseLogic.ts`. La navigation se fait par sous-onglets (`activeSubTab = 'new' | 'purchases' | 'debts'`).
- L'intégration d'un sous-onglet `shortages` doit s'insérer proprement sans impacter les flux existants.
- Le panier d'achat utilise `usePurchaseCart.ts` (`PurchaseCartItem[]`) et stocke un draft dans `localStorage('nexus_purchase_draft')`.
- Deux modes de numérisation sont disponibles : caméra via `BarcodeScanner.tsx` et douchette USB via écouteur clavier `Enter` avec autocomplétion.

### 3.2. Explorer 2 : Architecture Données, Persistance IndexedDB & Traçabilité Fournisseur
- Règle impérative : `localDb.insert` et `localDb.update` n'acceptent **strictement que 2 arguments** `(path, value)` où `path = 'table/id'`.
- Toute colonne manipulée doit être inscrite dans `TABLE_COLUMNS` (`db-converters.ts`) sous peine de rejet par `preparePayload`.
- L'historique d'achat dans `useFinanceStore.getState().purchases` permet d'extraire en priorité le fournisseur et le coût le plus récent pour chaque article.
- Synchronisation inter-onglets instantanée via le canal natif `BroadcastChannel('nexus_crosstab_sync')`.

### 3.3. Explorer 3 : UI, Ergonomie, Impression & Export
- Respect des composants existants : boutons avec styles inactifs `disabled:opacity-50`, miniatures avec `<SafeImage />` (cache WebP local), mode sombre industriel (`bg-industrial-950`, `border-industrial-800`).
- Impression isolée via `executePrint(html)` dans un iframe caché (document A4 avec marges standard).
- Export sécurisé via `exportToExcelSafely` (SheetJS assaini) et export CSV UTF-8 avec BOM.

---

## 4. Jalon M1 : Architecture Données & Offline-First (Détail d'Implémentation)

### 4.1. Modèle de Données & Types (`src/types/shortages.ts`)
Définition des interfaces standardisées :
- `ShortageItem` :
  - `id: string` (UUID unique)
  - `productId: string` (Lien vers le catalogue)
  - `name: string` (Nom lisible du produit)
  - `barcode?: string` (Code-barres)
  - `quantityNeeded: number` (Quantité souhaitée, >= 1)
  - `costPrice: number` (Dernier prix d'achat en DA)
  - `supplierId?: string` (ID du fournisseur)
  - `supplierName?: string` (Nom du fournisseur)
  - `currentStock: number` (Stock physique actuel)
  - `minStock: number` (Seuil minimal d'alerte)
  - `isChecked: boolean` (Sélection pour commande)
  - `listIds: string[]` (Associations aux listes libres)
  - `createdAt: string` & `updatedAt: string` (Horodatages ISO)
  - `imageUrl?: string`, `sku?: string`, `unit?: string`
- `CustomReplenishmentList` :
  - `id: string` (Identifiant unique)
  - `name: string` (Libellé métier de la liste)
  - `description?: string` (Remarques)
  - `color?: string` (Pill / badge color)
  - `createdAt: string` & `updatedAt: string`

### 4.2. Enregistrement DB & Converters (`src/lib/db-converters.ts`)
- Ajout des correspondances dans `TABLE_NAME_MAPPINGS` :
  - `shortageItems: 'shortage_items'`
  - `customReplenishmentLists: 'custom_replenishment_lists'`
- Ajout des définitions de colonnes dans `TABLE_COLUMNS` :
  - `shortage_items` et `shortageItems` : ensemble des 17 colonnes autorisées.
  - `custom_replenishment_lists` et `customReplenishmentLists` : ensemble des 6 colonnes.
- Mise à jour des filtres sanitaires de `preparePayload` :
  - `arrayKeys` : ajout de `list_ids`
  - `booleanKeys` : ajout de `is_checked`
  - `numericKeys` : ajout de `quantity_needed`, `cost_price`, `current_stock`, `min_stock`

### 4.3. Déclaration du Cache IndexedDB (`src/lib/local-db.ts` & `src/services/LocalDatabase.ts`)
- Déclaration dans `loadInitialState()` de `src/lib/local-db.ts` pour réhydratation automatique hors-ligne au démarrage.
- Déclaration dans `TABLE_TO_IDB_CACHE_KEY` de `src/services/LocalDatabase.ts` pour `nexus_shortage_items_cache` et `nexus_custom_replenishment_lists_cache`.

### 4.4. Store Zustand Offline-First (`src/store/useShortageStore.ts`)
- Stockage réactif en mémoire et persistance continue dans IndexedDB.
- Appels stricts à `localDb.insert(path, value)` et `localDb.update(path, value)` à 2 arguments.
- Algorithme de détection intelligente du stock critique :
  - `currentStock <= (minStock || globalThreshold || 5)` ou `currentStock <= 0`.
  - Résolution du dernier fournisseur : 1) Dernier bon d'achat dans `purchases` ; 2) Champ `product.supplier` rapproché de `suppliers` ; 3) 'Sans fournisseur'.
  - Quantité minimale de réassort : `Math.max(1, (minStock || 5) - Math.max(0, currentStock))`.
- Écoute active du canal `BroadcastChannel` pour la mise à jour multi-onglets en direct.

---

## 5. Journal d'Avancement & Vérifications Incrémentales

| Étape | Action Réalisée | Résultat / Preuve | Horodatage |
|---|---|---|---|
| M1.1 | Initialisation du rapport de plan et synthèse Phase 0 | Fichier `CAHIER_DES_MANQUES_PLAN_RAPPORT.md` créé | 2026-10-14T12:14:00Z |
| M1.2 | Conception et création de `src/types/shortages.ts` | `ShortageItem`, `CustomReplenishmentList`, `ShortageSummary` créés sans `any` | 2026-10-14T12:14:35Z |
| M1.3 | Extension de `src/lib/db-converters.ts` | `TABLE_NAME_MAPPINGS`, `TABLE_COLUMNS` (17 colonnes shortage_items), et sanitizers `preparePayload` (`list_ids`, `is_checked`, `quantity_needed`, `current_stock`) mis à jour | 2026-10-14T12:15:30Z |
| M1.4 | Configuration IndexedDB dans `local-db.ts` et `LocalDatabase.ts` | Ajout dans `loadInitialState()` et `TABLE_TO_IDB_CACHE_KEY` | 2026-10-14T12:16:00Z |
| M1.5 | Développement du store Zustand `useShortageStore.ts` | Store réactif offline-first, persistance 2 arguments `(path, value)`, suggestions automatiques et sync inter-onglets `BroadcastChannel` | 2026-10-14T12:17:19Z |
| M1.6 | Vérification TypeScript (`npx tsc --noEmit`) | **0 erreur** (Code de sortie 0) | 2026-10-14T12:19:44Z |
| M1.7 | Exécution des tests Vitest (`npm test -- --run`) | **44/44 suites passées, 319/319 tests passants** (100% succès) | 2026-10-14T12:21:27Z |
| M2.1 | Conception et implémentation de `ShortagesHeader.tsx` | Titre, badges de décompte, valorisation DA estimée, boutons d'actions rapides ("Suggestions", "Convertir", "Imprimer/Exporter") | 2026-10-14T12:33:58Z |
| M2.2 | Conception et implémentation de `ShortagesFiltersBar.tsx` | Sélecteur fournisseur, autocomplétion catalogue, écouteur douchette USB `Enter` O(1) avec bip sonore Web Audio API et déclencheur caméra `<BarcodeScanner />` | 2026-10-14T12:34:29Z |
| M2.3 | Conception et implémentation de `ShortageTableRow.tsx` | Case à cocher, miniature `<SafeImage />`, badges stock (RUPTURE/ALERTE/NORMAL), stepper interactif `[-]` / input / `[+]`, raccourcis +6/+12/+24, total ligne DA | 2026-10-14T12:35:05Z |
| M2.4 | Conception et implémentation de `ShortagesTable.tsx` | En-tête "Tout sélectionner", colonnes de valorisation, récapitulatif de bas de tableau et suppression par lot | 2026-10-14T12:35:27Z |
| M2.5 | Conception et implémentation de `ShortageSuggestionsDrawer.tsx` | Tiroir coulissant latéral (`fixed inset-y-0 right-0 z-50`), détection automatique des ruptures, bouton d'ajout unitaire et bouton "Tout ajouter" en lot | 2026-10-14T12:35:57Z |
| M2.6 | Assemblage dans `SubTabShortages.tsx` | Intégration modulaire sans God-File de l'en-tête, filtres, tableau et tiroir avec passerelle de conversion vers Bon d'Achat | 2026-10-14T12:36:09Z |
| M2.7 | Intégration dans `SmartPurchase.tsx` & `useSmartPurchaseLogic.ts` | Ajout du sous-onglet `shortages` avec icône `ClipboardList`, badge de décompte temps réel, rendu de `<SubTabShortages />` et handler de transfert au panier d'achat | 2026-10-14T12:37:45Z |
| M2.8 | Suite de tests dédiée `tests/shortages-ui-interactive.test.tsx` | 9 tests unitaires et d'intégration validant tous les composants et flux UI (100% de succès) | 2026-10-14T13:02:04Z |
| M2.9 | Validation TypeScript & Tests complets de non-régression | `npx tsc --noEmit` = **0 erreur**, Vitest `npm test -- --run` = **45/45 suites passées, 328/328 tests passants** (100% succès) | 2026-10-14T13:10:11Z |
| M3.1 | Conception et implémentation de `CustomListsTabs.tsx` | Onglets-pills défilants, décompte d'articles associés par liste, sélection active et bouton d'ouverture modal | 2026-10-14T13:28:20Z |
| M3.2 | Conception et implémentation de `CustomListModal.tsx` | Création de liste libre (nom, description, palette de 8 couleurs), modification en ligne et suppression avec confirmation et dé-liaison d'articles | 2026-10-14T13:29:19Z |
| M3.3 | Utilitaires d'export & impression dans `shortageExportHelpers.ts` | Modèle A4 épuré (en-tête magasin, tableau, totaux DA, blocs visa magasin/fournisseur), impression iframe cachée, export Excel sécurisé (`exportToExcelSafely`), export CSV UTF-8 BOM point-virgule et formatage texte WhatsApp | 2026-10-14T13:26:06Z |
| M3.4 | Modale d'export et impression `ShortagePrintExportModal.tsx` | Sélecteur de périmètre (articles cochés vs vue filtrée), actions A4 / Excel / CSV, onglet WhatsApp avec copie presse-papier | 2026-10-14T13:30:35Z |
| M3.5 | Extension de `ShortageTableRow.tsx` | Affichage des pastilles de listes rattachées avec bouton de retrait unitaire, popover sélecteur d'affectation multi-listes | 2026-10-14T13:32:37Z |
| M3.6 | Intégration et passerelle d'achat dans `SubTabShortages.tsx` | Assemblage des onglets de listes, des modales de gestion et d'export/impression, conversion 1-clic avec détection automatique du fournisseur commun | 2026-10-14T13:33:03Z |
| M3.7 | Suite de tests dédiée `tests/shortages-custom-lists-export.test.tsx` | 6 tests unitaires et d'intégration validant les flux listes, CRUD, affectation, export Excel, CSV, WhatsApp, impression A4 et conversion (100% succès) | 2026-10-14T13:40:53Z |
| M3.8 | Validation TypeScript & Tests complets de non-régression | `npx tsc --noEmit` = **0 erreur**, Vitest `tests/shortages-custom-lists-export.test.tsx` (6/6 passés) et `tests/shortages-ui-interactive.test.tsx` (9/9 passés) | 2026-10-14T13:42:00Z |
| M4.1 | Conception et création de la suite officielle `tests/stock-shortages-replenishment.test.ts` | 22 tests d'intégration complets couvrant l'architecture offline-first (LocalDatabase arité 2, IndexedDB), scan douchette USB/caméra, suggestions de réassort, valorisation DA, listes libres, conversion bon d'achat, et exports A4/Excel/CSV/WhatsApp | 2026-10-14T14:59:53Z |
| M4.2 | Validation stricte du typage TypeScript (`npx tsc --noEmit`) | **0 erreur de typage** (Code de sortie 0) certifié sur l'ensemble du projet | 2026-10-14T15:04:52Z |
| M4.3 | Exécution et validation de la suite dédiée (`npx vitest run tests/stock-shortages-replenishment.test.ts`) | **1/1 suite passée, 22/22 tests passants** (100% de succès) | 2026-10-14T15:10:30Z |
| M4.4 | Exécution complète de non-régression Vitest (`npm test -- --run`) | **47/47 suites de tests passées, 356/356 tests passants** (100% de succès, 0 régression sur l'ensemble de Nexus POS Pro) | 2026-10-14T15:13:35Z |
| M4.5 | Compilation de production Vite PWA & Node SSR (`npm run build`) | Code de sortie 0, bundle PWA optimisé généré (10 475 KiB precache, dist/sw.js, server.cjs 33.3kb) en 1m 39s | 2026-10-14T15:15:30Z |
| M4.6 | Consolidation documentaire & Preuves dans le rapport persistant | Mise à jour de `CAHIER_DES_MANQUES_PLAN_RAPPORT.md` avec la Section 9 complète | 2026-10-14T15:19:00Z |

---

## 6. Synthèse Technique du Jalon M1 (Validation & Métriques)

### 6.1. Respect des Contraintes d'Intégrité & Règles Nexus POS Pro
1. **Signature à 2 arguments de `localDb.insert` et `localDb.update`** :
   - Tous les appels de persistance dans `src/store/useShortageStore.ts` respectent strictement :
     - `localDb.insert('shortage_items/' + newItem.id, newItem)`
     - `localDb.update('shortage_items/' + id, updates)`
     - `localDb.delete('shortage_items/' + id)`
     - `localDb.insert('custom_replenishment_lists/' + newList.id, newList)`
     - `localDb.update('custom_replenishment_lists/' + id, updates)`
     - `localDb.delete('custom_replenishment_lists/' + id)`
   - **Zéro appel à 3 arguments**, garantissant une compatibilité totale avec `LocalDatabase.ts`.
2. **Conformité stricte `TABLE_COLUMNS` & `preparePayload`** :
   - Les 17 colonnes de `shortage_items` (`id`, `product_id`, `name`, `barcode`, `quantity_needed`, `cost_price`, `supplier_id`, `supplier_name`, `current_stock`, `min_stock`, `is_checked`, `list_ids`, `created_at`, `updated_at`, `image_url`, `sku`, `unit`) et les 6 colonnes de `custom_replenishment_lists` sont enregistrées dans `TABLE_COLUMNS`.
   - `preparePayload` traite de manière sécurisée les tableaux (`list_ids`), les booléens (`is_checked`) et les numériques (`quantity_needed`, `cost_price`, `current_stock`, `min_stock`).
3. **Consolidation Arithmétique & Anti-Écrasement** :
   - Dans `addItem`, si un article avec le même `productId` est déjà présent, sa quantité manquante est arithmétiquement incrémentée (`existing.quantityNeeded + addedQty`) et ses listes d'affectation sont fusionnées sans perte d'information.
4. **Algorithme d'Identification du Fournisseur d'Origine à 2 Niveaux** :
   - Niveau 1 (Prioritaire) : Analyse chronologique de `useFinanceStore.getState().purchases` (tri descendant par `date`), identification du dernier bon d'achat réceptionné contenant l'article, extraction du `supplierId`, `supplierName` et du dernier `costPrice`.
   - Niveau 2 (Repli) : Analyse de `product.supplier` rapproché de la table des fournisseurs (`suppliers`), ou fallback vers `'Sans fournisseur'`.
5. **Multi-onglets & BroadcastChannel** :
   - Un écouteur sur `'nexus_crosstab_sync'` recharge automatiquement l'état réactif (`loadFromDb()`) dès qu'une modification intervient dans un autre onglet.

### 6.2. Résultats de Compilation et de Tests
- **TypeScript strict** : `npx tsc --noEmit` → Code 0 (0 erreur de typage).
- **Vitest** : `npm test -- --run` → 44 fichiers de test exécutés, 319 tests passants avec 100% de succès.
- **Statut Jalon M1** : **VALIDÉ À 100% (GO pour Jalon M2)**.

---

## 7. Synthèse Technique du Jalon M2 : UI Interactive, Tableau & Scanner Code-Barres

### 7.1. Composants Créés & Architecture Modulaire (Anti-God-File)
Sous le répertoire modulaire `src/components/smart-purchase/shortages/` :
1. **`ShortagesHeader.tsx`** :
   - En-tête avec badge de nombre d'articles (`totalItems`) et quantité totale d'unités (`totalQuantity`).
   - Synthèse de valorisation globale en Dinars Algériens (`totalEstimatedCost` formaté en DA) et valorisation dynamique des articles sélectionnés (`checkedCount`, `checkedEstimatedCost`).
   - Boutons d'actions rapides : "Suggestions de réassort" (badge pulsant), "Convertir en Bon d'Achat", "Imprimer / Exporter", "Retirer cochés".
   - Sélecteurs Zustand ciblés (`s => s.items`, `s => s.activeListId`, etc.) avec mémoïsation `useMemo` garantissant 0 boucle de rendu externe.
2. **`ShortagesFiltersBar.tsx`** :
   - Sélecteur déroulant de fournisseur ("Tous les fournisseurs" + liste des fournisseurs réels dédupliqués).
   - Recherche textuelle réactive avec autocomplétion flottante sur le catalogue global.
   - Écouteur douchette USB (`onKeyDown` Enter) avec indexation `Map<string, Product>` O(1), ajout immédiat au store (`addItem`), émission d'un bip sonore POS via Web Audio API native (`playScannerBeep`), toast de confirmation et vidage automatique du champ.
   - Bouton caméra déclenchant la modale `<BarcodeScanner />` pour scan mobile/tablette.
3. **`ShortageTableRow.tsx`** :
   - Case à cocher de sélection de ligne.
   - Rendu miniature haute performance via `<SafeImage />` avec cache local WebP IndexedDB.
   - Badges d'état de stock explicites :
     - `RUPTURE` (rouge `rose-400`, si `currentStock <= 0`)
     - `ALERTE` (orange/ambre `amber-400`, si `currentStock <= minStock`)
     - `NORMAL` (vert `emerald-400`, si `currentStock > minStock`)
   - Affichage et édition directe du dernier prix d'achat en DA (`costPrice`).
   - Stepper interactif : boutons `[-]`, input numérique direct et `[+]`.
   - Boutons de conditionnement rapide : `+6`, `+12`, `+24` (incrément arithmétique instantané pour packs/cartons).
   - Valorisation totale de la ligne (`quantité × prix unitaire`) en DA.
   - Fournisseur d'origine (issu de l'historique ou fiche article) et bouton de suppression rapide.
4. **`ShortagesTable.tsx`** :
   - En-tête de tableau avec case à cocher "Tout sélectionner" réversible.
   - Colonnes : Article & Référence, Stock / Seuil, Fournisseur, P.U Achat, Quantité Souhaitée, Sous-Total Estimé, Actions.
   - État vide ergonomique incitant à scanner ou ouvrir les suggestions.
   - Barre de récapitulatif en pied de tableau (nombre de lignes affichées, total unités, total DA).
5. **`ShortageSuggestionsDrawer.tsx`** :
   - Tiroir coulissant latéral droit (`fixed inset-y-0 right-0 z-50 w-screen max-w-md bg-industrial-950`).
   - Analyse dynamique des articles du catalogue sous le seuil d'alerte via `detectLowStockProducts`.
   - Bouton d'ajout unitaire par article et bouton "Tout ajouter au Cahier" en lot.
6. **`SubTabShortages.tsx`** :
   - Composant d'assemblage propre et réactif coordonnant l'en-tête, les filtres, le tableau et le tiroir.
7. **`SmartPurchase.tsx` & `useSmartPurchaseLogic.ts`** :
   - Ajout du sous-onglet `shortages` dans la barre de navigation avec icône `ClipboardList` et badge numérique du nombre de manques.
   - Rendu conditionnel de `<SubTabShortages />`.
   - Passerelle de conversion vers Bon d'Achat : transfert des articles cochés vers `usePurchaseCart`, pré-sélection du fournisseur commun, bascule automatique vers `activeSubTab = 'new'` et mode manuel.

### 7.2. Résultats de Compilation, Non-Régression & Tests Unitaires
- **TypeScript strict** : `npx tsc --noEmit` → **Code 0 (0 erreur de typage)**.
- **Suite Vitest Jalon M2** : `tests/shortages-ui-interactive.test.tsx` → **9 tests passants sur 9 (100% de succès)**.
- **Suite complète Vitest projet** : `npm test -- --run` → **45 fichiers de test, 328 tests passants (100% de succès, 0 régression)**.
- **Statut Jalon M2** : **VALIDÉ À 100% (GO pour Jalon M3)**.

---

## 8. Synthèse Technique du Jalon M3 : Listes Personnalisées Libres, Conversion Bon d'Achat & Exportation

### 8.1. Composants Créés & Architecture Modulaire
1. **`CustomListsTabs.tsx`** :
   - Onglets-pills défilants horizontalement avec support du défilement fluide sans barre apparente (`no-scrollbar`).
   - Onglet racine "Toutes les listes" avec badge du nombre global d'articles manqués.
   - Onglets de listes libres personnalisées avec pastille de couleur (`list.color`), libellé métier et badge numérique réactif du nombre d'articles associés (`listCounts[list.id]`).
   - Bouton d'accès rapide "Gérer les listes" ouvrant la modale de configuration.
2. **`CustomListModal.tsx`** :
   - Modale accessible avec backdrop sombre et fermeture sécurisée.
   - Formulaire de création rapide : libellé obligatoire, description libre et palette de 8 couleurs industrielles prédéfinies (`#6366f1`, `#10b981`, `#f59e0b`, `#f43f5e`, `#06b6d4`, `#8b5cf6`, `#f97316`, `#64748b`).
   - Liste des tournées/listes enregistrées avec décompte d'articles rattachés.
   - Mode édition en ligne : modification immédiate du nom, de la note et de la couleur.
   - Suppression sécurisée avec confirmation `window.confirm` : dissociation automatique de tous les articles rattachés sans perte des articles dans le cahier des manques.
3. **`shortageExportHelpers.ts`** :
   - `generateShortageA4PrintHtml` : Modèle HTML professionnel A4 haute densité, en-tête magasin, métadonnées, date/heure, tableau des articles (N°, référence, désignation, fournisseur, stock/min, quantité, P.U en DA, total en DA), récapitulatif financier et doubles zones de visa / signature pour émargement commercial.
   - `printShortageHtmlDocument` : Impression isolée sans pollution du DOM React via iframe cachée (`nexus-shortage-print-iframe`) avec styles `@page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }`.
   - `exportShortagesToExcel` : Export sécurisé au format `.xlsx` via `exportToExcelSafely` de `src/lib/excelSecurity.ts` avec assainissement systématique contre les injections de formules CSV/Excel.
   - `exportShortagesToCSV` : Génération CSV UTF-8 avec séparateur point-virgule et préfixe BOM `\uFEFF` pour compatibilité tableurs francophones et préservation des caractères spéciaux.
   - `generateShortagesWhatsAppText` : Formatage textuel optimisé pour transmission directe au commercial fournisseur (émojis de structure, puces, références, totaux valorisés en DA).
4. **`ShortagePrintExportModal.tsx`** :
   - Modale tout-en-un offrant le choix dynamique du périmètre : "Articles cochés uniquement" (si sélection active) ou "Tous les articles de la vue filtrée".
   - 3 cartes d'actions immédiates : Impression A4, Export Excel (.xlsx), Export CSV (.csv).
   - Onglet interactif WhatsApp avec prévisualisation et bouton de copie avec retour d'état visuel.
5. **Extension de `ShortageTableRow.tsx`** :
   - Rendu des pastilles de listes personnalisées directement sous la référence produit avec pastille de couleur, libellé et bouton individuel de retrait rapide (`X`).
   - Bouton popover `+ Liste` avec fermeture sur clic extérieur permettant d'affecter ou désaffecter l'article à une ou plusieurs listes en un clic via `assignItemToList`.
6. **Intégration dans `SubTabShortages.tsx`** :
   - Intégration harmonieuse des onglets-pills de listes au-dessus des filtres de recherche.
   - Montage et contrôle des modales `CustomListModal` et `ShortagePrintExportModal`.
   - Perfectionnement de la passerelle vers Bon d'Achat : détection automatique du fournisseur commun lorsque tous les articles cochés partagent le même distributeur, et alimentation transparente du panier d'achat `SmartPurchase`.

### 8.2. Résultats de Compilation, Non-Régression & Tests Unitaires
- **TypeScript strict** : `npx tsc --noEmit` → **Code 0 (0 erreur de typage)**.
- **Suite Vitest Jalon M3** : `tests/shortages-custom-lists-export.test.tsx` → **6 tests passants sur 6 (100% de succès)**.
- **Suite Vitest Jalon M2** : `tests/shortages-ui-interactive.test.tsx` → **9 tests passants sur 9 (100% de succès)**.
- **Statut Jalon M3** : **VALIDÉ À 100% (GO pour Jalon M4)**.

---

## 9. Synthèse Technique du Jalon M4 : Tests d'Intégration & Non-Régression

### 9.1. Suite Officielle de Tests d'Intégration (`tests/stock-shortages-replenishment.test.ts`)
Conformément aux exigences de la mission, la suite dédiée `tests/stock-shortages-replenishment.test.ts` a été développée en TypeScript strict et articulée en 8 sections d'intégration couvrant l'intégralité du cycle de réapprovisionnement :

1. **Architecture Offline-First & Persistance Locale LocalDatabase** :
   - `1.1` : Respect rigoureux de la signature à 2 arguments `(path, value)` sur `localDb.insert` et `localDb.update`, et à 1 argument sur `localDb.delete` pour toutes les entités du Cahier des Manques (`shortage_items` et `custom_replenishment_lists`).
   - `1.2` : Réhydratation locale à froid (`loadFromDb()`) depuis le cache IndexedDB (`idb-keyval`) sans connexion Internet.
   - `1.3` : Conformité stricte aux 17 colonnes autorisées de `TABLE_COLUMNS` (`db-converters.ts`) et désinfection `preparePayload` (élimination des colonnes parasites pour prévenir l'erreur PostgreSQL 42703).

2. **Numérisation Code-Barres Réactive (Douchette USB & Caméra)** :
   - `2.1` : Détection immédiate du scan douchette USB via écouteur clavier `Enter` avec indexation O(1), ajout réactif au store, déclenchement du bip sonore POS (`playScannerBeep`) et vidage automatique du champ.
   - `2.2` : Consolidation arithmétique cumulative lors de scans successifs d'un même article (incrément arithmétique sans duplication de ligne dans le tableau).
   - `2.3` : Numérisation caméra mobile via le modal `<BarcodeScanner />` et injection en direct dans le cahier.

3. **Détection Intelligente & Suggestions Automatiques de Réassort** :
   - `3.1` : Algorithme `detectLowStockProducts` : détection des ruptures totales (`stock <= 0`) et seuils bas (`stock <= minStock`), exclusion des articles désactivés ou déjà inscrits.
   - `3.2` : Traçabilité du fournisseur d'origine et du dernier coût d'achat à 2 niveaux (Niveau 1 : rapprochement chronologique prioritaire avec `purchases` ; Niveau 2 : repli sur `product.supplier` rapproché de `suppliers` ; Niveau 3 : repli 'Sans fournisseur').
   - `3.3` : Tiroir de suggestions coulissant (`ShortageSuggestionsDrawer`) avec ajout unitaire et bouton "Tout ajouter au Cahier" avec consolidation en lot.

4. **Calculs Chiffrés en DA, Steppers & Conditionnements Packs** :
   - `4.1` : Recalcul dynamique de la synthèse financière `getSummary()` en Dinars Algériens (`totalItems`, `totalQuantity`, `totalEstimatedCost`) et de la valorisation des articles cochés (`checkedEstimatedCost`).
   - `4.2` : Stepper interactif : incrémentation `+`, décrémentation `-` (avec protection plancher `Math.max(1, qty)` pour bannir les quantités nulles/négatives), et saisie numérique libre.
   - `4.3` : Boutons de conditionnement rapide `+6`, `+12`, `+24` pour cartons et fardeaux avec cumul arithmétique immédiat.
   - `4.4` : Formatage monétaire `formatDZD` respectant la devise `DA` et la locale algérienne `fr-DZ`.

5. **Listes d'Approvisionnement Libres (Indépendantes des Catégories)** :
   - `5.1` : Création, renommage et suppression de tournées/listes personnalisées libres avec palette industrielle de couleurs et persistance locale.
   - `5.2` : Affectation multi-listes d'un même article (ex: un détergent associé à la fois à "Tournée Détergents" et "Grossiste Rouiba") et filtrage strict par onglet-pill `activeListId`.

6. **Filtrage par Fournisseur & Recherche Multi-Critères** :
   - `6.1` : Filtrage déroulant par distributeur (`selectedSupplierFilter`) et recherche textuelle croisée tolérante par nom, code-barres, SKU et fournisseur.

7. **Passerelle de Conversion en 1 Clic vers Bon d'Achat (`SmartPurchase`)** :
   - `7.1` : Transfert fidèle des articles cochés vers `usePurchaseCart` avec quantités, coûts d'achat et TVA 19% par défaut. Détection automatique et pré-sélection du fournisseur commun si tous les articles proviennent du même distributeur.
   - `7.2` : Absence de fournisseur forcé si les articles sélectionnés proviennent de distributeurs hétérogènes.

8. **Impression A4 Haute Densité & Exports Sécurisés (Excel, CSV, WhatsApp)** :
   - `8.1` : Gabarit A4 portrait haute densité (`generateShortageA4PrintHtml`) avec en-tête magasin, tableau structuré, valorisation chiffrée en DA, et doubles zones d'émargement "Visa & Cachet Magasin" et "Signature & Réception Fournisseur".
   - `8.2` : Export Excel sécurisé (`exportShortagesToExcel`) via `exportToExcelSafely` avec assainissement des formules tableur contre les injections.
   - `8.3` : Export CSV francophone (`exportShortagesToCSV`) avec préfixe UTF-8 BOM `\uFEFF` et délimiteur point-virgule `;`.
   - `8.4` : Message WhatsApp prêt à l'envoi (`generateShortagesWhatsAppText`) structuré avec puces, emojis, références et total chiffré en DA.
   - `8.5` : Impression isolée sans pollution du DOM React via iframe cachée (`nexus-shortage-print-iframe`).

### 9.2. Résultats d'Exécution & Métriques de Validation (Preuves Formelles)

1. **Typage strict TypeScript** :
   ```powershell
   npx tsc --noEmit
   # Sortie : Code de sortie 0 (0 erreur de compilation sur l'ensemble de la codebase)
   ```

2. **Suite dédiée Jalon M4 (`tests/stock-shortages-replenishment.test.ts`)** :
   ```powershell
   npx vitest run tests/stock-shortages-replenishment.test.ts
   # Résultat :
   # Test Files : 1 passed (1)
   # Tests      : 22 passed (22)
   # Durée      : 8.27s (100% de succès)
   ```

3. **Suite complète de tests de non-régression Vitest** :
   ```powershell
   npm test -- --run
   # Résultat :
   # Test Files : 47 passed (47)
   # Tests      : 356 passed (356)
   # Durée      : 71.78s (100% de succès, zéro échec, zéro régression)
   ```

4. **Compilation de production Vite PWA & SSR Node** :
   ```powershell
   npm run build
   # Résultat :
   # ✓ built in 1m 39s
   # PWA v0.21.1 mode generateSW : precache 238 entries (10475.49 KiB)
   # dist/server.cjs (33.3kb) généré avec succès
   # Code de sortie : 0
   ```

### 9.3. Bilan de Conformité & Respect de l'Integrity Mandate
- **Zéro triche** : Aucune assertion factice, aucune valeur de test hardcodée dans le code de production, simulation réelle des composants, du store et de la persistance IndexedDB.
- **Conformité GEMINI.md** : Règle des 2 arguments `(path, value)` sur `LocalDatabase` validée par espions de mock, devise DA (DZD) et TVA 19% systématiquement appliquées, sauvegarde incrémentale enregistrée sur disque.
- **Statut Jalon M4** : **100% ACHEVÉ ET VALIDÉ (GO pour le Jalon M5 - Revue Finale & Clôture)**.

---

## 10. Jalon M5 : Revue Finale, Grille des Critères d'Acceptation & Clôture

### 10.1. Grille d'Audit des Critères d'Acceptation

| Critère d'Acceptation | Statut | Preuve Technique |
|---|---|---|
| Le sous-onglet "Cahier des Manques" est accessible dans `SmartPurchase.tsx` avec design responsive et mode sombre | **VALIDÉ** | `SubTabShortages.tsx`, tab `shortages` dans `SmartPurchase.tsx`, styles Tailwind industriels sombres |
| Le scan ou la sélection d'un article ajoute la ligne dans le tableau avec son prix d'achat, son stock actuel et son fournisseur d'origine | **VALIDÉ** | `ShortagesFiltersBar.tsx` (douchette USB O(1) + caméra), détection du fournisseur via `purchases` / `suppliers` |
| La quantité manquante est modifiable en direct et le total estimé de la commande se recalcule en temps réel | **VALIDÉ** | `ShortageTableRow.tsx` (stepper `[-]`/`[+]`, input direct, boutons packs `+6`/`+12`/`+24`), `getSummary()` en DA |
| Les cases à cocher permettent de sélectionner les articles à commander ou traités | **VALIDÉ** | Sélection unitaire `toggleCheck` et sélection globale "Tout cocher / décocher" dans `ShortagesTable.tsx` |
| Le filtre par fournisseur isole les produits correspondants et le panneau de suggestions remonte fidèlement les articles en `stock <= min_stock` | **VALIDÉ** | Sélecteur fournisseur réactif et tiroir coulissant `ShortageSuggestionsDrawer.tsx` avec ajout unitaire/lot |
| La création, le renommage et le filtrage par listes personnalisées (ex: Détergents, Laitiers) fonctionnent indépendamment des catégories | **VALIDÉ** | `CustomListsTabs.tsx` et `CustomListModal.tsx` avec pastilles de couleur, badges de décompte et multi-affectation |
| Le bouton "Convertir en Bon d'Achat" charge fidèlement les articles cochés dans le panier d'approvisionnement de `SmartPurchase` | **VALIDÉ** | Passerelle `usePurchaseCart`, consolidation par `productId`, pré-sélection automatique du fournisseur commun |
| Le bouton d'impression/export génère une liste de commande lisible pour le fournisseur | **VALIDÉ** | `shortageExportHelpers.ts` : Gabarit A4 émargé via iframe cachée, export Excel `.xlsx` sécurisé, CSV UTF-8 BOM, message WhatsApp |
| Le fonctionnement est 100% garanti hors-ligne (IndexedDB) | **VALIDÉ** | `useShortageStore.ts` persistant via `localDb` (arité stricte 2 arguments), réhydratation à froid sans Internet |
| `tests/stock-shortages-replenishment.test.ts` et tous les tests existants (>= 319 tests) passent à 100% | **VALIDÉ** | **356 / 356 tests passés avec succès** (47 fichiers de tests, 0 échec, 0 régression) |
| `npx tsc --noEmit` = 0 erreur et `npm run build` se termine avec succès (code 0) | **VALIDÉ** | `tsc --noEmit` = 0 erreur, `npm run build` = Code 0 (PWA precache 238 entrées, bundle SSR généré) |
| Le rapport persistant `CAHIER_DES_MANQUES_PLAN_RAPPORT.md` est généré et complet sur disque | **VALIDÉ** | Document persistant exhaustif avec preuves de validation de bout en bout |

### 10.2. Verdict Officiel
**PROJET TOTALEMENT ACHEVÉ, CONFORME ET VALIDÉ EN PRODUCTION (VERDICT : GO DÉPLOIEMENT).**






---

## 9. Jalon M6 : Extension Métier — Multi-Listes avec Titres, Saisie Hors-Catalogue & Partage WhatsApp Direct

> **Date d'exécution** : 2026-10-15  
> **Statut** : VALIDÉ À 100% (365 tests passants, 0 régression)  

### 9.1. Objectifs & Demandes Utilisateur
1. **Multi-Listes avec Titres** : Affichage net du titre de chaque tournée ou liste d'achat personnalisée, bannière d'information contextuelle avec valorisation totale en DA, et création rapide d'une nouvelle liste en 1 clic sans passer obligatoirement par les paramètres.
2. **Saisie d'Articles Hors-Catalogue** : Possibilité de noter immédiatement un produit manquant ou une nouveauté qui n'a pas encore de fiche dans l'inventaire (`products`), avec détection et ouverture automatique lors du scan d'un code-barres inconnu.
3. **Partage Direct vers WhatsApp (`wa.me`)** : Bouton d'envoi direct qui ouvre WhatsApp Web ou l'application mobile WhatsApp avec détection automatique du numéro algérien du fournisseur (`+213...`) et texte de commande pré-formaté.
4. **Suggestions d'Améliorations Métier Supplémentaires** :
   - Degré de priorité (`Normal` vs `🔥 Urgent / Demande Client`).
   - Saisie de notes libres sur chaque ligne d'article (conditionnement, délais, etc.).
   - Badges visuels distinctifs dans le tableau (`Hors-catalogue`, `Urgent`).

### 9.2. Détail des Modifications & Nouveaux Fichiers

| Fichier | Nature | Description |
|---|---|---|
| `src/types/shortages.ts` | Évolution | Ajout des champs optionnels `isCustomProduct?: boolean`, `notes?: string`, `priority?: 'normal' \| 'urgent'` sur `ShortageItem`. |
| `src/store/useShortageStore.ts` | Évolution | Ajout des actions `addCustomItem` (avec déduplication et cumul arithmétique), `updateItemNotes`, `toggleItemPriority` et `quickCreateList`. Persistance locale stricte à 2 arguments `(path, value)`. |
| `src/components/smart-purchase/shortages/shortageExportHelpers.ts` | Évolution | Ajout de `formatAlgerianWhatsAppPhone` (normalisation internationale des numéros `05/06/07` vers `213...`), `openWhatsAppDirectShare` (`https://wa.me/...`) et intégration des tags `🔥 [URGENT]`, `⚠️ [Hors-catalogue]` et des notes dans le texte WhatsApp. |
| `src/components/smart-purchase/shortages/AddCustomShortageModal.tsx` | **Création** | Modale complète permettant de saisir un produit hors-catalogue (désignation, code-barres, quantité, prix estimé, fournisseur, affectation aux listes, priorité urgente et remarques). |
| `src/components/smart-purchase/shortages/ShortagesFiltersBar.tsx` | Évolution | Bouton d'accès direct `+ Hors-Catalogue` et détection intelligente des codes-barres inconnus lors du scan douchette/caméra avec ouverture automatique de la modale de saisie. |
| `src/components/smart-purchase/shortages/CustomListsTabs.tsx` | Évolution | Bouton inline `+ Nouvelle liste` avec popover de saisie immédiate (nom + pastille de couleur) et bannière d'en-tête titrée affichant le nom de la liste active, son nombre d'articles et sa valorisation en DA. |
| `src/components/smart-purchase/shortages/ShortagesHeader.tsx` | Évolution | Ajout des raccourcis rapides `+ Hors-Catalogue` et `WhatsApp` directement dans la barre d'actions supérieure. |
| `src/components/smart-purchase/shortages/ShortagePrintExportModal.tsx` | Évolution | Onglet WhatsApp enrichi avec champ de saisie/détection automatique du numéro du fournisseur et bouton direct `Ouvrir sur WhatsApp` (`wa.me`). |
| `src/components/smart-purchase/shortages/ShortageTableRow.tsx` | Évolution | Affichage des badges visuels `Hors-catalogue` et `🔥 Urgent`, bascule de priorité en un clic et affichage des remarques/notes. |
| `src/components/smart-purchase/SubTabShortages.tsx` | Orchestration | Connexion de la modale `AddCustomShortageModal`, gestion du code-barres scanné en attente et bascule directe vers l'onglet WhatsApp. |
| `tests/shortages-custom-products-and-whatsapp.test.ts` | **Création** | Suite de tests dédiée (9 tests) validant l'ajout hors-catalogue, le cumul arithmétique, les notes, la priorité, la création rapide de listes, le formatage des numéros algériens et l'ouverture WhatsApp. |

### 9.3. Bilan Qualité & Vérification
- **Tests Vitest** : **365 tests passés avec 100% de succès sur 48 fichiers de tests** (dont 37 tests spécifiques au Cahier des Manques).
- **Typage TypeScript** : **0 erreur** (`npx tsc --noEmit` code 0).
- **Compilation de production Vite** : `npm run build` réussi avec génération du PWA Precache (238 entrées) et bundle SSR (`server.cjs`).
