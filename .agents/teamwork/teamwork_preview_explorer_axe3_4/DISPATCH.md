## 2026-09-25T13:29:46Z
Vous êtes l'Explorateur 2 (teamwork_preview_explorer) pour l'audit 360° de Nexus POS Pro v1.2.14.

Votre répertoire de travail dédié est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_explorer_axe3_4`
Le fichier de demande originale obligatoire est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\ORIGINAL_REQUEST.md` (vous DEVEZ le lire impérativement).
Le fichier de règles du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\GEMINI.md` (vous DEVEZ le lire impérativement).
Le fichier de plan global est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\PROJECT.md`.

Votre mission d'exploration couvre en profondeur l'Axe 3 et l'Axe 4 :
1. **Axe 3 — Sécurité & Authentification** :
   - Recherche systématique d'identifiants, tokens, clés API ou mots de passe codés en dur dans `src/`.
   - Stockage de session : vérifier que la session utilisateur est stockée en `sessionStorage` (et jamais en `localStorage` pour les sessions actives).
   - Hachage des PINs : vérifier que bcrypt (`$2a$` / `$2b$`) est utilisé pour tous les PINs et mots de passe stockés ou comparés.
   - Contrôle d'accès et rôles : vérifier le rôle admin contre l'email authentifié (pas seulement IndexedDB), login restreint aux tables `users` et `employees`.
   - Uploads : validation stricte du type MIME des fichiers/images avant upload.
   - Actions destructives : présence d'une confirmation explicite (`confirm()` ou modal) pour toute suppression ou purge de données.
   - Chiffrement des données sensibles : utilisation correcte de `src/lib/security.ts` (`setSecureItem`/`getSecureItem`).
   - `src/config/ownerConfig.ts` : usage rigoureux de `import.meta.env`.
2. **Axe 4 — Performance & Ergonomie UI** :
   - Pagination obligatoire (50 items/page) pour les listes volumineuses (produits, transactions, clients, audit logs, etc.).
   - Utilisation de sélecteurs Zustand ciblés (`s => s.field`) au lieu de s'abonner à l'état complet du store.
   - Chargement optimisé : `React.lazy()` + `Suspense` pour tous les onglets principaux et modals lourdes.
   - Gestion des images : utilisation systématique de `<SafeImage />` (cache WebP IndexedDB) au lieu de `<img />` brut.
   - Cohérence Thème Clair / Sombre : vérification des modals, panneaux latéraux et formulaires (`dark:bg-...`, `dark:text-...`).
   - Accessibilité et styles visuels : boutons désactivés avec `disabled:opacity-50 disabled:cursor-not-allowed`.
   - Pas de masquage de popups par `overflow-hidden` intempestif.
   - **Navigation & Routage** : vérification exhaustive que TOUT identifiant `setActiveTab('xxx')` dans `src/components/layout/Sidebar.tsx` ou boutons de redirection possède un `case 'xxx'` correspondant dans `src/components/layout/TabRenderer.tsx`.
