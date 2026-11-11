# 📐 Dossier d'Architecture Technique & Revue d'Ingénierie — Nexus POS Pro (v1.2.81)

> **Document destiné à l'équipe d'ingénierie et au Lead Architecte Fullstack.**  
> Ce document synthétise les choix de conception, les patterns d'architecture, la matrice de sécurité et les preuves de robustesse du système **Nexus POS Pro**.

---

## 🏗️ 1. Vue d'Ensemble & Stack Technique

Nexus POS Pro est conçu selon les standards les plus exigeants des systèmes de point de vente modernes : **Zéro dépendance réseau obligatoire pour vendre**, **Zéro blocage d'interface**, et **Zéro perte de données en cas d'incident physique**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   INTERFACE UTILISATEUR & MATÉRIEL                     │
│   React 19 • TypeScript Strict • Tailwind CSS v4 • Zustand 5 • PWA     │
│       Douchettes USB/HID • Imprimantes ESC/POS • Afficheur Client       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               MOTEUR D'EXÉCUTION LOCAL (OFFLINE-FIRST)                 │
│  • Base Locale : IndexedDB (idb-keyval) + SQLite (better-sqlite3)      │
│  • Cache Médias : SafeImage WebP avec persistance locale                │
│  • Session : sessionStorage isolé (zéro persistance de jeton permanent)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               │    PIPELINE DE SYNCHRONISATION ATOMIQUE │
               │      (SyncService & Worker Threads)   │
               └───────────────────┬───────────────────┘
                                   │ HTTP REST / RPCs / WebSockets
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE BACKEND CLOUD                       │
│  • Supabase Pro (PostgreSQL 15+ hébergé en eu-central-1)               │
│  • Row-Level Security (RLS) avec politique stricte is_staff()          │
│  • Fonctions RPC Atomiques : adjust_product_stock, adjust_customer_bal │
│  • Stockage : CDN Supabase Storage (Assets & Patchs de mise à jour)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 2. Piliers d'Architecture & Décisions de Conception

### A. Règle Anti-God Files & Découpage Modulaire Strict
- **Plafond strict de 500 lignes (Hard Limit)** : Aucun fichier source dans `src/` ne dépasse 500 lignes (validé automatiquement par `tests/anti-god-files-guard.test.ts`).
- **Standard d'excellence (< 350 lignes)** : Séparation stricte entre :
  - **Composants d'affichage** (`[Feature]Tab.tsx`, `[Feature]Card.tsx`)
  - **Logique métier & calculs** (`use[Feature]Logic.ts`, `[feature]Helpers.ts`)
  - **Modales & Tiroirs** isolés et injectés via `React.lazy()` + `<Suspense>` pour minimiser le coût mémoire initial.

### B. Moteur Offline-First Résilient & Concurrence Multi-Postes
- **Cumul arithmétique des deltas relatifs (Anti-Écrasement)** :
  Contrairement aux systèmes POS basiques qui envoient des valeurs absolues (`stock = 10`), Nexus POS Pro envoie exclusivement des **deltas relatifs** (`adjustment = -2`). Si 3 caisses vendent simultanément le même produit hors-ligne, les deltas s'additionnent mathématiquement sans perte lors de la synchronisation.
- **Idempotence garantie (`opId`)** :
  Chaque mutation dispose d'un identifiant cryptographique unique. En cas de micro-coupure 4G ou de renvoi en boucle, la déduplication en mémoire élimine tout risque de double vente ou de double déstockage.
- **Dead Letter Queue (DLQ)** :
  Les requêtes rejetées pour anomalie réseau sont mises en quarantaine et rejouées avec temporisation exponentielle dès la stabilisation de la connexion.

### C. Sécurité Entreprise & Défense en Profondeur
- **Hachage bcrypt (`$2a$` / `$2b$`)** : Codes PIN et mots de passe salés individuellement.
- **Rate-Limiting Anti-Brute-Force** : Verrouillage temporisé automatique après 5 tentatives infructueuses (`src/lib/security.ts`).
- **Isolation des Sessions** : Utilisation exclusive de `sessionStorage` (fermeture de l'onglet/fenêtre = destruction immédiate des identifiants en mémoire).
- **Zéro Secret Côté Client** : Aucune clé `service_role` ni mot de passe dans le bundle distribué. La clé publique `anon` est bridée par le Row-Level Security (RLS) de PostgreSQL avec vérification de rôle serveur `is_staff()`.

### D. Système de Déploiement par Patch Léger (3.25 Mo)
- Plutôt que d'obliger le client à télécharger et réinstaller un installeur lourd de 130 Mo à chaque mise à jour (avec risque d'écraser la base SQLite locale), un script de packaging automatisé génère un **Patch Delta de 3.25 Mo** appliqué en 5 secondes en conservant 100% des données locales.

---

## 🧪 3. Matrice de Qualité & Couverture de Tests

Le projet intègre **plus de 75 suites de tests automatisées** sous Vitest 4 :

| Catégorie de Test | Nombre de Suites | Objectif Validé |
|---|---|---|
| **Intégrité Typage & Code** | `tsc --noEmit`, Anti-God Files | **0 erreur TypeScript**, aucun fichier > 500 lignes |
| **Sécurité & Pentest** | `security-audit-enterprise.test.ts` | Protection Brute-force, RLS, Injections SQL, Vol de session |
| **Chaos Engineering** | `extreme-chaos-and-stress.test.ts` | Coupure de courant en plein vol, 5 caisses simultanées, réseau 4G flottant |
| **Benchmarks de Performance** | `general-performance-benchmark.test.ts` | 27 500 calculs/s, 70 500 scans/s, 1.4 ms par vente |
| **Métier & Comptabilité** | Caisse, Trésorerie, Achats, TVA 19% | Exactitude financière en Dinars Algériens (DZD) |

---

## ⚡ 4. Métriques de Performance Réelles

* **Latence de calcul d'un ticket complet :** `0.036 ms` (36 microsecondes)
* **Latence de scan douchette EAN-13 :** `0.014 ms` (70 500 scans/seconde)
* **Recherche texte catalogue (15 000 articles) :** `9.0 ms` (affichage 60 FPS)
* **Temps de validation d'une vente en rush :** `1.4 ms` (~690 ventes/seconde)
* **Taille du bundle applicatif compressé :** `3.25 Mo` (261 micro-chunks en Lazy Loading)

---

## 🚀 5. Commandes Utiles pour l'Équipe Technique

```bash
# 1. Vérification stricte des types TypeScript (doit retourner 0 erreur)
npm run lint

# 2. Exécution de l'ensemble des suites de tests automatisées
npm test

# 3. Lancement du banc d'épreuve de Chaos & Stress
npx vitest run tests/extreme-chaos-and-stress.test.ts

# 4. Lancement du benchmark de performance
npx vitest run tests/general-performance-benchmark.test.ts

# 5. Build de production optimisé
npm run build

# 6. Génération et téléversement du patch ultra-léger (3 Mo)
npm run patch
```
