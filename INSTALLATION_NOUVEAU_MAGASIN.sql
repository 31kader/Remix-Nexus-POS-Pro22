-- ==============================================================================
-- 🚀 NEXUS POS PRO - SCRIPT D'INITIALISATION COMPLET POUR NOUVEAU PROJET / CLIENT
-- ==============================================================================
-- Ce script configure intégralement une nouvelle base Supabase pour Nexus POS Pro :
-- 1. Extensions nécessaires
-- 2. Création des 28 tables avec toutes les colonnes requises
-- 3. Fonctions RPC atomiques (Stocks & Soldes fidélité)
-- 4. Politiques de sécurité (RLS) et permissions
-- 5. Données de départ minimales (Catégorie par défaut & Paramètres)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. TABLES FONDAMENTALES

-- Catégories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marques
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT,
    sku TEXT,
    reference TEXT,
    image_url TEXT,
    image_urls TEXT[],
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    online_price NUMERIC(12, 2),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00,
    stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
    parent_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    supplier TEXT,
    unit TEXT NOT NULL DEFAULT 'pcs',
    status TEXT NOT NULL DEFAULT 'active',
    description TEXT,
    is_bundle BOOLEAN DEFAULT FALSE,
    bundle_items JSONB DEFAULT '[]'::jsonb,
    quantity_discounts JSONB DEFAULT '[]'::jsonb,
    tags TEXT[],
    expiration_date DATE,
    batch_number TEXT,
    location TEXT,
    show_in_pos BOOLEAN DEFAULT TRUE,
    damaged_stock NUMERIC(12, 3) DEFAULT 0.000,
    use_multi_expiry BOOLEAN DEFAULT FALSE,
    batches JSONB DEFAULT '[]'::jsonb,
    auto_unpack BOOLEAN DEFAULT FALSE,
    units_per_parent NUMERIC(12, 2) DEFAULT 1.00,
    is_quick_select BOOLEAN DEFAULT FALSE,
    price_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    loyalty_card_number TEXT,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_visit DATE,
    notes TEXT,
    is_app_user BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    favorite_items JSONB DEFAULT '[]'::jsonb,
    alerts JSONB DEFAULT '[]'::jsonb,
    cashier_notes TEXT,
    purchase_count INTEGER DEFAULT 0,
    last_purchase_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilisateurs (Comptes POS & Admin)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'admin',
    join_date TIMESTAMPTZ DEFAULT NOW()
);

-- Employés
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'cashier',
    phone TEXT,
    email TEXT,
    hire_date DATE,
    status TEXT DEFAULT 'active',
    is_clocked_in BOOLEAN DEFAULT FALSE,
    base_salary NUMERIC(12, 2),
    salary_type TEXT,
    hourly_rate NUMERIC(12, 2),
    daily_rate NUMERIC(12, 2),
    id_card_recto_url TEXT,
    id_card_verso_url TEXT,
    contract_url TEXT,
    digital_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions / Ventes
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'cash',
    delivery_method TEXT DEFAULT 'takeaway',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    cashier_id TEXT,
    cashier_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    amount_received NUMERIC(12, 2) DEFAULT 0.00,
    amount_returned NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'completed',
    promotion_id TEXT,
    points_earned INTEGER DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    points_discount NUMERIC(12, 2) DEFAULT 0.00,
    balance_used NUMERIC(12, 2) DEFAULT 0.00,
    voucher_discount NUMERIC(12, 2) DEFAULT 0.00,
    is_wholesale BOOLEAN DEFAULT FALSE,
    online_order_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    audit_status VARCHAR DEFAULT 'completed',
    audited_by TEXT,
    audited_at TIMESTAMPTZ,
    audit_duration NUMERIC(10, 2),
    audit_note TEXT
);

-- Sessions de caisse (Shifts)
CREATE TABLE IF NOT EXISTS cash_shifts (
    id TEXT PRIMARY KEY,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by TEXT,
    closed_by TEXT,
    initial_cash NUMERIC(12, 2) DEFAULT 0.00,
    final_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    total_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_cash_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_card_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_expenses NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'open',
    notes TEXT
);

-- Dépenses de caisse
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    user_id TEXT,
    payment_method TEXT DEFAULT 'cash'
);

-- Fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    categories TEXT[],
    feed_url TEXT,
    feed_format TEXT,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bons d'Achat / Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    value NUMERIC(12, 2) NOT NULL,
    remaining_value NUMERIC(12, 2) NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active'
);

-- Présences employés (Pointage)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    total_hours NUMERIC(5, 2),
    status TEXT DEFAULT 'present',
    notes TEXT
);

-- Brouillons de paniers (Mise en attente)
CREATE TABLE IF NOT EXISTS cart_drafts (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    value NUMERIC(12, 2) DEFAULT 0.00,
    min_purchase NUMERIC(12, 2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    conditions JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_categories TEXT[],
    code TEXT,
    buy_quantity INTEGER DEFAULT 0,
    get_quantity INTEGER DEFAULT 0,
    applicable_products TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retours articles
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    product_id TEXT,
    quantity NUMERIC(12, 3) DEFAULT 1,
    reason TEXT,
    condition TEXT,
    refund_amount NUMERIC(12, 2) DEFAULT 0.00,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'approved',
    notes TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_refund NUMERIC(12, 2) DEFAULT 0.00,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    customer_id TEXT,
    type TEXT DEFAULT 'cash'
);

-- Commandes en ligne
CREATE TABLE IF NOT EXISTS online_orders (
    id TEXT PRIMARY KEY,
    external_order_id TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    source TEXT,
    delivery_method TEXT,
    pickup_time TEXT,
    shipping_address TEXT,
    delivery_notes TEXT,
    notes TEXT,
    loyalty_points INTEGER DEFAULT 0,
    synced_to_pos BOOLEAN DEFAULT FALSE,
    assigned_employee_id TEXT,
    assigned_employee_name TEXT,
    assigned_picker_id TEXT,
    assigned_picker_name TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achats fournisseurs (Factures d'achat)
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'received',
    invoice_number TEXT,
    date DATE DEFAULT CURRENT_DATE,
    payment_status TEXT DEFAULT 'paid',
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    global_discount NUMERIC(12, 2) DEFAULT 0.00,
    global_tax NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bons de commande
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    expected_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajustements de stock manuels
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    new_quantity NUMERIC(12, 3),
    adjustment NUMERIC(12, 3),
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT,
    is_loss BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paiements fournisseurs
CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    method TEXT DEFAULT 'cash',
    date DATE DEFAULT CURRENT_DATE,
    reference TEXT,
    note TEXT,
    notes TEXT
);

-- Audits d'inventaire
CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    auditor_id TEXT,
    status TEXT DEFAULT 'completed',
    discrepancies JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    completed_at TIMESTAMPTZ
);

-- Logs d'audit (Journal de traçabilité)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    module TEXT,
    details TEXT,
    severity TEXT DEFAULT 'info',
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles endommagés / Pertes
CREATE TABLE IF NOT EXISTS damaged_items (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC(12, 3) DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    reported_by TEXT,
    user_id TEXT,
    user_name TEXT,
    reason TEXT,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    claim_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    supplier_id TEXT
);

-- Avances sur salaire
CREATE TABLE IF NOT EXISTS advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    status TEXT DEFAULT 'approved',
    approved_by TEXT,
    repayment_date DATE
);

-- Bons de réception (GRN)
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    global_discount NUMERIC(12, 2) DEFAULT 0.00,
    global_vat NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'validated'
);

-- Configuration Globale du Magasin
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    company_name TEXT DEFAULT 'Mon Magasin',
    address TEXT DEFAULT 'Alger, Algérie',
    phone TEXT DEFAULT '0550000000',
    email TEXT DEFAULT 'contact@magasin.dz',
    tax_number TEXT,
    rc_number TEXT,
    art_number TEXT,
    nis_number TEXT,
    currency TEXT DEFAULT 'DA',
    receipt_footer TEXT DEFAULT 'Merci de votre visite et à bientôt !',
    logo_url TEXT,
    default_tax_rate NUMERIC(5, 2) DEFAULT 19.00,
    receipt_template TEXT DEFAULT 'standard',
    paper_format TEXT DEFAULT '80mm',
    silent_printing BOOLEAN DEFAULT FALSE,
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    close_grid_on_select BOOLEAN DEFAULT FALSE,
    enable_voice_guidance BOOLEAN DEFAULT FALSE,
    enable_camera_portal BOOLEAN DEFAULT FALSE,
    label_orientation TEXT DEFAULT 'landscape',
    label_rotation TEXT DEFAULT '0',
    label_width_custom NUMERIC DEFAULT 40,
    label_height_custom NUMERIC DEFAULT 20,
    quick_select_groups JSONB DEFAULT '[]'::jsonb,
    favorite_category_ids TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FONCTIONS RPC ATOMIQUES (Essentielles pour la caisse)

-- Ajustement atomique de stock (sans écrasement)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_id TEXT, delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
  UPDATE public.products
  SET 
    stock = GREATEST(0, COALESCE(stock, 0) + delta),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_new_stock;
  
  RETURN COALESCE(v_new_stock, 0);
END;
$$;

-- Ajustement atomique du solde et points fidélité client
CREATE OR REPLACE FUNCTION public.adjust_customer_balance(
  p_id TEXT, 
  delta_balance NUMERIC DEFAULT 0, 
  delta_spent NUMERIC DEFAULT 0, 
  delta_points INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated record;
BEGIN
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

-- Permissions sur les fonctions RPC
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_customer_balance(TEXT, NUMERIC, NUMERIC, INTEGER) TO anon, authenticated, service_role;

-- 4. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- Active RLS et autorise l'accès complet nécessaire au terminal POS (offline-first)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'categories', 'brands', 'products', 'customers', 'users', 'employees',
        'transactions', 'cash_shifts', 'expenses', 'suppliers', 'vouchers',
        'attendance', 'cart_drafts', 'promotions', 'returns', 'online_orders',
        'purchases', 'purchase_orders', 'stock_adjustments', 'supplier_payments',
        'audits', 'audit_logs', 'damaged_items', 'advances', 'goods_receipt_notes',
        'settings'
    ];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "pos_access_all" ON %I', t);
        EXECUTE format('CREATE POLICY "pos_access_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 5. DONNÉES PAR DÉFAUT INDISPENSABLES

-- Catégorie par défaut (obligatoire pour créer des produits)
INSERT INTO categories (id, name, level)
VALUES ('uncategorized', 'Général', 1)
ON CONFLICT (id) DO NOTHING;

-- Configuration initiale du magasin
INSERT INTO settings (id, company_name, currency, default_tax_rate)
VALUES ('current', 'Mon Commerce', 'DA', 19.00)
ON CONFLICT (id) DO NOTHING;

-- Compte Administrateur Initial
-- Email : admin@nexus.pos
-- PIN par défaut : 1234 (Hash bcrypt : $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa)
INSERT INTO users (id, email, display_name, password_hash, role)
VALUES (
    'admin-root',
    'admin@nexus.pos',
    'Administrateur',
    '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa',
    'admin'
)
ON CONFLICT (id) DO NOTHING;

-- FIN DU SCRIPT D'INITIALISATION
