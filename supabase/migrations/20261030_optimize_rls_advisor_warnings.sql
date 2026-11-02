-- ============================================================================
-- Migration : Optimisation des Avertissements Supabase Performance Advisor
-- Date      : 2026-10-30
-- Cibles    : public.customers (auth_rls_initplan), public.online_orders (multiple_permissive_policies)
-- ============================================================================

-- 1. Éliminer l'évaluation par ligne de auth.uid() / auth.jwt() sur la table customers
-- Remplacement par (SELECT auth.uid()) pour un plan d'initialisation unique (InitPlan)

DROP POLICY IF EXISTS "allow_preseller_create_customers" ON public.customers;
CREATE POLICY "allow_preseller_create_customers" ON public.customers 
FOR INSERT TO authenticated 
WITH CHECK (is_staff() OR ((SELECT auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "allow_preseller_read_customers" ON public.customers;
CREATE POLICY "allow_preseller_read_customers" ON public.customers 
FOR SELECT TO authenticated 
USING (
  is_staff() 
  OR (auth_uid = (SELECT auth.uid())) 
  OR (id = ((SELECT auth.uid())::text)) 
  OR (lower(email) = lower(((SELECT auth.jwt()) ->> 'email')))
);

-- 2. Éliminer le doublon de politique permissive sur la table online_orders
-- online_orders_anon_update_policy ciblait "authenticated" alors que online_orders_staff_policy gère déjà "ALL"

DROP POLICY IF EXISTS "online_orders_anon_update_policy" ON public.online_orders;
