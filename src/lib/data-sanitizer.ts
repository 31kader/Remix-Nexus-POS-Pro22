export function sanitizeProductForSupabase(data: any): any {
  if (!data) return {};
  const snakeData: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeData[snakeKey] = data[key];
    }
  }
  
  const clean: any = {};
  const ALLOWED = [
    'id', 'name', 'barcode', 'sku', 'reference', 'image_url', 'image_urls', 'video_url',
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
    'stock', 'min_stock', 'category_id', 'brand_id', 'supplier', 'unit', 
    'status', 'description', 'is_bundle', 'bundle_items', 'quantity_discounts', 
    'tags', 'expiration_date', 'batch_number', 'location', 'show_in_pos', 
    'damaged_stock', 'created_at', 'updated_at',
    'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id',
    'is_quick_select', 'price_history'
  ];
  
  for (const col of ALLOWED) {
    if (snakeData[col] !== undefined) {
      let val = snakeData[col];
      
      const numericColumns = [
        'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
        'stock', 'min_stock', 'damaged_stock', 'units_per_parent'
      ];
      if (numericColumns.includes(col)) {
        if (typeof val === 'string') {
          val = parseFloat(val.replace(',', '.').replace(/[^\d.-]/g, ''));
        } else {
          val = Number(val);
        }
        if (isNaN(val)) {
          val = col === 'units_per_parent' ? 1 : 0;
        }
      }
      
      const arrayColumns = ['tags', 'image_urls'];
      if (arrayColumns.includes(col)) {
        if (typeof val === 'string') {
          try {
            val = JSON.parse(val);
          } catch (_) {
            val = val ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          }
        }
        if (!Array.isArray(val)) {
          val = [];
        }
      }
      
      const jsonColumns = ['bundle_items', 'quantity_discounts', 'batches', 'price_history'];
      if (jsonColumns.includes(col)) {
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) { val = []; }
        }
        if (!val) val = [];
      }

      const booleanColumns = ['use_multi_expiry', 'auto_unpack', 'is_quick_select'];
      if (booleanColumns.includes(col)) {
        val = !!val;
      }
      
      if (col === 'date' || col.endsWith('_date') || col === 'last_visit' || col === 'hire_date') {
        if (!val || typeof val !== 'string' || !val.trim()) {
          val = null;
        } else {
          try {
            const d = new Date(val.trim());
            if (!isNaN(d.getTime())) {
              val = d.toISOString().split('T')[0];
            } else {
              val = null;
            }
          } catch (_) {
            val = null;
          }
        }
      }
      
      clean[col] = val;
    }
  }

  // Safety fallbacks to satisfy NOT NULL constraints in PostgreSQL
  if (!clean.name || (typeof clean.name === 'string' && !clean.name.trim())) {
    clean.name = 'Sans nom';
  }
  if (clean.category_id === undefined || clean.category_id === null || clean.category_id === '') {
    clean.category_id = 'uncategorized';
  }
  if (clean.unit === undefined || clean.unit === null || clean.unit === '') {
    clean.unit = 'pcs';
  }
  if (clean.status === undefined || clean.status === null || clean.status === '') {
    clean.status = 'active';
  }
  
  return clean;
}

export interface CashierNoteItem {
  note: string;
  timestamp: string;
  author: string;
}

/**
 * Normalise et extrait de manière sécurisée les notes du caissier (cashierNotes),
 * quel que soit leur format d'origine (Array, JSON stringifié, texte brut, ou null/undefined).
 */
export function parseCashierNotes(raw: any): CashierNoteItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const result: CashierNoteItem[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === 'object') {
        const noteText = String(item.note || item.text || item.content || '').trim();
        if (noteText) {
          result.push({
            note: noteText,
            timestamp: String(item.timestamp || item.created_at || item.date || new Date().toISOString()),
            author: String(item.author || item.userName || item.created_by || 'Direction')
          });
        }
      } else if (typeof item === 'string') {
        const str = item.trim();
        if (str && !(str.length === 1 && /^[\[\]{}",\\:]$/.test(str))) {
          result.push({
            note: str,
            timestamp: new Date().toISOString(),
            author: 'Direction'
          });
        }
      }
    }
    return result;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseCashierNotes(parsed);
      } catch (_) {
        // En cas d'erreur de parsing JSON, traiter comme note texte brute
      }
    }
    return [{
      note: trimmed,
      timestamp: new Date().toISOString(),
      author: 'Direction'
    }];
  }

  if (typeof raw === 'object') {
    const noteText = String(raw.note || raw.text || raw.content || '').trim();
    if (!noteText) return [];
    return [{
      note: noteText,
      timestamp: String(raw.timestamp || raw.created_at || raw.date || new Date().toISOString()),
      author: String(raw.author || raw.userName || raw.created_by || 'Direction')
    }];
  }

  return [];
}
