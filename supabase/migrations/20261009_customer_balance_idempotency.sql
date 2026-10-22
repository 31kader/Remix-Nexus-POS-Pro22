-- ==============================================================================
-- Migration: 20261009_customer_balance_idempotency.sql
-- Module: Nexus POS Pro v1.2.29 — Jalon M2 (Axe R2)
-- Objet: Idempotence stricte et traçabilité des dettes et soldes clients
-- ==============================================================================

-- 1. Table de traçabilité et d'idempotence financière pour les ajustements de solde client
CREATE TABLE IF NOT EXISTS public.customer_balance_adjustments (
  idempotency_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  delta_balance NUMERIC DEFAULT 0,
  delta_spent NUMERIC DEFAULT 0,
  delta_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par client et date
CREATE INDEX IF NOT EXISTS idx_customer_balance_adjustments_cust_date 
  ON public.customer_balance_adjustments(customer_id, created_at DESC);

-- Activation de la sécurité RLS
ALTER TABLE public.customer_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour customer_balance_adjustments
DROP POLICY IF EXISTS "Allow authenticated read customer_balance_adjustments" ON public.customer_balance_adjustments;
CREATE POLICY "Allow authenticated read customer_balance_adjustments"
  ON public.customer_balance_adjustments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert customer_balance_adjustments" ON public.customer_balance_adjustments;
CREATE POLICY "Allow authenticated insert customer_balance_adjustments"
  ON public.customer_balance_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Mise à jour de la fonction RPC adjust_customer_balance avec paramètre d'idempotence
CREATE OR REPLACE FUNCTION public.adjust_customer_balance(
  p_id TEXT, 
  delta_balance NUMERIC DEFAULT 0, 
  delta_spent NUMERIC DEFAULT 0, 
  delta_points INTEGER DEFAULT 0,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated record;
  v_key TEXT;
BEGIN
  -- Contrôle d'authentification
  IF (SELECT auth.role()) NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Authentification requise pour ajuster le solde client.';
  END IF;

  -- Validation des paramètres
  IF p_id IS NULL OR p_id = '' THEN
    RAISE EXCEPTION 'ID du client obligatoire';
  END IF;

  -- 🛡️ Vérification d'idempotence stricte : si le jeton existe déjà, retourner l'état courant sans réappliquer les deltas
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

  -- Verrouillage de la ligne client pour éliminer les courses concurrentes (FOR UPDATE)
  SELECT id INTO v_updated FROM public.customers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client % introuvable', p_id;
  END IF;

  -- Mise à jour atomique du solde et cumul des dépenses et points
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

  -- Enregistrement du jeton appliqué dans customer_balance_adjustments
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
$$;

-- Permissions restreintes aux utilisateurs authentifiés et service_role
REVOKE EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER, TEXT) TO authenticated, service_role;
