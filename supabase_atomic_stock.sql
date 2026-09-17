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
AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
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

-- Accorder l'accès d'exécution aux rôles anon et authenticated
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO service_role;
