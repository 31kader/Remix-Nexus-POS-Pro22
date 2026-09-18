# 🛒 Nexus POS Pro (v1.2.12)

Système de Point de Vente (POS) moderne, ultra-performant et **offline-first**, conçu pour les commerces de détail et supermarchés. Adapté aux normes comptables et commerciales algériennes (Devise **DA**, TVA **19%**).

![Tests](https://img.shields.io/badge/Tests-72%2F72%20Passing-success)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![React](https://img.shields.io/badge/React-19-cyan)
![Vite](https://img.shields.io/badge/Vite-6-purple)
![Supabase](https://img.shields.io/badge/Supabase-Pro-emerald)
![PWA](https://img.shields.io/badge/PWA-Offline%20First-orange)

---

## 🌟 Points Forts de l'Architecture

* **Offline-First Résilient** : Fonctionnement ininterrompu même en cas de coupure Internet complète grâce à **IndexedDB** (`Dexie` / `idb-keyval`) et **Service Workers** (`Workbox`). File d'attente intelligente (`SyncService`) avec reprise automatique et gestion des conflits (Dead Letter Queue).
* **Mises à Jour Atomiques** : Décrémentation et ajustement des stocks en temps réel via des fonctions RPC PostgreSQL atomiques (`adjust_product_stock`), éliminant les conditions de concurrence lors des ventes simultanées.
* **Sécurité & Isolation** :
  * Mots de passe et codes PIN hachés avec **bcrypt** (`$2a$` / `$2b$`).
  * Sessions de caisse isolées en `sessionStorage` (évite les chevauchements multi-onglets).
  * Chiffrement local des compteurs de tentatives de connexion anti-bruteforce.
  * Zéro identifiant sensible en dur dans le code (`import.meta.env`).
* **Optimisation des Performances** :
  * Découpage en chunks asynchrones (`React.lazy()` + `Suspense`).
  * Pagination standardisée (50 éléments/page) et listes virtualisées (`react-window`).
  * Images produits compressées en WebP et servies depuis le CDN Supabase Storage avec cache local (`SafeImage`).
* **Multi-Plateforme** : Web PWA installable, application Desktop (Electron) et mobile (Capacitor Android).

---

## 🛠️ Stack Technique

* **Frontend** : React 19, TypeScript (~5.8), Vite 6, Tailwind CSS v4, Zustand 5, Lucide Icons, Motion.
* **Base de Données & Backend** : Supabase Pro (PostgreSQL 15+, Row-Level Security, RPCs), Express 4 + Socket.io (serveur local pour afficheur client / imprimante).
* **Stockage Local** : IndexedDB (Dexie), Web Storage API (`sessionStorage`).
* **Packaging & Desktop** : Electron 42, electron-builder, Capacitor 8 (Android).
* **Tests & Qualité** : Vitest 4, Testing Library, TypeScript `tsc --noEmit`.

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
# Lancer l'ensemble des tests unitaires et d'intégration
npm test

# Vérification stricte des types TypeScript
npm run lint

# Build de production (Vite + serveur Express)
npm run build
```

---

## 📁 Organisation du Projet

```text
├── src/
│   ├── components/         # Composants UI, écrans métier et modals lazy-loadés
│   ├── config/             # Configuration globale (devise DA, TVA 19%, credentials owner)
│   ├── hooks/              # Custom React hooks (fetch données, stats, permissions)
│   ├── lib/                # Convertisseurs de schémas (db-converters), sécurité, helpers
│   ├── services/           # Services clés (SyncService, LocalDatabase, AuthService)
│   ├── store/              # Stores d'état global Zustand (panier, utilisateurs, inventaire)
│   ├── supabase.ts         # Client Supabase & helpers de stockage CDN
│   └── App.tsx             # Composant racine avec gestion d'erreurs & thèmes
├── tests/                  # 18 fichiers de tests automatisés (Vitest)
├── electron/               # Configuration et scripts du client Desktop
├── server.ts               # Serveur Express local (Socket.io, passerelle périphériques)
├── supabase_atomic_stock.sql  # Procédures stockées Postgres atomiques
└── supabase_rls_policies.sql # Politiques de sécurité Supabase RLS
```

---

## 📄 Licence
Copyright © 2026 Nexus POS. Tous droits réservés.
