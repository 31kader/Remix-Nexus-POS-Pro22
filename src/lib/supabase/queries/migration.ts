export const sqlMigrationTables = `-- SCRIPT DE MIGRATION GLOBAL ET HARMONISÉ
-- Ce script vérifie chaque table et ajoute de manière atomique toutes les colonnes requises
-- par l'application pour supprimer définitivement les incohérences de types et colonnes manquantes.

-- I. SUPPRESSION DES CONTRAINTES DE CONFLITS UNIQUES
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;

-- II. AJOUTS DE COLONNES INDIVIDUELLES SUR LES TABLES EXISTANTES
-- 1. Table des Catégories (categories)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Table des Marques (brands)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Table des Produits (products)
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS online_price NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock NUMERIC(12, 3) DEFAULT 0.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12, 3) DEFAULT 0.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_items JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_discounts JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_pos BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS damaged_stock NUMERIC(12, 3) DEFAULT 0.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS use_multi_expiry BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batches JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS auto_unpack BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS units_per_parent NUMERIC(12, 2) DEFAULT 1.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_quick_select BOOLEAN DEFAULT FALSE;

-- 4. Table des Clients (customers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_card_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_visit DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS favorite_items JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alerts JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cashier_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "isAppUser" BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "loyaltyCardNumber" TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "loyaltyPoints" INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "totalSpent" NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "purchaseCount" INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "lastPurchaseDate" TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "cashierNotes" TEXT;

-- 5. Table des Employés (employees)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_clocked_in BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_type TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_recto_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_verso_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;

-- 6. Table des Transactions (transactions)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS points_discount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_used NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_wholesale BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS online_order_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS audit_status VARCHAR DEFAULT 'completed';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS audit_duration NUMERIC(10, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS audit_note TEXT;

-- 7. Table des Sessions de Caisse (cash_shifts)
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS initial_cash NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS final_cash NUMERIC(12,2);
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS expected_cash NUMERIC(12,2);
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_sales NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_cash_sales NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_card_sales NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS notes TEXT;

-- 8. Table des Fournisseurs (suppliers)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS feed_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS feed_format TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT FALSE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS has_full_inventory_access BOOLEAN DEFAULT FALSE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS planning_notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pre_sale_days TEXT[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_days TEXT[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_days TEXT[];

-- 9. Table des Bons d'achat (vouchers)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_purchase NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS usage_logs JSONB;

-- 10. Table des Présences (attendance)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_hours NUMERIC(5,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT;

-- 11. Table des Paramètres (settings)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_template TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_template TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_points_per_currency_unit NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_point_value NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS accounting_format TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS site_locations JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS role_kpis JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notifications JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS operational_costs JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS locking_period_days INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS delivery_zones JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS paper_format TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS silent_printing BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS global_stock_alert_threshold INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS api_keys JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS available_taxes JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS display_price_ht BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_tiers JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS enable_time_clock BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS audit_log_retention_days INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS fast_mode_enabled BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_lead_time_days INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_points_per_unit NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS close_grid_on_select BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS enable_voice_guidance BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS role_permissions JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_orientation TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_rotation TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_width_custom NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_height_custom NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS enable_camera_portal BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS favorite_category_ids TEXT[];
ALTER TABLE settings ADD COLUMN IF NOT EXISTS quick_select_groups JSONB DEFAULT '[]'::jsonb;

-- 12. Table des Promotions (promotions)
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS conditions JSONB;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applicable_categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS buy_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS get_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applicable_products JSONB DEFAULT '[]'::jsonb;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 13. Table des Retours de Marchandise (returns)
ALTER TABLE returns ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS total_refund NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE returns ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'refund';

-- 14. Table des Commandes En Ligne (online_orders)
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS "statusHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS synced_to_pos BOOLEAN DEFAULT FALSE;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS assigned_employee_id TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS assigned_employee_name TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS assigned_picker_id TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS assigned_picker_name TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS status_history JSONB;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 15. Table des Achats (purchases)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS documents JSONB;

-- 16. Table des Bons de Commande (purchase_orders)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;

-- 17. Table des Ajustements de Stock (stock_adjustments)
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS cost_impact NUMERIC;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS new_quantity NUMERIC;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment INTEGER;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS is_loss BOOLEAN DEFAULT FALSE;

-- 18. Table des Paiements Fournisseurs (supplier_payments)
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS reference TEXT;

-- 19. Table des Audits (audits)
ALTER TABLE audits ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 20. Table de Journaux d'Audit (audit_logs)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "userName" TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- 21. Table des Articles Endommagés (damaged_items)
ALTER TABLE damaged_items ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE damaged_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE damaged_items ADD COLUMN IF NOT EXISTS claim_status TEXT;

-- 22. Table des Avances de Salaire (advances)
ALTER TABLE advances ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS repayment_date TIMESTAMPTZ;

-- III. ASSURER LA CRÉATION DES NOUVELLES TABLES SI ABSENTES
CREATE TABLE IF NOT EXISTS table_name (
    id BIGSERIAL PRIMARY KEY,
    inserted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    data JSONB,
    name TEXT
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

-- IV. POLICES DE PROTECTION DE HAUTE PERMISSIVITÉ POUR TOUTES LES TABLES
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
END $$;

-- V. INDEX COMPOSITE POUR LE CONTROLE DE PAGINATION
CREATE INDEX IF NOT EXISTS idx_products_updated_at_id ON products (updated_at DESC, id DESC);
`;
