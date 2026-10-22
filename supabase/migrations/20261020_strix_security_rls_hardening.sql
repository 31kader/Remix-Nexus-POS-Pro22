-- ==============================================================================
-- DURCISSEMENT DE SÉCURITÉ POST-AUDIT STRIX — NEXUS POS PRO (v1.2.52)
-- Projet Supabase: unlwfvldqxfccgrrgbwf
-- Date d'application: 2026-10-20
-- Objet:
--   1. Table public.transactions : Restreindre le SELECT aux seuls utilisateurs staff authentifiés
--      (Empêche tout internaute disposant de la clé anonyme d'extraire le CA et les tickets).
--   2. Table public.employees : Révocation du SELECT anon direct sur la table brute
--      (Protège les salaires de base, téléphones, pièces d'identité et emails).
--   3. Vue public.employees_pos_picker : Vue d'exposition minimale sans données sensibles
--      (Permet au sélecteur de caisse de lister les noms et rôles sans fuite RGPD).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table TRANSACTIONS (Verrouillage de la lecture du journal des ventes)
-- ------------------------------------------------------------------------------
ALTER POLICY "transactions_select_policy" ON public.transactions
  TO authenticated
  USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 2. Table EMPLOYEES (Verrouillage des fiches complètes du personnel)
-- ------------------------------------------------------------------------------
ALTER POLICY "employees_anon_select" ON public.employees
  TO anon
  USING (false);

ALTER POLICY "employees_select_policy" ON public.employees
  TO authenticated
  USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 3. VUE SÉCURISÉE PUBLIQUE (Sélecteur de caissier / pointeuse)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.employees_pos_picker AS
  SELECT 
    id, 
    name, 
    role, 
    status
  FROM public.employees
  WHERE status = 'active';

GRANT SELECT ON public.employees_pos_picker TO anon, authenticated;
