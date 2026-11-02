import { sqlMigrationAlterColumnsPart1 } from './migrationTableColumns';

export { sqlMigrationAlterColumnsPart1 };

export const sqlMigrationTables = `-- SCRIPT DE MIGRATION GLOBAL ET HARMONISÉ
-- Ce script vérifie chaque table et ajoute de manière atomique toutes les colonnes requises
-- par l'application pour supprimer définitivement les incohérences de types et colonnes manquantes.

${sqlMigrationAlterColumnsPart1}

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
ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_method TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
