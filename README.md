# 🛒 Nexus POS Pro (v1.2.73)

Système de Point de Vente (POS) moderne, ultra-performant et **offline-first**, conçu pour les commerces de détail et supermarchés. Adapté aux normes comptables et commerciales algériennes (Devise **DA**, TVA paramétrable `0%` par défaut).

![Tests](https://img.shields.io/badge/Tests-744%2F744%20Passing-success)
![Suites](https://img.shields.io/badge/Suites-99%2F99%20Passing-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20errors-blue)
![React](https://img.shields.io/badge/React-19-cyan)
![Vite](https://img.shields.io/badge/Vite-6-purple)
![Supabase](https://img.shields.io/badge/Supabase-Pro-emerald)
![PWA](https://img.shields.io/badge/PWA-Offline%20First-orange)

---

## 🌟 Points Forts de l'Architecture

* **Offline-First Résilient** : Fonctionnement ininterrompu même en cas de coupure Internet complète grâce à **IndexedDB** (`idb-keyval`) et **Service Workers** (`Workbox`). File d'attente intelligente (`SyncService`) avec reprise automatique, protection contre la purge en cas de perte de connectivité (Dead Letter Queue protégée), et cumul arithmétique garanti des deltas financiers et de stock.
* **Mises à Jour Atomiques & Idempotentes** : Décrémentation et ajustement des stocks en temps réel via des fonctions RPC PostgreSQL atomiques (`adjust_product_stock`, `apply_stock_adjustment`), et ajustement des soldes clients avec clé d'idempotence (`adjust_customer_balance`).
* **Sécurité & Isolation** :
  * Mots de passe et codes PIN hachés avec **bcrypt** (`$2a$` / `$2b$`).
  * Rate-limiting temporisé persistant sur la saisie de PIN (60s après 5 échecs).
  * Sessions de caisse isolées en `sessionStorage` (évite les chevauchements multi-onglets).
  * Chiffrement local des compteurs de tentatives de connexion anti-bruteforce via `src/lib/security.ts`.
  * Zéro identifiant sensible en dur dans le code (`import.meta.env`).
* **Optimisation des Performances** :
  * Découpage en chunks asynchrones (`React.lazy()` + `Suspense`).
  * Modularité des composants d'envergure (`CustomerDetailTabs`, `CatalogPrinter`) découpés en sous-modules à responsabilité unique.
  * Pagination standardisée (50 éléments/page) et listes virtualisées (`react-window`).
  * Images produits compressées en WebP et servies depuis le CDN Supabase Storage avec cache local (`SafeImage`).
* **Multi-Plateforme** : Web PWA installable, application Desktop (Electron) et mobile (Capacitor Android).

---

## 🛠️ Stack Technique

* **Frontend** : React 19, TypeScript (~5.8), Vite 6, Tailwind CSS v4, Zustand 5, Lucide Icons, Motion.
* **Base de Données & Backend** : Supabase Pro (PostgreSQL 15+, Row-Level Security, RPCs), Express 4 + Socket.io (serveur local pour afficheur client / imprimante).
* **Stockage Local** : IndexedDB (`idb-keyval`), Web Storage API (`sessionStorage`).
* **Packaging & Desktop** : Electron 42, electron-builder, Capacitor 8 (Android).
* **Tests & Qualité** : Vitest 4 (302 tests sur 41 suites), Testing Library, TypeScript strict `tsc --noEmit`.

---

## 🚀 Démarrage Rapide

### 1. Prérequis
* **Node.js** >= 20.x
* **npm** >= 10.x

### 2. Installation
```bash
# Cloner le dépôt
git clone <url-du-depot>
cd Remix-Nexus-POS-Pro

# Installer les dépendances
npm install
```

### 3. Configuration des Variables d'Environnement
Copiez le fichier d'exemple et renseignez vos identifiants Supabase :
```bash
cp .env.example .env
```

Contenu type de `.env` :
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique

# Owner & Admin Credentials
VITE_OWNER_EMAIL=gerant@example.com
VITE_OWNER_UID=uuid-de-votre-compte-owner
VITE_ADMIN_EMAIL=admin@example.com

# Options
VITE_APP_URL=http://localhost:3000
GEMINI_API_KEY=votre-cle-gemini-optionnelle
```

### 4. Lancement en Développement
```bash
npm run dev
```
L'application est accessible sur `http://localhost:3000` (ou port assigné par Vite).

---

## 🧪 Tests et Qualité de Code

```bash
# Lancer l'ensemble des tests unitaires et d'intégration (302 tests)
npm test

# Vérification stricte des types TypeScript (0 erreur)
npm run lint

# Lancer en développement local avec Vite HMR
npm run dev

# Nettoyage multiplateforme du build
npm run clean

# Build de production (Vite PWA + serveur Express esbuild)
npm run build
```

---

## 📁 Organisation du Projet

```text
├── docs/                   # Documentation complète classée (audits, simulations, guides)
│   ├── audits/             # 26 rapports d'audit, sécurité CWE, Lighthouse et certifications
│   ├── simulations/        # 15 rapports de simulation haute charge, P2P et reprise sur sinistre
│   ├── guides/             # Cahier des charges, guides de migration Supabase et stockage
│   └── INDEX.md            # Sommaire et cartographie détaillée de toute la documentation
├── src/                    # Code source de l'application
│   ├── components/         # Composants UI modulaires, écrans métier et modals lazy-loadés
│   ├── config/             # Configuration globale (devise DA, settings, credentials owner)
│   ├── hooks/              # Custom React hooks métier (.ts) et logique de synchronisation
│   ├── lib/                # Convertisseurs de schémas (db-converters), sécurité, helpers
│   ├── services/           # Services clés (SyncService, LocalDatabase, AuthService)
│   ├── store/              # Stores d'état global Zustand optimisés avec sélecteurs atomiques
│   ├── types/              # Schémas de types TypeScript stricts (database.types.ts, sales, etc.)
│   ├── supabase.ts         # Client Supabase typé createClient<Database>()
│   └── App.tsx             # Composant racine avec gestion des permissions et thèmes
├── tests/                  # 99 suites de tests automatisés (744 tests passants Vitest)
│   └── simulations/        # 11 suites de simulation avancées (rapports écrits dans docs/simulations/)
├── supabase/               # Infrastructure Supabase
│   ├── migrations/         # Migrations SQL versionnées, fonctions RPC atomiques & RLS
│   └── setup/              # Scripts SQL d'installation et de configuration de magasin
├── electron/               # Configuration et scripts du client Desktop
├── server.ts               # Serveur Express local (Vite HMR en dev, passerelle d'impression en prod)
├── vite.config.ts          # Configuration du bundler Vite
├── vitest.config.ts        # Configuration du framework de test Vitest
├── capacitor.config.ts     # Configuration de l'application mobile Capacitor Android
└── GEMINI.md               # Règles impératives de développement et architecture
```

---

## 📄 Documentation & Rapports
Pour consulter la documentation complète, référez-vous à [**docs/INDEX.md**](docs/INDEX.md) :
* **Audits & Sécurité** : `docs/audits/` (Audit Supabase Post-Refonte, Pentest 14 CWE, Audit 360)
* **Simulations Haute Charge** : `docs/simulations/` (100 commandes/50 ventes, coupure réseau, clôture Z)
* **Spécifications & Guides** : `docs/guides/` (Cahier des charges, migration Supabase, optimisation stockage)
* **Règles & Conventions Métier** : `GEMINI.md`

---

## 📄 Licence
Copyright © 2026 Nexus POS. Tous droits réservés.
