-- ==============================================================================
-- 🚀 NEXUS POS PRO - MIGRATION SQL POUR AJUSTEMENT ATOMIQUE DE STOCK
-- ==============================================================================
-- Exécutez ce script dans l'Éditeur SQL de votre tableau de bord Supabase
-- pour activer la décrémentation / incrémentation atomique sans collision.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_id TEXT, delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
  IF (SELECT auth.role()) NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Authentification requise pour ajuster le stock.';
  END IF;

  -- Met à jour le stock en ajoutant le delta de manière atomique (verrou row-level)
  UPDATE public.products
  SET 
    stock = GREATEST(0, COALESCE(stock, 0) + delta),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_new_stock;
  
  RETURN COALESCE(v_new_stock, 0);
END;
$$;

-- Accorder l'accès d'exécution uniquement aux rôles authentifiés et service_role
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO authenticated, service_role;
