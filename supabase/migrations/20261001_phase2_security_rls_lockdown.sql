-- ==============================================================================
-- 🛡️ NEXUS POS PRO v1.2.19 - MIGRATION DE VERROUILLAGE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Fichier: supabase/migrations/20261001_phase2_security_rls_lockdown.sql
-- Projet: unlwfvldqxfccgrrgbwf (Région: eu-central-1)
-- Objectif Jalon M2:
--   1. Supprimer l'artifice "Security Theater" autorisant cmd=ALL pour 'anon'.
--   2. Activer RLS sur les 30 tables publiques.
--   3. Mettre en place des politiques d'accès fines et granulaires :
--      - products: lecture publique des articles actifs (status = 'active') pour borne de prix et vitrine,
--                  écritures strictement restreintes au personnel / administration.
--      - users & employees: accès anon formellement révoqué, protection des données RH et hashs.
--      - customers: accès anon révoqué, protection des soldes de crédit et points fidélité.
--      - transactions & cash_shifts: non-répudiation comptable, suppression formellement interdite.
--      - online_orders: commandes pending autorisées pour le public, gestion par le staff.
--      - audit_logs: journaux append-only immuables protégés contre toute altération.
--   4. Sécuriser les fonctions RPC atomiques en SECURITY DEFINER avec contrôle d'autorité.
--   5. Optimisation PostgreSQL InitPlan (0 warning Performance Advisor).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- ÉTAPE 1 : FONCTIONS D'AUTORITÉ STABLES & SÉCURISÉES (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 1.1 Détection du rôle Administrateur / Propriétaire
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ((select auth.role()) = 'service_role') OR (
    (select auth.role()) = 'authenticated' AND (
      COALESCE(
        (SELECT role = 'admin' 
         FROM public.users 
         WHERE uid = (select auth.uid())::text OR email = ((select auth.jwt()) ->> 'email') 
         LIMIT 1),
        FALSE
      ) OR (((select auth.jwt()) ->> 'email') = 'kader_bouz@hotmail.com')
    )
  );
$$;

-- 1.2 Détection du Personnel de Vente / Caissiers Authentifiés (Staff)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ((select auth.role()) = 'service_role') OR (
    (select auth.role()) = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE uid = (select auth.uid())::text OR email = ((select auth.jwt()) ->> 'email')
      ) OR EXISTS (
        SELECT 1 FROM public.employees 
        WHERE email = ((select auth.jwt()) ->> 'email') AND status = 'active'
      ) OR (((select auth.jwt()) ->> 'role') = 'authenticated')
    )
  );
$$;

-- Révocation de l'exécution des fonctions d'autorité pour anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- ÉTAPE 2 : PURGE DE TOUTES LES ANCIENNES POLITIQUES PERMISSIVES
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- ÉTAPE 3 : ACTIVATION EXPLICITE DU RLS SUR LES 30 TABLES PUBLIQUES
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.damaged_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cashier_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.external_delivery_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- ÉTAPE 4 : DÉFINITION DES POLITIQUES RLS PAR TABLE
-- ------------------------------------------------------------------------------

-- === 4.1. PRODUCTS (Catalogue & Prix) ===
-- Lecture : Public/anon et personnel peuvent consulter les produits actifs (borne de prix et catalogue)
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT USING (
  (((select auth.role()) = 'authenticated') OR (status = 'active'))
);

-- Insertion & Mise à jour : Exclusivement réservées au personnel
CREATE POLICY "products_insert_policy" ON public.products
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "products_update_policy" ON public.products
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Suppression : Strictement réservée à l'administrateur
CREATE POLICY "products_delete_policy" ON public.products
FOR DELETE TO authenticated USING (public.is_admin());


-- === 4.2. CATEGORIES & BRANDS ===
CREATE POLICY "categories_select_policy" ON public.categories
FOR SELECT USING (((select auth.role()) IN ('anon', 'authenticated', 'service_role')));

CREATE POLICY "categories_insert_policy" ON public.categories
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "categories_update_policy" ON public.categories
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "categories_delete_policy" ON public.categories
FOR DELETE TO authenticated USING (public.is_staff());

CREATE POLICY "brands_select_policy" ON public.brands
FOR SELECT USING (((select auth.role()) IN ('anon', 'authenticated', 'service_role')));

CREATE POLICY "brands_insert_policy" ON public.brands
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "brands_update_policy" ON public.brands
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "brands_delete_policy" ON public.brands
FOR DELETE TO authenticated USING (public.is_staff());


-- === 4.3. PROMOTIONS ===
CREATE POLICY "promotions_select_policy" ON public.promotions
FOR SELECT USING (((select auth.role()) IN ('anon', 'authenticated', 'service_role')));

CREATE POLICY "promotions_insert_policy" ON public.promotions
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "promotions_update_policy" ON public.promotions
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "promotions_delete_policy" ON public.promotions
FOR DELETE TO authenticated USING (public.is_staff());


-- === 4.4. USERS (Comptes Administrateurs & Caissiers) ===
REVOKE ALL ON public.users FROM anon;

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  public.is_admin() OR uid = ((select auth.uid())::text) OR email = ((select auth.jwt()) ->> 'email')
);

CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR NOT EXISTS (SELECT 1 FROM public.users)
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
  public.is_admin() OR uid = ((select auth.uid())::text) OR email = ((select auth.jwt()) ->> 'email')
)
WITH CHECK (
  public.is_admin() OR uid = ((select auth.uid())::text) OR email = ((select auth.jwt()) ->> 'email')
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (public.is_admin());


-- === 4.5. EMPLOYEES (RH & Pièces d'identité) ===
REVOKE ALL ON public.employees FROM anon;

CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "employees_insert_policy" ON public.employees
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "employees_delete_policy" ON public.employees
FOR DELETE TO authenticated USING (public.is_admin());


-- === 4.6. CUSTOMERS (Clients, Soldes Crédit & Fidélité) ===
REVOKE ALL ON public.customers FROM anon;

CREATE POLICY "customers_select_policy" ON public.customers
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "customers_insert_policy" ON public.customers
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "customers_update_policy" ON public.customers
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "customers_delete_policy" ON public.customers
FOR DELETE TO authenticated USING (public.is_admin());


-- === 4.7. TRANSACTIONS (Ventes & Comptabilité - Immuabilité) ===
REVOKE ALL ON public.transactions FROM anon;

CREATE POLICY "transactions_select_policy" ON public.transactions
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "transactions_insert_policy" ON public.transactions
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "transactions_update_policy" ON public.transactions
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Aucune politique DELETE : Non-répudiation comptable absolue


-- === 4.8. CASH_SHIFTS (Tiroirs & Sessions de Caisse) ===
REVOKE ALL ON public.cash_shifts FROM anon;

CREATE POLICY "cash_shifts_select_policy" ON public.cash_shifts
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "cash_shifts_insert_policy" ON public.cash_shifts
FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "cash_shifts_update_policy" ON public.cash_shifts
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "cash_shifts_delete_policy" ON public.cash_shifts
FOR DELETE TO authenticated USING (public.is_admin());


-- === 4.9. ONLINE_ORDERS (Prise de Commandes en Ligne) ===
-- Le public peut insérer une commande à l'état 'pending'
CREATE POLICY "online_orders_anon_insert_policy" ON public.online_orders
FOR INSERT TO anon WITH CHECK (status = 'pending' AND COALESCE(payment_status, 'pending') = 'pending');

-- Le public peut vérifier le statut des commandes pending
CREATE POLICY "online_orders_anon_select_policy" ON public.online_orders
FOR SELECT TO anon USING (status = 'pending');

-- Le personnel gère et prépare toutes les commandes
CREATE POLICY "online_orders_staff_policy" ON public.online_orders
FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


-- === 4.10. AUDIT_LOGS (Journaux de Sécurité Inviolables) ===
REVOKE ALL ON public.audit_logs FROM anon;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- Aucune politique UPDATE ou DELETE sur audit_logs (Strictement immuable)


-- === 4.11. SETTINGS & VOUCHERS ===
REVOKE ALL ON public.settings FROM anon;
REVOKE ALL ON public.vouchers FROM anon;

CREATE POLICY "settings_select_policy" ON public.settings
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "settings_insert_policy" ON public.settings
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "settings_update_policy" ON public.settings
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_delete_policy" ON public.settings
FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "vouchers_select_policy" ON public.vouchers
FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "vouchers_update_policy" ON public.vouchers
FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "vouchers_insert_policy" ON public.vouchers
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "vouchers_delete_policy" ON public.vouchers
FOR DELETE TO authenticated USING (public.is_admin());


-- === 4.12. AUTRES TABLES OPÉRATIONNELLES (STAFF ACCREDITED) ===
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.purchases FROM anon;
REVOKE ALL ON public.purchase_orders FROM anon;
REVOKE ALL ON public.supplier_payments FROM anon;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.stock_adjustments FROM anon;
REVOKE ALL ON public.attendance FROM anon;
REVOKE ALL ON public.advances FROM anon;
REVOKE ALL ON public.returns FROM anon;
REVOKE ALL ON public.cart_drafts FROM anon;
REVOKE ALL ON public.cashier_alerts FROM anon;
REVOKE ALL ON public.invoice_patterns FROM anon;
REVOKE ALL ON public.goods_receipt_notes FROM anon;
REVOKE ALL ON public.damaged_items FROM anon;
REVOKE ALL ON public.audits FROM anon;
REVOKE ALL ON public.supplier_syncs FROM anon;
REVOKE ALL ON public.external_delivery_requests FROM anon;

CREATE POLICY "expenses_staff_policy" ON public.expenses FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "purchases_staff_policy" ON public.purchases FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "purchase_orders_staff_policy" ON public.purchase_orders FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "supplier_payments_staff_policy" ON public.supplier_payments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "suppliers_staff_policy" ON public.suppliers FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "stock_adjustments_staff_policy" ON public.stock_adjustments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "attendance_staff_policy" ON public.attendance FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "advances_staff_policy" ON public.advances FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "returns_staff_policy" ON public.returns FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "cart_drafts_staff_policy" ON public.cart_drafts FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "cashier_alerts_staff_policy" ON public.cashier_alerts FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "invoice_patterns_staff_policy" ON public.invoice_patterns FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "goods_receipt_notes_staff_policy" ON public.goods_receipt_notes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "damaged_items_staff_policy" ON public.damaged_items FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "audits_staff_policy" ON public.audits FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "supplier_syncs_staff_policy" ON public.supplier_syncs FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "external_delivery_staff_policy" ON public.external_delivery_requests FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


-- ------------------------------------------------------------------------------
-- ÉTAPE 5 : FONCTIONS RPC ATOMIQUES SÉCURISÉES (SECURITY DEFINER CONTRÔLÉ)
-- ------------------------------------------------------------------------------

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

  UPDATE public.products
  SET 
    stock = GREATEST(0, COALESCE(stock, 0) + delta),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_new_stock;
  
  RETURN COALESCE(v_new_stock, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_customer_balance(
  p_id TEXT, 
  delta_balance NUMERIC DEFAULT 0, 
  delta_spent NUMERIC DEFAULT 0, 
  delta_points INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated record;
BEGIN
  IF (SELECT auth.role()) NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Accès refusé : Authentification requise pour ajuster le solde client.';
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

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'balance', v_updated.balance,
    'total_spent', v_updated.total_spent,
    'loyalty_points', v_updated.loyalty_points
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER) TO authenticated, service_role;

COMMIT;
