# Nexus POS Pro — Règles de Projet

## Contexte
- Application de caisse (POS) : React + Vite + TypeScript + Supabase (Plan Pro)
- Projet Supabase : `unlwfvldqxfccgrrgbwf` (région `eu-central-1`)
- Architecture **offline-first** avec IndexedDB (idb-keyval)
- Toujours répondre en **français**

## Conventions de Code
- Devise : **DA** (Dinars Algériens), code ISO : `DZD`
- Taux TVA par défaut : **19%** (Algérie)
- Version actuelle : **v1.2.11**
- Tous les emails/UIDs sensibles sont dans `.env` (jamais hardcodés)
- Les PINs utilisent **bcrypt** (`$2a$` / `$2b$`)
- La session utilisateur est en **sessionStorage** (pas localStorage)
- Les données sensibles (compteurs login) utilisent `setSecureItem`/`getSecureItem` de `src/lib/security.ts`

## Architecture Fichiers Clés
- `src/services/SyncService.ts` — File de synchronisation offline → Supabase
- `src/services/LocalDatabase.ts` — Base locale IndexedDB
- `src/lib/db-converters.ts` — TABLE_COLUMNS + TABLE_NAME_MAPPINGS + preparePayload
- `src/hooks/data-fetching/useProductsAndCoreData.ts` — Chargement données
- `src/config/ownerConfig.ts` — Credentials owner (via import.meta.env)
- `src/lib/security.ts` — Fonctions de chiffrement XOR+Base64

## Règles de Sécurité
- Ne JAMAIS hardcoder d'emails, UIDs, ou clés API dans le code source
- Toujours valider le type MIME avant upload d'image
- Le login POS est restreint aux tables `users` et `employees` uniquement
- Les actions destructives (suppression, purge) nécessitent un `confirm()`
- Vérifier le rôle admin contre l'email authentifié (pas seulement IndexedDB)

## Règles de Performance
- Pagination obligatoire (50 items/page) pour les listes de produits et transactions
- Utiliser des sélecteurs Zustand ciblés (`s => s.field`) et non le store entier
- Tous les onglets/modals doivent être en `React.lazy()` + `Suspense`
- Utiliser `<SafeImage />` (cache WebP IndexedDB) au lieu de `<img />` brut

## Règles de Synchronisation (Offline-First)
- `localDb.insert` et `localDb.update` n'acceptent que **2 arguments** : `(path, value)` où `path = 'table/id'` (jamais 3 arguments)
- Toute colonne utilisée dans un payload Supabase DOIT exister dans `TABLE_COLUMNS` de `db-converters.ts`
- Les upserts partiels (ex: mise à jour du solde/points client en caisse) DOIVENT fusionner avec le cache local pour conserver les champs NOT NULL (ex: `name`)
- `SyncStudio.tsx` DOIT utiliser des colonnes valides ou `preparePayload()` au lieu d'injecter des colonnes inexistantes en DB (comme `address`)
- Les tables avec >100 entrées potentielles (customers, transactions) DOIVENT avoir un limit adéquat (>=500) ou une pagination dans `supabaseFetchHelper.ts`

## Règles UI / Navigation
- Tout identifiant `setActiveTab('xxx')` dans `Sidebar.tsx` ou boutons de redirection DOIT avoir un `case 'xxx'` correspondant dans `TabRenderer.tsx`
- Les modals et panneaux latéraux DOIVENT supporter le mode sombre (`dark:bg-...`, `dark:text-...`)
- Les boutons avec attribut `disabled` DOIVENT avoir les styles visuels d'inactivité (`disabled:opacity-50 disabled:cursor-not-allowed`)
- Éviter `overflow-hidden` strict sur les conteneurs ayant des infobulles/popups en positionnement `absolute`
