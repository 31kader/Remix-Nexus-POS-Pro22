# Original User Request

## 2026-09-25T13:27:10Z

Réaliser un audit technique et fonctionnel complet à 360° de l'application de caisse **Nexus POS Pro v1.2.14** (React + Vite + TypeScript + Supabase + IndexedDB Offline-First + Android Capacitor), corriger automatiquement tous les bugs ou failles **Critiques** et **Majeurs** détectés, et produire un rapport complet en français détaillant **ce qui va bien** et **ce qui ne va pas bien** sur tous les aspects de l'application.

Working directory: c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro
Integrity mode: development

## Verification Resources
- Suite de tests unitaires et d'intégration existante dans `tests/` (`npm test` via Vitest — 22 fichiers de tests).
- Vérificateur de types TypeScript (`npx tsc --noEmit`) et compilateur de production (`npm run build`).
- Règles d'architecture et de sécurité du projet dans `GEMINI.md` (`src/lib/db-converters.ts`, `src/services/SyncService.ts`, `src/services/LocalDatabase.ts`, `src/lib/security.ts`).

## Requirements

### R1. Audit Exhaustif sur 6 Axes Majeurs
Inspecter l'intégralité du code source (`src/`) sur les 6 axes suivants :
1. **Logique Métier & Caisse (POS)** : Calculs de panier, TVA (19% Algérie, devise `DA`/`DZD`), remises, retours clients (déduction des points de fidélité et recalcul du chiffre d'affaires/stock), dettes clients, gestion des commandes (`Orders`), achats intelligents (`SmartPurchase`) et clôture de caisse (`CashManagement`).
2. **Synchronisation Offline-First & Base de Données** : Conformité stricte des appels `localDb.insert(path, value)` / `localDb.update(path, value)` (toujours 2 arguments), présence de toutes les colonnes de payload dans `TABLE_COLUMNS` de `src/lib/db-converters.ts`, fusion des upserts partiels avec le cache local, et résilience de `SyncService.ts` / `supabaseFetchHelper.ts`.
3. **Sécurité & Authentification** : Absence d'identifiants/clés codés en dur, stockage session en `sessionStorage`, hachage bcrypt des PINs, contrôle des permissions par rôle, validation MIME des images et confirmation des actions destructives.
4. **Performance & Ergonomie UI** : Pagination des listes volumineuses (50 items/page), sélecteurs Zustand ciblés, chargement `React.lazy()` + `Suspense`, utilisation de `<SafeImage />`, cohérence du thème Clair/Sombre et correspondance exacte des onglets `Sidebar.tsx` ↔ `TabRenderer.tsx`.
5. **Fiabilité des Rapports & Impression** : Exactitude mathématique des rapports (`DetailedReports`, `ProfitsReport`, `GroupedSalesAndBasketsReport`, `LossesReport`, `StockValueReport`, `CashflowReport`) et des services d'impression (`receiptPrintService`, `catalogPrintService`, `labelPrintService`).
6. **Qualité du Code & Couverture de Tests** : Détection des cas limites non gérés (`null`/`undefined`/`NaN`), fuites d'écouteurs d'événements ou d'intervalles, et dette technique résiduelle.

### R2. Correction Automatique des Anomalies Critiques & Majeures
Corriger directement dans le code source tous les bugs **Critiques** et **Majeurs** découverts lors de l'audit, tout en préservant l'architecture existante, les raccourcis clavier caisse (`F1`, `F2`, `F4`, `F8`, `F10`) et le style Pro Minimaliste.

### R3. Rapport Final Structuré en Français (`AUDIT_360_RAPPORT_COMPLET.md`)
Rédiger un rapport complet et lisible en français contenant :
1. **Bilan Global & Notes sur 10 par Axe** (Tableau récapitulatif des 6 axes).
2. **✅ Ce qui va bien (Points Forts)** : Liste détaillée des mécanismes robustes de l'application avec références exactes aux fichiers (`src/...:Lxx`).
3. **❌ Ce qui ne va pas bien (Anomalies Détectées)** : Liste classée par sévérité (**Critique**, **Majeur**, **Mineur**), indiquant pour chaque point :
   - Le fichier et la ligne exacte (`src/...:Lxx`),
   - Le problème concret et son impact métier,
   - Le statut : **Corrigé automatiquement** (avec explication du correctif appliqué) ou **Recommandation d'amélioration**.

## Acceptance Criteria

### Vérification Objective & Garde-fous
- [ ] Chaque constat ("ce qui va bien" et "ce qui ne va pas bien") cite le fichier exact et la plage de lignes vérifiée dans `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro`.
- [ ] Tous les bugs **Critiques** et **Majeurs** identifiés sont corrigés dans le code source et vérifiés par un test ou une assertion reproductible.
- [ ] `npx tsc --noEmit` retourne **0 erreur**.
- [ ] `npm test` passe à **100%** (toutes les suites Vitest existantes + nouveaux tests éventuels passent au vert).
- [ ] `npm run build` compile le bundle de production sans erreur.
- [ ] Le rapport complet en français est généré dans `AUDIT_360_RAPPORT_COMPLET.md` à la racine du projet.
