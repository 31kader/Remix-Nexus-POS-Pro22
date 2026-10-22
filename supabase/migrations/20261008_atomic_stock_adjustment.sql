-- Migration 20261008: Atomic, Idempotent Stock Adjustment Function (T1, T3, C16)
-- Nexus POS Pro v1.2.29

-- 1. Élargissement de la colonne adjustment pour supporter les valeurs décimales (kg, litres, etc.)
ALTER TABLE public.stock_adjustments ALTER COLUMN adjustment TYPE numeric;

-- 2. Création de la fonction RPC atomique et idempotente
CREATE OR REPLACE FUNCTION public.apply_stock_adjustment(
  p_id TEXT,
  p_value NUMERIC,
  p_mode TEXT DEFAULT 'delta',
  p_adj_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Ajustement de stock',
  p_user_id TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_is_loss BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock NUMERIC;
  v_delta NUMERIC;
  v_new_stock NUMERIC;
  v_adj_id TEXT;
BEGIN
  -- Validation des paramètres obligatoires
  IF p_id IS NULL OR p_id = '' THEN
    RAISE EXCEPTION 'ID du produit obligatoire';
  END IF;

  IF p_value IS NULL THEN
    RAISE EXCEPTION 'Valeur d''ajustement obligatoire';
  END IF;

  -- Verrouillage exclusif de la ligne produit pour éviter toute condition de course (FOR UPDATE)
  SELECT stock INTO v_current_stock
  FROM public.products
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit % introuvable', p_id;
  END IF;

  v_current_stock := COALESCE(v_current_stock, 0);

  -- Idempotence : si un p_adj_id est fourni, vérifier s'il a déjà été appliqué
  IF p_adj_id IS NOT NULL AND p_adj_id <> '' THEN
    IF EXISTS (SELECT 1 FROM public.stock_adjustments WHERE id = p_adj_id) THEN
      RETURN v_current_stock;
    END IF;
    v_adj_id := p_adj_id;
  ELSE
    v_adj_id := 'adj_' || to_char(NOW(), 'YYYYMMDDHH24MISSMS') || '_' || substr(md5(random()::text), 1, 6);
  END IF;

  -- Calcul du delta et du nouveau stock selon le mode
  IF p_mode = 'set' THEN
    v_new_stock := p_value;
    v_delta := p_value - v_current_stock;
  ELSIF p_mode = 'delta' THEN
    v_delta := p_value;
    v_new_stock := v_current_stock + p_value;
  ELSE
    RAISE EXCEPTION 'Mode d''ajustement invalide : % (doit être ''set'' ou ''delta'')', p_mode;
  END IF;

  -- Si le delta est nul (ex: mode 'set' avec la même valeur que le stock actuel)
  IF v_delta = 0 AND p_mode = 'set' THEN
    INSERT INTO public.stock_adjustments (
      id,
      product_id,
      reason,
      user_id,
      user_name,
      new_quantity,
      adjustment,
      timestamp,
      is_loss,
      updated_at,
      created_at
    ) VALUES (
      v_adj_id,
      p_id,
      COALESCE(p_reason, 'Comptage inventaire (stock inchangé)'),
      p_user_id,
      p_user_name,
      v_new_stock,
      0,
      NOW(),
      COALESCE(p_is_loss, false),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN v_current_stock;
  END IF;

  -- Mise à jour atomique du produit avec horodatage serveur NOW()
  UPDATE public.products
  SET 
    stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_id;

  -- Insertion idempotente dans l'historique stock_adjustments
  INSERT INTO public.stock_adjustments (
    id,
    product_id,
    reason,
    user_id,
    user_name,
    new_quantity,
    adjustment,
    timestamp,
    is_loss,
    updated_at,
    created_at
  ) VALUES (
    v_adj_id,
    p_id,
    COALESCE(p_reason, CASE WHEN v_delta < 0 THEN 'Déstockage / Vente' ELSE 'Réapprovisionnement / Entrée' END),
    p_user_id,
    p_user_name,
    v_new_stock,
    v_delta,
    NOW(),
    COALESCE(p_is_loss, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN v_new_stock;
END;
$$;

-- 3. Rétro-compatibilité : mise à jour de adjust_product_stock pour déléguer à apply_stock_adjustment
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_id TEXT, delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.apply_stock_adjustment(
    p_id := p_id,
    p_value := delta,
    p_mode := 'delta',
    p_adj_id := NULL,
    p_reason := CASE WHEN delta < 0 THEN 'Vente / Déstockage' ELSE 'Réapprovisionnement / Entrée stock' END,
    p_user_id := NULL,
    p_user_name := NULL,
    p_is_loss := FALSE
  );
END;
$$;

-- Permissions (Habilitation stricte : uniquement utilisateurs authentifiés et service_role)
REVOKE EXECUTE ON FUNCTION public.apply_stock_adjustment(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_stock_adjustment(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO authenticated, service_role;
