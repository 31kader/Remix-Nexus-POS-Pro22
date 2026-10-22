-- ==============================================================================
-- Migration : 20261016_pre_delivery_security_hardening_v1_2_33.sql
-- Description : Durcissement pré-livraison v1.2.33
-- 1. Purge du mot de passe en clair résiduel dans la table customers
-- 2. Restriction de la politique UPDATE anon sur online_orders (statuts valides)
-- 3. Révocation des privilèges d'exécution pour le rôle anon et PUBLIC sur les RPC sensibles
-- ==============================================================================

-- 1. Purger le mot de passe en clair résiduel dans la table customers
UPDATE public.customers
SET password = NULL
WHERE password IS NOT NULL AND password NOT LIKE '$2%';

-- 2. Restreindre la politique UPDATE anon sur online_orders pour garantir l'intégrité des statuts
ALTER POLICY "online_orders_anon_update_policy" ON public.online_orders
USING (id IS NOT NULL)
WITH CHECK (
  (status IS NULL OR status IN ('pending', 'new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))
  AND (payment_status IS NULL OR payment_status IN ('pending', 'unpaid', 'paid', 'cash_on_delivery', 'refunded', 'failed'))
);

-- 3. Révocation des privilèges d'exécution pour le rôle anon et PUBLIC sur les fonctions sensibles
REVOKE EXECUTE ON FUNCTION public.sync_app_customer_wishlist(text, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_app_customer_wishlist(text, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_app_customer_loyalty(text, integer, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_app_customer_loyalty(text, integer, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) TO authenticated, service_role;
