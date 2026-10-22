import bcrypt from 'bcryptjs';
import { dbState } from './local-db';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';

// Helper for generating standard matching IDs
export function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`;
}

export const TABLE_NAME_MAPPINGS: Record<string, string> = {
  'onlineOrders': 'online_orders',
  'goodsReceiptNotes': 'goods_receipt_notes',
  'stockAdjustments': 'stock_adjustments',
  'supplierPayments': 'supplier_payments',
  'supplierSyncs': 'supplier_syncs',
  'damagedItems': 'damaged_items',
  'auditLogs': 'audit_logs',
  'invoicePatterns': 'invoice_patterns',
  'purchaseOrders': 'purchase_orders',
  'shifts': 'cash_shifts',
  'cashShifts': 'cash_shifts',
  'cartDrafts': 'cart_drafts',
  'cashierAlerts': 'cashier_alerts',
  'externalDeliveryRequests': 'external_delivery_requests',
  'shortageItems': 'shortage_items',
  'customReplenishmentLists': 'custom_replenishment_lists'
};

// Convert camelCase keys to snake_case for Supabase PostgreSQL
export function camelToSnakeCase(str: string): string {
  if (str === 'activeSessionId') return 'activeSessionId';
  if (str === 'roleKPIs') return 'role_kpis';
  if (str === 'displayPriceHT') return 'display_price_ht';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case keys back to camelCase for the React frontend
export function snakeToCamelCase(str: string): string {
  if (str === 'role_kpis') return 'roleKPIs';
  if (str === 'display_price_ht') return 'displayPriceHT';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const RAW_JSONB_DICTIONARIES = new Set([
  'itemMappings', 'item_mappings',
  'metadata',
  'conditions',
  'discrepancies',
  'customFields', 'custom_fields'
]);

const ROLE_DICTIONARY_KEYS = new Set([
  'rolePermissions', 'role_permissions',
  'roleKPIs', 'role_kpis'
]);

export function normalizeRoleDictionaryToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: Record<string, any> = {};
  for (const [roleKey, roleVal] of Object.entries(obj)) {
    const normRoleKey = roleKey === 'cameraAgent' ? 'camera_agent' : roleKey;
    if (roleVal && typeof roleVal === 'object' && !Array.isArray(roleVal)) {
      const inner: Record<string, any> = {};
      for (const [k, v] of Object.entries(roleVal)) {
        inner[snakeToCamelCase(k)] = v;
      }
      result[normRoleKey] = inner;
    } else {
      result[normRoleKey] = roleVal;
    }
  }
  return result;
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
        const snakeKey = camelToSnakeCase(key);
        if (ROLE_DICTIONARY_KEYS.has(key) || ROLE_DICTIONARY_KEYS.has(snakeKey)) {
          newObj[snakeKey] = normalizeRoleDictionaryToCamel(obj[key]);
        } else if (RAW_JSONB_DICTIONARIES.has(key) || RAW_JSONB_DICTIONARIES.has(snakeKey)) {
          newObj[snakeKey] = obj[key];
        } else {
          newObj[snakeKey] = convertKeysToSnake(obj[key]);
        }
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
        const camelVal = (ROLE_DICTIONARY_KEYS.has(key) || ROLE_DICTIONARY_KEYS.has(targetKey))
          ? normalizeRoleDictionaryToCamel(val)
          : (RAW_JSONB_DICTIONARIES.has(key) || RAW_JSONB_DICTIONARIES.has(targetKey))
            ? val
            : convertKeysToCamel(val);
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

    // Map auditNote back to notes for transactions if notes is absent
    if (newObj.auditNote !== undefined && newObj.notes === undefined) {
      newObj.notes = newObj.auditNote;
    }

    // Safe auto-parse for cashierNotes if received as JSON string from Supabase
    if (newObj.cashierNotes && typeof newObj.cashierNotes === 'string') {
      const trimmed = newObj.cashierNotes.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          newObj.cashierNotes = Array.isArray(parsed) ? parsed : [parsed];
        } catch (_) {}
      }
    }

    // Safe auto-parse for JSONB / array columns if received as JSON string or non-array from Supabase / IndexedDB
    const alwaysArrayKeys = [
      'batches', 'bundleItems', 'quantityDiscounts', 'listIds', 'imageUrls',
      'priceHistory', 'favoriteItems', 'alerts', 'addresses', 'statusHistory',
      'discrepancies', 'usageLogs'
    ];
    for (const arrKey of alwaysArrayKeys) {
      if (newObj[arrKey] !== undefined && newObj[arrKey] !== null) {
        if (typeof newObj[arrKey] === 'string') {
          const trimmed = newObj[arrKey].trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              const parsed = JSON.parse(trimmed);
              newObj[arrKey] = Array.isArray(parsed) ? convertKeysToCamel(parsed) : [];
            } catch (_) {
              newObj[arrKey] = [];
            }
          } else {
            newObj[arrKey] = [];
          }
        } else if (!Array.isArray(newObj[arrKey])) {
          newObj[arrKey] = [];
        } else {
          newObj[arrKey] = convertKeysToCamel(newObj[arrKey]);
        }
      }
    }
    
    return newObj;
  }
  return obj;
}

// List of standard tables with explicit columns
export const TABLE_COLUMNS: Record<string, string[]> = {
  categories: ['id', 'name', 'parent_id', 'level', 'image_url', 'created_at', 'updated_at'],
  brands: ['id', 'name', 'logo_url', 'description', 'created_at'],
  products: [
    'id', 'name', 'barcode', 'sku', 'reference', 'image_url', 'image_urls', 'video_url',
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
    'stock', 'min_stock', 'category_id', 'brand_id', 'supplier', 'unit', 
    'status', 'description', 'is_bundle', 'bundle_items', 'quantity_discounts', 
    'tags', 'expiration_date', 'batch_number', 'location', 'show_in_pos', 
    'damaged_stock', 'created_at', 'updated_at',
    'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id', 'is_quick_select',
    'price_history'
  ],
  customers: [
    'id', 'name', 'phone', 'email', 'loyalty_points', 'balance', 'loyalty_card_number', 
    'total_spent', 'last_visit', 'notes', 'is_app_user', 'join_date', 
    'favorite_items', 'alerts', 'cashier_notes', 'updated_at',
    'created_at', 'purchase_count', 'last_purchase_date', 'password', 'password_hash',
    'address', 'addresses', 'latitude', 'longitude', 'maps_url',
    'auth_uid', 'storefront_image_url', 'store_name',
    'credit_limit', 'is_wholesale', 'birthday', 'city'
  ],
  transactions: [
    'id', 'total', 'payment_method', 'delivery_method', 'timestamp', 'created_at', 'updated_at', 'user_id', 
    'customer_id', 'customer_name', 'cashier_id', 'cashier_name', 'employee_id', 'employee_name', 'amount_received', 'amount_returned',
    'status', 'promotion_id', 'points_earned', 
    'discount_amount', 'points_discount', 'balance_used', 'voucher_discount', 
    'is_wholesale', 'online_order_id', 'items',
    'audit_status', 'audited_by', 'audited_at', 'audit_duration', 'audit_note',
    'is_edited', 'edited_at', 'edited_by', 'original_total', 'terminal_id', 'terminal_name'
  ],
  employees: [
    'id', 'name', 'role', 'phone', 'email', 'hire_date', 'status', 'is_clocked_in', 
    'base_salary', 'salary_type', 'hourly_rate', 'daily_rate', 
    'id_card_recto_url', 'id_card_verso_url', 'contract_url', 'digital_signature_url',
    'password_hash', 'pin', 'permissions', 'updated_at'
  ],
  attendance: [
    'id', 'employee_id', 'employee_name', 'clock_in', 'clock_out', 'date', 
    'total_hours', 'status'
  ],
  cash_shifts: [
    'id', 'opened_at', 'closed_at', 'opened_by', 'closed_by', 'initial_cash', 
    'final_cash', 'expected_cash', 'total_sales', 'total_cash_sales', 
    'total_card_sales', 'total_expenses', 'status', 'notes', 'terminal_id', 'terminal_name'
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
    'delivery_days', 'payment_days', 'planning_notes', 'reminders', 'updated_at', 'password_hash'
  ],
  users: [
    'id', 'uid', 'email', 'display_name', 'name', 'phone', 'employee_id', 'status', 'role', 'join_date', 'password', 'password_hash', 'pin', 'updated_at'
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
    'enable_camera_portal', 'favorite_category_ids', 'quick_select_groups',
    'show_logo_on_receipt', 'show_savings_on_receipt', 'custom_receipt_message', 'receipt_social_qr_url',
    'receipt_font_size', 'whatsapp_debt_reminder_template', 'whatsapp_receipt_template', 'scanner_sound_type',
    'enable_voice_announcement', 'voice_language', 'enable_keyboard_shortcuts',
    'expiry_critical_days_threshold', 'expiry_warning_days_threshold', 'cash_rounding_step',
    'enable_auto_backup_on_shift_close', 'auto_backup_frequency',
    'default_retail_margin_percent', 'default_wholesale_margin_percent', 'default_online_margin_percent',
    'silent_sync_notifications', 'hide_sync_studio_in_sidebar'
  ],
  promotions: [
    'id', 'name', 'description', 'type', 'value', 'min_purchase', 'start_date', 'end_date', 
    'conditions', 'active', 'is_active', 'applicable_categories', 'code', 'buy_quantity', 
    'get_quantity', 'applicable_products', 'updated_at'
  ],
  returns: [
    'id', 'transaction_id', 'product_id', 'quantity', 'reason', 'condition', 'refund_amount', 'date', 'status', 'notes',
    'items', 'total_refund', 'timestamp', 'user_id', 'customer_id', 'type', 'refund_method', 'updated_at'
  ],
  online_orders: [
    'id', 'external_order_id', 'customer_id', 'customer_name', 'customer_phone', 'customer_email',
    'items', 'subtotal', 'total', 'status', 'payment_status', 'payment_method', 'source', 'delivery_method', 
    'pickup_time', 'shipping_address', 'delivery_notes', 'notes', 'loyalty_points', 'synced_to_pos', 'assigned_employee_id', 
    'assigned_employee_name', 'assigned_picker_id', 'assigned_picker_name', 'status_history', 'timestamp', 'updated_at', 'created_at',
    'latitude', 'longitude', 'maps_url', 'gps_accuracy',
    'storefront_image_url', 'store_name', 'sales_rep_name'
  ],
  purchases: [
    'id', 'supplier_id', 'supplier_name', 'items', 'total_amount', 'status', 'invoice_number', 'date', 'payment_status', 'paid_amount', 'global_discount', 'global_tax', 'notes', 'updated_at', 'documents'
  ],
  purchase_orders: [
    'id', 'supplier_id', 'items', 'total_amount', 'total', 'status', 'expected_date', 'notes', 'order_number', 'created_at', 'updated_at'
  ],
  stock_adjustments: [
    'id', 'product_id', 'new_quantity', 'adjustment', 'reason', 'timestamp', 'user_id', 'user_name', 'is_loss', 'created_at', 'updated_at'
  ],
  supplier_payments: [
    'id', 'supplier_id', 'supplier_name', 'purchase_id', 'amount', 'method', 'date', 'reference', 'note', 'notes'
  ],
  audits: [
    'id', 'date', 'start_date', 'end_date', 'auditor_id', 'status', 'items', 'discrepancies', 'total_discrepancy_value', 'notes', 'completed_at'
  ],
  audit_logs: [
    'id', 'timestamp', 'user_id', 'user_name', 'action', 'module', 'details', 'severity', 'is_cancelled', 'cancelled_at', 'updated_at'
  ],
  supplier_syncs: [
    'id', 'supplier_id', 'last_sync', 'status', 'items_updated', 'errors'
  ],
  damaged_items: [
    'id', 'product_id', 'product_name', 'quantity', 'date', 'reported_by', 'user_id', 'user_name', 'reason', 'cost_price', 'claim_status', 'claim_notes', 'status', 'supplier_id'
  ],
  advances: [
    'id', 'employee_id', 'amount', 'date', 'reason', 'status', 'approved_by', 'repayment_date'
  ],
  invoice_patterns: ['id', 'type', 'prefix', 'suffix', 'digits', 'next_number', 'supplier_name', 'system_supplier_id', 'item_mappings', 'created_at', 'updated_at'],
  goods_receipt_notes: [
    'id', 'supplier_id', 'date', 'items', 'global_discount', 'global_vat', 'status'
  ],
  goodsReceiptNotes: [
    'id', 'supplier_id', 'date', 'items', 'global_discount', 'global_vat', 'status'
  ],
  shortage_items: [
    'id', 'product_id', 'name', 'barcode', 'quantity_needed', 'cost_price',
    'supplier_id', 'supplier_name', 'current_stock', 'min_stock', 'is_checked',
    'list_ids', 'created_at', 'updated_at', 'image_url', 'sku', 'unit',
    'is_custom_product', 'notes', 'priority'
  ],
  shortageItems: [
    'id', 'product_id', 'name', 'barcode', 'quantity_needed', 'cost_price',
    'supplier_id', 'supplier_name', 'current_stock', 'min_stock', 'is_checked',
    'list_ids', 'created_at', 'updated_at', 'image_url', 'sku', 'unit',
    'is_custom_product', 'notes', 'priority'
  ],
  custom_replenishment_lists: [
    'id', 'name', 'description', 'color', 'created_at', 'updated_at'
  ],
  customReplenishmentLists: [
    'id', 'name', 'description', 'color', 'created_at', 'updated_at'
  ]
};

export const CONFLICT_MAPS: Record<string, string[][]> = {
  customers: [
    ['loyalty_points', 'loyaltyPoints'],
    ['total_spent', 'totalSpent'],
    ['cashier_notes', 'cashierNotes'],
    ['is_app_user', 'isAppUser'],
    ['loyalty_card_number', 'loyaltyCardNumber'],
    ['updated_at', 'updatedAt'],
    ['created_at', 'createdAt'],
    ['last_purchase_date', 'lastPurchaseDate'],
    ['purchase_count', 'purchaseCount'],
    ['credit_limit', 'creditLimit']
  ],
  users: [
    ['display_name', 'displayName', 'name'],
    ['join_date', 'joinDate', 'createdAt', 'created_at'],
    ['password_hash', 'passwordHash']
  ]
};

export function preparePayload(table: string, id: string, data: any) {
  let combined = { ...data };
  if (table === 'products') {
    const dbCached = dbState?.products?.[id];
    let storeCached: any = undefined;
    try {
      storeCached = useCoreStore.getState().products?.find(p => p && p.id === id);
    } catch (_) {}
    if (storeCached || dbCached) {
      combined = { ...(storeCached || {}), ...(dbCached || {}), ...data };
    }
  } else if (table === 'customers') {
    let storeCached: any = undefined;
    try {
      storeCached = usePeopleStore.getState().customers?.find(c => c && c.id === id);
    } catch (_) {}
    const cached = dbState?.customers?.[id] || storeCached;
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'suppliers') {
    let storeCached: any = undefined;
    try {
      storeCached = usePeopleStore.getState().suppliers?.find(s => s && s.id === id);
    } catch (_) {}
    const cached = dbState?.suppliers?.[id] || storeCached;
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'users') {
    let storeCached: any = undefined;
    try {
      storeCached = usePeopleStore.getState().users?.find(u => u && (u.id === id || (u as any).uid === id));
    } catch (_) {}
    const cached = dbState?.users?.[id] || storeCached;
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'employees') {
    let storeCached: any = undefined;
    try {
      storeCached = usePeopleStore.getState().employees?.find(e => e && e.id === id);
    } catch (_) {}
    const cached = dbState?.employees?.[id] || storeCached;
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'online_orders' || table === 'onlineOrders') {
    const cached = dbState?.online_orders?.[id] || dbState?.onlineOrders?.[id];
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'shortage_items' || table === 'shortageItems') {
    const cached = dbState?.shortage_items?.[id] || dbState?.shortageItems?.[id];
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'custom_replenishment_lists' || table === 'customReplenishmentLists') {
    const cached = dbState?.custom_replenishment_lists?.[id] || dbState?.customReplenishmentLists?.[id];
    if (cached) {
      combined = { ...cached, ...data };
    }
  } else if (table === 'transactions') {
    const cached = dbState?.transactions?.[id];
    if (cached) {
      combined = { ...cached, ...data };
    }
  }
  // Map total to totalAmount for purchases/purchase_orders to align with Supabase schema
  if ((table === 'purchases' || table === 'purchase_orders') && combined.total !== undefined && combined.totalAmount === undefined) {
    combined.totalAmount = combined.total;
  }
  if (table === 'supplier_payments') {
    if (combined.note && !combined.notes) combined.notes = combined.note;
    if (combined.notes && !combined.note) combined.note = combined.notes;
  }
  if (table === 'damaged_items') {
    if (combined.userId && !combined.reported_by) combined.reported_by = combined.userId;
    if (combined.reported_by && !combined.userId) combined.userId = combined.reported_by;
  }
  if (table === 'transactions') {
    if (combined.notes && !combined.auditNote && !combined.audit_note) {
      combined.audit_note = combined.notes;
    }
  }
  const payload = { id, ...combined };
  
  const normTable = TABLE_NAME_MAPPINGS[table] || table;
  const allowed = TABLE_COLUMNS[normTable] || TABLE_COLUMNS[table];
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
      if (key === 'name') {
        if (table === 'products') return combined.name ? String(combined.name).trim() : undefined;
        return 'Sans nom';
      }
      if (key === 'unit') return 'pcs';
      if (key === 'status') {
        if (table === 'products' || table === 'employees' || table === 'users' || table === 'customers') return 'active';
        return null;
      }
      if (key === 'level') return 1;

      const nonNullableNumerics = [
        'price', 'cost_price', 'tax_rate', 'stock', 'min_stock', 
        'amount', 'total', 'points_earned', 'discount_amount', 
        'points_discount', 'balance_used', 'voucher_discount',
        'value', 'current_balance', 'min_purchase', 'loyalty_points', 'balance',
        'global_discount', 'global_vat'
      ];
      if (nonNullableNumerics.includes(key)) return 0;
      if (key === 'category_id') return 'uncategorized';
      return null;
    }

    const arrayKeys = ['tags', 'image_urls', 'categories', 'pre_sale_days', 'delivery_days', 'payment_days', 'list_ids'];
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
      'active', 'is_active', 'is_wholesale', 'pushed', 'is_cancelled', 'allow_negative_stock',
      'is_quick_select', 'close_grid_on_select', 'enable_voice_guidance', 'enable_camera_portal',
      'is_checked', 'is_custom_product',
      'show_logo_on_receipt', 'show_savings_on_receipt', 'enable_voice_announcement',
      'enable_keyboard_shortcuts', 'enable_auto_backup_on_shift_close',
      'silent_sync_notifications', 'hide_sync_studio_in_sidebar',
      'silent_printing', 'display_price_ht', 'enable_time_clock', 'fast_mode_enabled'
    ];
    if (booleanKeys.includes(key)) return !!val;

    const numericKeys = [
      'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
      'stock', 'min_stock', 'damaged_stock', 'total', 'amount', 'balance', 
      'loyalty_points', 'total_spent', 'expected_cash', 'final_cash', 
      'initial_cash', 'total_sales', 'total_expenses', 'level', 'points_earned',
      'discount_amount', 'points_discount', 'balance_used', 'voucher_discount', 'value', 'current_balance', 'min_purchase',
      'units_per_parent', 'label_width_custom', 'label_height_custom',
      'global_discount', 'global_vat', 'quantity_needed', 'current_stock',
      'credit_limit', 'total_discrepancy_value',
      'expiry_critical_days_threshold', 'expiry_warning_days_threshold', 'cash_rounding_step',
      'default_retail_margin_percent', 'default_wholesale_margin_percent', 'default_online_margin_percent'
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
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (_) {}
      return null;
    }

    if (key === 'cashier_notes') {
      if (typeof val === 'string') return val;
      return JSON.stringify(val || []);
    }

    if (key === 'details') {
      if (Array.isArray(val)) return val.length === 0 ? '' : JSON.stringify(val);
      if (val && typeof val === 'object') return JSON.stringify(val);
      return String(val ?? '');
    }

    const jsonKeys = [
      'bundle_items', 'quantity_discounts', 'usage_logs', 'items', 'alerts', 
      'favorite_items', 'batches', 'status_history', 'conditions',
      'documents', 'discrepancies', 'notifications', 'role_kpis',
      'role_permissions', 'favorite_category_ids', 'quick_select_groups',
      'price_history', 'reminders', 'addresses'
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

    // Safety checks for product non-nullable fields on full upserts; keep name undefined on partial updates so SyncService uses UPDATE
    if (table === 'products') {
      const hasExplicitName = Boolean(data && typeof data === 'object' && ('name' in data));
      if (!filtered.name) {
        const cached = dbState?.products?.[id];
        let storeProd: any = undefined;
        if (!cached?.name && id) {
          try {
            storeProd = useCoreStore.getState().products?.find(p => p && p.id === id);
          } catch (_) {}
        }
        const resolvedName = cached?.name || storeProd?.name || (typeof snakePayload.name === 'string' && snakePayload.name.trim() ? snakePayload.name.trim() : undefined);
        if (resolvedName && resolvedName !== 'Sans nom') {
          filtered.name = resolvedName;
        } else if (hasExplicitName) {
          filtered.name = 'Sans nom';
        } else {
          delete filtered.name;
        }
      }
      if (filtered.name) {
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
    }

    // Safety checks for customer non-nullable fields (e.g. name) on partial upserts
    if (table === 'customers') {
      if (!filtered.name) {
        let storeCachedName: string | undefined;
        try {
          storeCachedName = usePeopleStore.getState().customers?.find(c => c && c.id === id)?.name;
        } catch (_) {}
        const cached = dbState?.customers?.[id];
        filtered.name = cleanValueForPostgres('name', cached?.name || storeCachedName || snakePayload.name || 'Client');
      }
    }

    // Safety checks for supplier non-nullable fields (e.g. name) on partial upserts
    if (table === 'suppliers') {
      if (!filtered.name) {
        let storeCachedName: string | undefined;
        try {
          storeCachedName = usePeopleStore.getState().suppliers?.find(s => s && s.id === id)?.name;
        } catch (_) {}
        const cached = dbState?.suppliers?.[id];
        filtered.name = cleanValueForPostgres('name', cached?.name || storeCachedName || snakePayload.name || 'Fournisseur');
      }
    }

    // Safety checks for users table fields (guarantee non-null id/uid/display_name/role)
    if (table === 'users') {
      if (!filtered.id && filtered.uid) {
        filtered.id = filtered.uid;
      }
      if (!filtered.uid && filtered.id) {
        filtered.uid = filtered.id;
      }
      let storeCachedUser: any = undefined;
      try {
        storeCachedUser = usePeopleStore.getState().users?.find(u => u && (u.id === id || (u as any).uid === id));
      } catch (_) {}
      const cached = dbState?.users?.[id] || storeCachedUser;
      if (!filtered.display_name) {
        filtered.display_name = cleanValueForPostgres('display_name', cached?.displayName || cached?.name || snakePayload.displayName || snakePayload.name || 'Utilisateur');
      }
      if (!filtered.role) {
        filtered.role = cached?.role || snakePayload.role || 'staff';
      }
    }

    // Safety checks for online_orders bigint ID to prevent PostgreSQL 400 invalid input syntax
    if (table === 'online_orders' || table === 'onlineOrders') {
      if (filtered.id !== undefined && filtered.id !== null) {
        const numId = Number(filtered.id);
        if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
          delete filtered.id;
        } else {
          filtered.id = numId;
        }
      }
    }

    // Safety checks for invoice_patterns UUID ID to prevent PostgreSQL 400 invalid UUID syntax
    if (table === 'invoice_patterns' || table === 'invoicePatterns') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (filtered.id && !uuidRegex.test(String(filtered.id))) {
        delete filtered.id;
      }
    }

    // Safety mapping for transactions notes -> audit_note
    if (table === 'transactions') {
      if (!filtered.audit_note && snakePayload.notes) {
        filtered.audit_note = snakePayload.notes;
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
