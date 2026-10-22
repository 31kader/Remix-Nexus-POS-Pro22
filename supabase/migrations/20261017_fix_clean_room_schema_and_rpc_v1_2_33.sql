-- Migration: Fix clean room schema alignment and RPC permissions v1.2.33
-- Date: 2026-10-17

-- 1. Align public.employees schema
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Align public.users schema
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pin TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Align public.returns schema
ALTER TABLE public.returns 
  ADD COLUMN IF NOT EXISTS refund_method TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Align public.transactions schema
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC;

-- 5. Restrict users_anon_select policy to prevent public data leaks
ALTER POLICY users_anon_select ON public.users USING (false);

-- 5. Update apply_stock_adjustment function for POS cashier (anon/authenticated/service_role)
CREATE OR REPLACE FUNCTION public.apply_stock_adjustment(
  p_id text, 
  p_value numeric, 
  p_mode text DEFAULT 'delta'::text, 
  p_adj_id text DEFAULT NULL::text, 
  p_reason text DEFAULT 'Ajustement de stock'::text, 
  p_user_id text DEFAULT NULL::text, 
  p_user_name text DEFAULT NULL::text, 
  p_is_loss boolean DEFAULT false
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_current_stock NUMERIC;
  v_delta NUMERIC;
  v_new_stock NUMERIC;
  v_adj_id TEXT;
BEGIN
  IF (SELECT auth.role()) NOT IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Rôle non autorisé pour ajuster le stock.';
  END IF;

  IF p_id IS NULL OR p_id = '' THEN
    RAISE EXCEPTION 'ID du produit obligatoire';
  END IF;

  IF p_value IS NULL THEN
    RAISE EXCEPTION 'Valeur d''ajustement obligatoire';
  END IF;

  SELECT stock INTO v_current_stock
  FROM public.products
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit % introuvable', p_id;
  END IF;

  v_current_stock := COALESCE(v_current_stock, 0);

  IF p_adj_id IS NOT NULL AND p_adj_id <> '' THEN
    IF EXISTS (SELECT 1 FROM public.stock_adjustments WHERE id = p_adj_id) THEN
      RETURN v_current_stock;
    END IF;
    v_adj_id := p_adj_id;
  ELSE
    v_adj_id := 'adj_' || to_char(NOW(), 'YYYYMMDDHH24MISSMS') || '_' || substr(md5(random()::text), 1, 6);
  END IF;

  IF p_mode = 'set' THEN
    v_new_stock := p_value;
    v_delta := p_value - v_current_stock;
  ELSIF p_mode = 'delta' THEN
    v_delta := p_value;
    v_new_stock := v_current_stock + p_value;
  ELSE
    RAISE EXCEPTION 'Mode d''ajustement invalide : % (doit être ''set'' ou ''delta'')', p_mode;
  END IF;

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

  UPDATE public.products
  SET 
    stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_id;

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
$function$;

-- 5. Update adjust_product_stock function
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_id text, delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (SELECT auth.role()) NOT IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Rôle non autorisé pour ajuster le stock.';
  END IF;

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
$function$;

-- 6. Update adjust_customer_balance function
CREATE OR REPLACE FUNCTION public.adjust_customer_balance(
  p_id text, 
  delta_balance numeric DEFAULT 0, 
  delta_spent numeric DEFAULT 0, 
  delta_points integer DEFAULT 0, 
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_updated record;
  v_key TEXT;
BEGIN
  IF (SELECT auth.role()) NOT IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Rôle non autorisé pour ajuster le solde client.';
  END IF;

  IF p_id IS NULL OR p_id = '' THEN
    RAISE EXCEPTION 'ID du client obligatoire';
  END IF;

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    IF EXISTS (SELECT 1 FROM public.customer_balance_adjustments WHERE idempotency_key = p_idempotency_key) THEN
      SELECT id, balance, total_spent, loyalty_points INTO v_updated
      FROM public.customers WHERE id = p_id;
      
      RETURN jsonb_build_object(
        'id', v_updated.id,
        'balance', v_updated.balance,
        'total_spent', v_updated.total_spent,
        'loyalty_points', v_updated.loyalty_points,
        'idempotent', true
      );
    END IF;
    v_key := p_idempotency_key;
  ELSE
    v_key := 'adj_cust_' || to_char(NOW(), 'YYYYMMDDHH24MISSMS') || '_' || substr(md5(random()::text), 1, 6);
  END IF;

  SELECT id INTO v_updated FROM public.customers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client % introuvable', p_id;
  END IF;

  UPDATE public.customers
  SET
    balance = COALESCE(balance, 0) + delta_balance,
    total_spent = GREATEST(0, COALESCE(total_spent, 0) + delta_spent),
    loyalty_points = GREATEST(0, COALESCE(loyalty_points, 0) + delta_points),
    purchase_count = COALESCE(purchase_count, 0) + CASE WHEN delta_spent > 0 THEN 1 ELSE 0 END,
    last_visit = CURRENT_DATE,
    last_purchase_date = CASE WHEN delta_spent > 0 THEN NOW() ELSE last_purchase_date END,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING id, balance, total_spent, loyalty_points INTO v_updated;

  INSERT INTO public.customer_balance_adjustments (
    idempotency_key, 
    customer_id, 
    delta_balance, 
    delta_spent, 
    delta_points, 
    created_at
  ) VALUES (
    v_key, 
    p_id, 
    delta_balance, 
    delta_spent, 
    delta_points, 
    NOW()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'balance', v_updated.balance,
    'total_spent', v_updated.total_spent,
    'loyalty_points', v_updated.loyalty_points
  );
END;
$function$;

-- 7. Permissions
GRANT EXECUTE ON FUNCTION public.apply_stock_adjustment(text, numeric, text, text, text, text, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(text, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_customer_balance(text, numeric, numeric, integer, text) TO anon, authenticated, service_role;
