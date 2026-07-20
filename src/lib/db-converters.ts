import bcrypt from 'bcryptjs';
import { dbState } from './local-db';

// Helper for generating standard matching IDs
export function generateLocalId() {
  return Math.random().toString(36).substring(2, 10);
}

// Convert camelCase keys to snake_case for Supabase PostgreSQL
export function camelToSnakeCase(str: string): string {
  if (str === 'activeSessionId') return 'activeSessionId';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case keys back to camelCase for the React frontend
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function convertKeysToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnake);
  } else if (typeof obj === 'object') {
    if (obj instanceof Date) return obj.toISOString();
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[camelToSnakeCase(key)] = convertKeysToSnake(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export const isBadUrl = (url: any): boolean => {
  if (typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.includes('aistudio.google.com') ||
         u.includes('/aistudio/') ||
         (u.includes('/_/') && u.includes('/upload/') && u.includes('/file/')) ||
         u.includes('eb137f4a-fb23-4b8c-aec9-844aecbc242a');
};

export function convertKeysToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel);
  } else if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        let val = obj[key];
        const lowerKey = key.toLowerCase();
        if (typeof val === 'string' && lowerKey.includes('url') && isBadUrl(val)) {
          val = "";
        }
        const targetKey = snakeToCamelCase(key);
        const camelVal = convertKeysToCamel(val);
        if (newObj[targetKey] !== undefined && newObj[targetKey] !== null && (camelVal === undefined || camelVal === null)) {
          // Do not overwrite an existing non-null/non-undefined value with null/undefined
        } else {
          newObj[targetKey] = camelVal;
        }
      }
    }
    
    // Custom post-processing mapping for purchases and purchase orders
    if (newObj.totalAmount !== undefined && newObj.total === undefined) {
      newObj.total = newObj.totalAmount;
    }
    
    return newObj;
  }
  return obj;
}

// List of standard tables with explicit columns
export const TABLE_COLUMNS: Record<string, string[]> = {
  categories: ['id', 'name', 'parent_id', 'level', 'image_url'],
  brands: ['id', 'name', 'logo_url', 'description', 'created_at'],
  products: [
    'id', 'name', 'barcode', 'sku', 'reference', 'image_url', 'image_urls', 
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
    'stock', 'min_stock', 'category_id', 'brand_id', 'supplier', 'unit', 
    'status', 'description', 'is_bundle', 'bundle_items', 'quantity_discounts', 
    'tags', 'expiration_date', 'batch_number', 'location', 'show_in_pos', 
    'damaged_stock', 'created_at', 'updated_at',
    'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id', 'is_quick_select'
  ],
  customers: [
    'id', 'name', 'phone', 'email', 'loyalty_points', 'balance', 'loyalty_card_number', 
    'total_spent', 'last_visit', 'notes', 'is_app_user', 'join_date', 
    'favorite_items', 'alerts', 'cashier_notes', 'updated_at'
  ],
  transactions: [
    'id', 'total', 'payment_method', 'delivery_method', 'timestamp', 'user_id', 
    'customer_id', 'customer_name', 'status', 'promotion_id', 'points_earned', 
    'discount_amount', 'points_discount', 'balance_used', 'voucher_discount', 
    'is_wholesale', 'online_order_id', 'items',
    'audit_status', 'audited_by', 'audited_at', 'audit_duration', 'audit_note'
  ],
  employees: [
    'id', 'name', 'role', 'phone', 'email', 'hire_date', 'status', 'is_clocked_in', 
    'base_salary', 'salary_type', 'hourly_rate', 'daily_rate', 
    'id_card_recto_url', 'id_card_verso_url', 'contract_url', 'digital_signature_url'
  ],
  attendance: [
    'id', 'employee_id', 'employee_name', 'clock_in', 'clock_out', 'date', 
    'total_hours', 'status'
  ],
  cash_shifts: [
    'id', 'opened_at', 'closed_at', 'opened_by', 'closed_by', 'initial_cash', 
    'final_cash', 'expected_cash', 'total_sales', 'total_cash_sales', 
    'total_card_sales', 'total_expenses', 'status', 'notes'
  ],
  vouchers: [
    'id', 'code', 'type', 'value', 'current_balance', 'min_purchase', 'expiry_date', 
    'status', 'customer_id', 'customer_name', 'notes', 'created_at', 'usage_logs'
  ],
  expenses: [
    'id', 'description', 'amount', 'category', 'date', 'user_id', 'payment_method'
  ],
  cashier_alerts: [
    'id', 'employee_id', 'user_id', 'message', 'type', 'timestamp', 'read', 'from'
  ],
  cart_drafts: [
    'id', 'user_id', 'items', 'sessions', 'active_session_id', 'created_at', 'updated_at'
  ],
  external_delivery_requests: [
    'id', 'customer_name', 'phone', 'address', 'notes', 'total', 'status', 'created_at'
  ],
  suppliers: [
    'id', 'name', 'contact_name', 'phone', 'email', 'address', 'categories', 
    'feed_url', 'feed_format', 'last_sync', 'sync_enabled', 'is_app_user', 
    'has_full_inventory_access', 'balance', 'pre_sale_days', 
    'delivery_days', 'payment_days', 'planning_notes', 'updated_at'
  ],
  users: [
    'id', 'uid', 'email', 'display_name', 'role', 'join_date', 'password', 'password_hash'
  ],
  settings: [
    'id', 'name', 'logo_url', 'address', 'phone', 'email', 'tax_number', 'receipt_template', 'label_template', 
    'currency', 'tax_rate', 'loyalty_points_per_currency_unit', 'loyalty_point_value', 'footer_text', 
    'accounting_format', 'site_locations', 'role_kpis', 'notifications', 'operational_costs', 'locking_period_days', 
    'delivery_zones', 'paper_format', 'silent_printing', 'global_stock_alert_threshold', 'api_keys', 
    'available_taxes', 'display_price_ht', 'loyalty_tiers', 'enable_time_clock', 'session_timeout_minutes', 
    'audit_log_retention_days', 'brand_color', 'fast_mode_enabled', 'default_lead_time_days', 'loyalty_points_per_unit',
    'allow_negative_stock', 'close_grid_on_select', 'enable_voice_guidance', 'role_permissions',
    'label_orientation', 'label_rotation', 'label_width_custom', 'label_height_custom',
    'enable_camera_portal', 'favorite_category_ids', 'quick_select_groups'
  ],
  promotions: [
    'id', 'name', 'type', 'value', 'start_date', 'end_date', 'applicable_categories', 'code', 'buy_quantity', 'get_quantity', 'applicable_products', 'updated_at'
  ],
  returns: [
    'id', 'transaction_id', 'product_id', 'quantity', 'reason', 'condition', 'refund_amount', 'date', 'status', 'notes',
    'items', 'total_refund', 'timestamp', 'user_id', 'customer_id', 'type'
  ],
  online_orders: [
    'id', 'external_order_id', 'customer_id', 'customer_name', 'customer_phone', 'customer_email',
    'items', 'total', 'status', 'payment_status', 'payment_method', 'source', 'delivery_method', 
    'pickup_time', 'shipping_address', 'synced_to_pos', 'assigned_employee_id', 
    'assigned_employee_name', 'assigned_picker_id', 'assigned_picker_name', 'status_history', 'timestamp'
  ],
  purchases: [
    'id', 'supplier_id', 'supplier_name', 'items', 'total_amount', 'status', 'invoice_number', 'date', 'payment_status', 'paid_amount', 'global_discount', 'global_tax', 'notes', 'updated_at', 'documents'
  ],
  purchase_orders: [
    'id', 'supplier_id', 'items', 'total_amount', 'total', 'status', 'expected_date', 'notes', 'created_at'
  ],
  stock_adjustments: [
    'id', 'product_id', 'new_quantity', 'adjustment', 'reason', 'timestamp', 'user_id', 'user_name', 'is_loss'
  ],
  supplier_payments: [
    'id', 'supplier_id', 'amount', 'method', 'date', 'reference', 'notes'
  ],
  audits: [
    'id', 'date', 'auditor_id', 'status', 'discrepancies', 'notes', 'completed_at'
  ],
  audit_logs: [
    'id', 'timestamp', 'user_id', 'user_name', 'action', 'module', 'details', 'severity', 'is_cancelled', 'cancelled_at', 'updated_at'
  ],
  supplier_syncs: [
    'id', 'supplier_id', 'last_sync', 'status', 'items_updated', 'errors'
  ],
  damaged_items: [
    'id', 'product_id', 'quantity', 'date', 'reported_by', 'user_name', 'reason', 'cost_price', 'claim_status', 'status'
  ],
  advances: [
    'id', 'employee_id', 'amount', 'date', 'reason', 'status', 'approved_by', 'repayment_date'
  ],
  invoice_patterns: ['id', 'type', 'prefix', 'suffix', 'digits', 'next_number', 'supplier_name', 'system_supplier_id', 'item_mappings', 'updated_at'],
  goods_receipt_notes: [
    'id', 'supplier_id', 'date', 'items', 'global_discount', 'global_vat', 'status'
  ]
};

export const CONFLICT_MAPS: Record<string, string[][]> = {};

export function preparePayload(table: string, id: string, data: any) {
  let combined = { ...data };
  if (table === 'products') {
    const cached = dbState?.products?.[id];
    if (cached) {
      combined = { ...cached, ...data };
    }
  }
  // Map total to totalAmount for purchases/purchase_orders to align with Supabase schema
  if ((table === 'purchases' || table === 'purchase_orders') && combined.total !== undefined && combined.totalAmount === undefined) {
    combined.totalAmount = combined.total;
  }
  const payload = { id, ...combined };
  
  const allowed = TABLE_COLUMNS[table];
  if (allowed && allowed.includes('password_hash')) {
    const hasHash = (payload as any).passwordHash || (payload as any).password_hash || payload.password_hash;
    const hasPlain = payload.password || (payload as any).password;
    
    if (hasHash && hasHash !== '') {
      payload.password_hash = hasHash;
    } else if (hasPlain && hasPlain !== '') {
      if (typeof hasPlain === 'string' && (hasPlain.startsWith('$2a$') || hasPlain.startsWith('$2b$') || hasPlain.startsWith('$2y$'))) {
        payload.password_hash = hasPlain;
      } else {
        try {
          payload.password_hash = bcrypt.hashSync(hasPlain, 10);
        } catch (_) {
          payload.password_hash = hasPlain;
        }
      }
    }

    // Never persist plain password fields in outbound payloads.
    delete (payload as any).password;
    delete (payload as any).passwordHash;
  }

  const snakePayload = convertKeysToSnake(payload);
  
  const cleanValueForPostgres = (key: string, val: any) => {
    if (typeof val === 'string' && key.toLowerCase().includes('url') && isBadUrl(val)) {
      return null;
    }
    if (val === "" || val === undefined || val === null) {
      if (key === 'name') return 'Sans nom';
      if (key === 'unit') return 'pcs';
      if (key === 'status') return 'active';
      if (key === 'level') return 1;

      const nonNullableNumerics = [
        'price', 'cost_price', 'tax_rate', 'stock', 'min_stock', 
        'amount', 'total', 'points_earned', 'discount_amount', 
        'points_discount', 'balance_used', 'voucher_discount',
        'value', 'current_balance', 'min_purchase', 'loyalty_points', 'balance'
      ];
      if (nonNullableNumerics.includes(key)) return 0;
      if (key === 'category_id') return 'uncategorized';
      return null;
    }

    const arrayKeys = ['tags', 'image_urls', 'categories', 'pre_sale_days', 'delivery_days', 'payment_days'];
    if (arrayKeys.includes(key)) {
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch (_) {}
        return val.trim() ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      }
      return Array.isArray(val) ? val.filter(Boolean) : [];
    }

    const booleanKeys = [
      'is_bundle', 'show_in_pos', 'is_app_user', 'is_clocked_in', 'sync_enabled', 
      'has_full_inventory_access', 'use_multi_expiry', 'auto_unpack', 'synced_to_pos',
      'active', 'is_wholesale', 'pushed', 'is_cancelled', 'allow_negative_stock',
      'is_quick_select', 'close_grid_on_select', 'enable_voice_guidance', 'enable_camera_portal'
    ];
    if (booleanKeys.includes(key)) return !!val;

    const numericKeys = [
      'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
      'stock', 'min_stock', 'damaged_stock', 'total', 'amount', 'balance', 
      'loyalty_points', 'total_spent', 'expected_cash', 'final_cash', 
      'initial_cash', 'total_sales', 'total_expenses', 'level', 'points_earned',
      'discount_amount', 'points_discount', 'balance_used', 'voucher_discount', 'value', 'current_balance', 'min_purchase',
      'units_per_parent', 'label_width_custom', 'label_height_custom'
    ];
    if (numericKeys.includes(key)) {
      let parsedNum: number;
      if (typeof val === 'string') {
        parsedNum = parseFloat(val.replace(',', '.').replace(/[^\d.-]/g, ''));
      } else {
        parsedNum = Number(val);
      }
      return isNaN(parsedNum) ? (key === 'units_per_parent' ? 1 : 0) : parsedNum;
    }

    const dateKeys = ['expiration_date', 'date', 'hire_date', 'join_date', 'expiry_date', 'last_visit'];
    if (dateKeys.includes(key)) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (_) {}
      return null;
    }

    const jsonKeys = [
      'bundle_items', 'quantity_discounts', 'usage_logs', 'items', 'alerts', 
      'favorite_items', 'usage_logs', 'batches', 'status_history', 'conditions',
      'documents', 'discrepancies', 'notifications', 'role_kpis', 'details',
      'role_permissions', 'favorite_category_ids', 'quick_select_groups'
    ];
    if (jsonKeys.includes(key)) {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (_) { return []; }
      }
      return val || [];
    }

    return val;
  };

  if (allowed) {
    const filtered: any = {};
    for (const key of allowed) {
      if (snakePayload[key] !== undefined) {
         filtered[key] = cleanValueForPostgres(key, snakePayload[key]);
      }
    }

    // Safety checks for product non-nullable fields to prevent PostgreSQL 23502 NOT NULL constraints violations on partial upserts
    if (table === 'products') {
      if (filtered.name === undefined || filtered.name === null || filtered.name === '') {
        filtered.name = 'Sans nom';
      }
      if (filtered.category_id === undefined || filtered.category_id === null) {
        filtered.category_id = 'uncategorized';
      }
      if (filtered.unit === undefined || filtered.unit === null) {
        filtered.unit = 'pcs';
      }
      if (filtered.status === undefined || filtered.status === null) {
        filtered.status = 'active';
      }
    }

    // Populate conflicting duplicate columns so both are completely synchronized
    const groups = CONFLICT_MAPS[table];
    if (groups) {
      for (const group of groups) {
        let foundValue: any = undefined;
        for (const col of group) {
          if (filtered[col] !== undefined && filtered[col] !== null) {
            foundValue = filtered[col];
            break;
          }
        }
        if (foundValue !== undefined) {
          for (const col of group) {
            if (allowed.includes(col)) {
              filtered[col] = foundValue;
            }
          }
        }
      }
    }

    return filtered;
  }
  
  const result = { ...snakePayload };
  for (const key of Object.keys(result)) {
    result[key] = cleanValueForPostgres(key, result[key]);
  }

  // Populate conflicting duplicate columns for fallback
  const groups = CONFLICT_MAPS[table];
  if (groups) {
    for (const group of groups) {
      let foundValue: any = undefined;
      for (const col of group) {
        if (result[col] !== undefined && result[col] !== null) {
          foundValue = result[col];
          break;
        }
      }
      if (foundValue !== undefined) {
        for (const col of group) {
          result[col] = foundValue;
        }
      }
    }
  }

  return result;
}
