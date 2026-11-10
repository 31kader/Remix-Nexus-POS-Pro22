# Règle Absolue Anti-God Files & Découpage Modulaire (Tolérance Zéro)

## Principes Directeurs
1. **Plafond Hard Limit de 500 lignes** : Aucun fichier sous `src/` ne doit atteindre ou dépasser 500 lignes sous peine d'échec immédiat des tests CI.
2. **Standard d'Excellence < 350 lignes (Idéalement < 250 lignes)** :
   - Tout composant, service ou hook doit être découpé par responsabilité unique.
   - Dès qu'un fichier franchit 250 lignes, extraire sans attendre les sous-composants, modales, hooks ou fonctions de calcul.
3. **Architecture de Découpage Systématique** :
   - Composant principal : orchestre uniquement l'état général et les sous-blocs.
   - Sous-composants : un dossier dédié par fonctionnalité (ex: `src/components/sidebar/`, `src/components/settings/shortcuts/`).
   - Hooks métiers : un fichier par hook spécialisé (ex: `useSidebarLogic.ts`, `usePermissionsLogic.ts`).
   - Fonctions pures & helpers : fichiers utilitaires séparés (ex: `dateHelpers.ts`).
4. **Sanctuaires Exceptionnels Inviolables (3 fichiers uniquement)** :
   - `src/lib/db-converters.ts`
   - `src/lib/supabase/sql/diagnosticQueries.ts`
   - `src/types/database.types.ts`
