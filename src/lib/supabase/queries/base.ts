export const sqlCreateTables = `-- 1. CRÉATION DES TABLES DE BASE EN ACCORD AVEC LE SCHÉMA REQUIS
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
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
    bundle_items JSONB,
    quantity_discounts JSONB,
    tags TEXT[],
    expiration_date DATE,
    batch_number TEXT,
    location TEXT,
    show_in_pos BOOLEAN DEFAULT TRUE,
    damaged_stock NUMERIC(12, 3) DEFAULT 0.000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    use_multi_expiry BOOLEAN DEFAULT FALSE,
    batches JSONB DEFAULT '[]'::jsonb,
    auto_unpack BOOLEAN DEFAULT FALSE,
    units_per_parent NUMERIC(12, 2) DEFAULT 1.00,
    is_quick_select BOOLEAN DEFAULT FALSE
);

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
    favorite_items JSONB,
    alerts JSONB,
    cashier_notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    "isAppUser" BOOLEAN DEFAULT FALSE,
    "loyaltyCardNumber" TEXT,
    "loyaltyPoints" INTEGER DEFAULT 0,
    password TEXT,
    "totalSpent" NUMERIC(12, 2) DEFAULT 0.00,
    "purchaseCount" INTEGER DEFAULT 0,
    "lastPurchaseDate" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "cashierNotes" TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'staff',
    join_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
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
    digital_signature_url TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT,
    delivery_method TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
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

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    user_id TEXT,
    payment_method TEXT
);

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
    sync_enabled BOOLEAN DEFAULT FALSE,
    is_app_user BOOLEAN DEFAULT FALSE,
    has_full_inventory_access BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    planning_notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pre_sale_days TEXT[],
    delivery_days TEXT[],
    payment_days TEXT[]
);

CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    type TEXT DEFAULT 'percentage',
    value NUMERIC(12, 2),
    current_balance NUMERIC(12, 2),
    min_purchase NUMERIC(12, 2) DEFAULT 0.00,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    usage_logs JSONB
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    date DATE DEFAULT CURRENT_DATE,
    total_hours NUMERIC(5, 2),
    status TEXT
);

CREATE TABLE IF NOT EXISTS table_name (
    id BIGSERIAL PRIMARY KEY,
    inserted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    data JSONB,
    name TEXT
);

CREATE TABLE IF NOT EXISTS cart_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    sessions JSONB,
    "activeSessionId" TEXT,
    user_id TEXT,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    type TEXT,
    value NUMERIC(12, 2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    conditions JSONB,
    active BOOLEAN DEFAULT TRUE,
    applicable_categories JSONB DEFAULT '[]'::jsonb,
    code TEXT,
    buy_quantity INTEGER,
    get_quantity INTEGER,
    applicable_products JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER,
    reason TEXT,
    condition TEXT,
    refund_amount NUMERIC(12, 2) DEFAULT 0.00,
    date TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_refund NUMERIC(12, 2) DEFAULT 0.00,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    customer_id TEXT,
    type TEXT DEFAULT 'refund'
);

CREATE TABLE IF NOT EXISTS online_orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    items JSONB,
    total NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT,
    shipping_address TEXT,
    payment_status TEXT,
    created_at TIMESTAMPTZ,
    "statusHistory" JSONB DEFAULT '[]'::jsonb,
    payment_method TEXT DEFAULT 'cash',
    source TEXT DEFAULT 'Online',
    delivery_method TEXT DEFAULT 'delivery',
    pickup_time TIMESTAMPTZ,
    synced_to_pos BOOLEAN DEFAULT FALSE,
    assigned_employee_id TEXT,
    assigned_employee_name TEXT,
    assigned_picker_id TEXT,
    assigned_picker_name TEXT,
    status_history JSONB,
    timestamp TIMESTAMPTZ,
    external_order_id TEXT,
    customer_phone TEXT,
    customer_email TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT,
    date TIMESTAMPTZ,
    documents JSONB
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT,
    expected_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ,
    total NUMERIC(12, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER,
    reason TEXT,
    user_id TEXT,
    date TIMESTAMPTZ,
    cost_impact NUMERIC(12, 2) DEFAULT 0.00,
    new_quantity NUMERIC(12, 3) DEFAULT 0.000,
    adjustment INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT,
    is_loss BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    method TEXT,
    date TIMESTAMPTZ,
    reference TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ,
    auditor_id TEXT,
    status TEXT DEFAULT 'pending',
    discrepancies JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    entity TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    "userId" TEXT,
    user_name TEXT,
    "userName" TEXT,
    module TEXT,
    severity TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    "isCancelled" BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    "cancelledAt" TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supplier_syncs (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    last_sync TIMESTAMPTZ,
    status TEXT,
    items_updated INTEGER DEFAULT 0,
    errors JSONB
);

CREATE TABLE IF NOT EXISTS damaged_items (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER,
    date TIMESTAMPTZ,
    reported_by TEXT,
    reason TEXT,
    status TEXT,
    user_name TEXT,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    claim_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    date TIMESTAMPTZ,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    repayment_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    name TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    receipt_template TEXT,
    label_template TEXT,
    currency TEXT,
    tax_rate NUMERIC,
    loyalty_points_per_currency_unit NUMERIC,
    loyalty_point_value NUMERIC,
    footer_text TEXT,
    accounting_format TEXT,
    site_locations JSONB,
    role_kpis JSONB,
    notifications JSONB,
    operational_costs JSONB,
    locking_period_days INTEGER,
    delivery_zones JSONB,
    paper_format TEXT,
    silent_printing BOOLEAN,
    global_stock_alert_threshold INTEGER,
    api_keys JSONB,
    available_taxes JSONB,
    display_price_ht BOOLEAN,
    loyalty_tiers JSONB,
    enable_time_clock BOOLEAN,
    session_timeout_minutes INTEGER,
    audit_log_retention_days INTEGER,
    brand_color TEXT,
    fast_mode_enabled BOOLEAN,
    default_lead_time_days INTEGER,
    loyalty_points_per_unit NUMERIC,
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    close_grid_on_select BOOLEAN DEFAULT FALSE,
    enable_voice_guidance BOOLEAN DEFAULT FALSE,
    role_permissions JSONB,
    label_orientation TEXT,
    label_rotation TEXT,
    label_width_custom NUMERIC,
    label_height_custom NUMERIC,
    enable_camera_portal BOOLEAN DEFAULT FALSE,
    favorite_category_ids TEXT[],
    quick_select_groups JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "dividendPayments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "microInvestors" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT,
    userid TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    amount NUMERIC DEFAULT 0,
    shares NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashier_alerts (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    user_id TEXT,
    message TEXT,
    type TEXT,
    timestamp TIMESTAMPTZ,
    read BOOLEAN,
    "from" TEXT
);

CREATE TABLE IF NOT EXISTS invoice_patterns (
    id TEXT PRIMARY KEY,
    type TEXT,
    prefix TEXT,
    suffix TEXT,
    digits INTEGER,
    next_number INTEGER,
    supplier_name TEXT,
    system_supplier_id TEXT,
    item_mappings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_delivery_requests (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    total NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export const sqlDisableRLS = `-- SQL POUR DÉSACTIVER TEMPÉRAIREMENT RLS
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_drafts DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE online_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_syncs DISABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
ALTER TABLE "dividendPayments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "microInvestors" DISABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_delivery_requests DISABLE ROW LEVEL SECURITY;
`;

export const sqlEnableRLSPublic = `-- SQL POUR ACTIVER RLS ET POLICES PERMISSIVES
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'products', 'categories', 'brands', 'customers', 'transactions', 
        'employees', 'cash_shifts', 'expenses', 'users', 'suppliers', 
        'vouchers', 'attendance', 'cart_drafts', 
        'promotions', 'returns', 'online_orders', 'purchases', 
        'purchase_orders', 'stock_adjustments', 'supplier_payments', 
        'audits', 'audit_logs', 'supplier_syncs', 'damaged_items', 
        'advances', 'settings', 'table_name', 'dividendPayments', 
        'microInvestors', 'cashier_alerts', 'invoice_patterns', 'external_delivery_requests'
    ];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "public_access_all" ON %I', t);
        EXECUTE format('CREATE POLICY "public_access_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;`;

export const sqlDropTables = `-- SCRIPT DE NETTOYAGE COMPLET
DROP TABLE IF EXISTS invoice_patterns CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS advances CASCADE;
DROP TABLE IF EXISTS damaged_items CASCADE;
DROP TABLE IF EXISTS supplier_syncs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS online_orders CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS cart_drafts CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS cash_shifts CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS table_name CASCADE;
DROP TABLE IF EXISTS "dividendPayments" CASCADE;
DROP TABLE IF EXISTS "microInvestors" CASCADE;
DROP TABLE IF EXISTS cashier_alerts CASCADE;
DROP TABLE IF EXISTS external_delivery_requests CASCADE;
`;
