import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { Category } from '../types';
import { localDb } from '../services/LocalDatabase';

/** Utility for Tailwind class merging */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const logAction = async (userId: string, userName: string, action: string, module: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  try {
    await localDb.insert(`auditLogs/${id}`, {
      id,
      timestamp: now,
      userId,
      userName,
      action,
      module,
      details,
      severity
    });
  } catch (error) {
    console.error("Critical failure in logAction:", error);
  }
};

export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export const formatProductStock = (p: any, allProducts: any[]) => {
  if (p.isBundle && p.bundleItems && p.bundleItems.length > 0) {
    const maxBundles = Math.min(...p.bundleItems.map((bi: any) => {
       const component = allProducts.find((prod: any) => prod.id === bi.productId);
       return component ? Math.floor(component.stock / bi.quantity) : 0;
    }));
    return `${maxBundles} (Pack)`;
  }
  
  const parentBundle = allProducts.find(prod => prod.isBundle && prod.bundleItems?.find((bi: any) => bi.productId === p.id && bi.quantity > 1));
  if (parentBundle) {
    const bundleDef = parentBundle.bundleItems!.find((bi: any) => bi.productId === p.id)!;
    const packs = Math.floor(p.stock / bundleDef.quantity);
    const units = p.stock % bundleDef.quantity;
    if (packs > 0) {
       return `${packs} Pac + ${units} Unit`;
    }
  }
  return `${p.stock}`;
};

export const calculateItemPrice = (item: any, isWholesale: boolean = false) => {
  let price = parseFloat(item.price?.toString()) || 0;
  if (isNaN(price)) price = 0;
  
  if (item.quantityDiscounts && item.quantityDiscounts.length > 0) {
    const applicableDiscount = [...item.quantityDiscounts]
      .sort((a, b) => b.minQuantity - a.minQuantity)
      .find((d: any) => item.quantity >= d.minQuantity);
    if (applicableDiscount) {
      const dPrice = parseFloat(applicableDiscount.discountPrice?.toString());
      if (!isNaN(dPrice)) price = dPrice;
    }
  }

  if (isWholesale && item.wholesalePrice !== undefined) {
    const wPrice = parseFloat(item.wholesalePrice?.toString());
    if (!isNaN(wPrice)) price = wPrice;
  }

  if (item.overriddenPrice !== undefined) {
    const oPrice = parseFloat(item.overriddenPrice?.toString());
    if (!isNaN(oPrice)) price = oPrice;
  }

  if (item.lineDiscount) {
    const dVal = parseFloat(item.lineDiscount.value?.toString());
    if (!isNaN(dVal)) {
      if (item.lineDiscount.type === 'percentage') {
        price = price * (1 - dVal / 100);
      } else {
        price = Math.max(0, price - dVal);
      }
    }
  }

  return isNaN(price) ? 0 : price;
};

export const exportToExcel = async (data: any[], fileName: string) => {
  try {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Catalogue");

    // Write binary buffer and trigger browser/electron blob download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xlsx`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err: any) {
    console.warn("XLSX direct export failed, using CSV fallback:", err);
    await exportToCSV(data, fileName);
  }
};

export const exportToCSV = async (data: any[], fileName: string) => {
  const Papa = (await import('papaparse')).default;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const isLocked = (timestamp: string, lockingPeriodDays: number) => {
  if (!lockingPeriodDays || lockingPeriodDays <= 0) return false;
  const tDate = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - tDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays > lockingPeriodDays;
};

export const safeDate = (val: any) => {
  if (!val) return new Date(0);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export const formatSafe = (val: any, formatStr: string, options?: any) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return format(d, formatStr, options);
};

/**
 * Safely extracts items array from any transaction, purchase, voucher, or audit record.
 * Handles undefined, null, raw arrays, and stringified JSON (common in Postgres JSONB fields).
 */
export const safeGetItems = <T = any>(record: any): T[] => {
  if (!record || record.items == null) return [];
  if (Array.isArray(record.items)) return record.items;
  if (typeof record.items === 'string') {
    try {
      const parsed = JSON.parse(record.items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Safely returns an array, or an empty array if null/undefined/invalid.
 */
export const safeArray = <T = any>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  return [];
};

/**
 * Safely converts any value to lowercase string. Returns empty string if null/undefined.
 */
export const safeLower = (val: any): string => {
  if (val == null) return '';
  return String(val).toLowerCase();
};

/**
 * Safely checks if target contains query (case-insensitive, null-safe).
 */
export const safeIncludes = (target: any, query: any): boolean => {
  return safeLower(target).includes(safeLower(query));
};

export const getHierarchicalCategories = (categories: Category[], parentId: string | null = null, level: number = 0): (Category & { level: number })[] => {
  let result: (Category & { level: number })[] = [];
  const children = categories.filter(c => (c.parentId || null) === parentId);
  for (const child of children) {
    result.push({ ...child, level });
    result = result.concat(getHierarchicalCategories(categories, child.id, level + 1));
  }
  return result;
};

export const getCategoryDescendants = (categories: Category[], categoryId: string): string[] => {
  const children = categories.filter(c => c.parentId === categoryId).map(c => c.id);
  let descendants = [...children];
  for (const childId of children) {
    descendants = descendants.concat(getCategoryDescendants(categories, childId));
  }
  return descendants;
};

export const getCategoryPath = (categoryId: string, categories: Category[]): string => {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return '';
  if (!category.parentId) return category.name;
  return `${getCategoryPath(category.parentId, categories)} > ${category.name}`;
};

// --- Price & Number Formatting Utilities ---
/**
 * Formate de manière sécurisée un prix ou montant numérique sans risque d'erreur toFixed sur undefined/null/NaN/Infinity.
 */
export function formatPrice(value: any, decimals: number = 2): string {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return (0).toFixed(decimals);
  }
  return num.toFixed(decimals);
}

// --- Audio Utilities ---
export const playScanSound = () => {
  // Désactivé : Le lecteur de code-barres physique bipe déjà naturellement
};

export const announcePrice = (name: string, price: number, currency: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  try {
    // Cancel previous speech
    window.speechSynthesis.cancel();
    
    // Hardened check for SpeechSynthesisUtterance
    const Utterance = (window as any).SpeechSynthesisUtterance;
    if (typeof Utterance !== 'function') return;

    // Safely check if it's a constructor
    const canUseNew = Utterance.prototype && typeof Utterance.prototype === 'object';
    const msg = canUseNew ? new Utterance() : (typeof Utterance === 'function' ? Utterance() : null);
    if (!msg) return;
    msg.text = `${name}. ${formatPrice(price, 2)} ${currency || 'DA'}`;
    msg.lang = 'fr-FR';
    msg.rate = 1.1;
    msg.pitch = 1;
    
    window.speechSynthesis.speak(msg);
  } catch (e) {
    console.warn('Speech synthesis failed:', e);
  }
};

const parseDatabaseDate = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  if (val && val.toDate && typeof val.toDate === 'function') {
    try { return val.toDate().toISOString(); } catch(e) { return new Date().toISOString(); }
  }
  if (val && val.seconds) {
    try { return new Date(val.seconds * 1000).toISOString(); } catch(e) { return new Date().toISOString(); }
  }
  return new Date().toISOString();
};

export const mapDoc = <T,>(doc: any): T => {
  let data: any;
  if (typeof doc.data === 'function') {
    data = doc.data();
  } else {
    const { id, ...rest } = doc;
    data = rest;
  }
  
  const dateFields = ["timestamp", "createdAt", "updatedAt", "date", "openedAt", "closedAt", "checkIn", "checkOut", "lastVisit", "lastSync", "startDate", "endDate"];
  for (const field of dateFields) {
    if (data[field]) {
      data[field] = parseDatabaseDate(data[field]);
    }
  }
  
  return { id: doc.id, ...data } as T;
};

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
    'id', 'name', 'barcode', 'sku', 'reference', 'image_url', 'image_urls', 
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 
    'stock', 'min_stock', 'category_id', 'brand_id', 'supplier', 'unit', 
    'status', 'description', 'is_bundle', 'bundle_items', 'quantity_discounts', 
    'tags', 'expiration_date', 'batch_number', 'location', 'show_in_pos', 
    'damaged_stock', 'created_at', 'updated_at',
    'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id',
    'is_quick_select'
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
      
      const jsonColumns = ['bundle_items', 'quantity_discounts', 'batches'];
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
