import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { Category } from '../types';
import { localDb } from '../services/LocalDatabase';
import { exportToExcelSafely } from './excelSecurity';

/** Utility for Tailwind class merging */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 🛡️ Assainissement HTML strict anti-XSS (CWE-79) pour les modèles d'impression et l'affichage
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 🛡️ Validation d'URL stricte anti-SSRF (CWE-918)
 * Bloque les protocoles non HTTP/HTTPS ainsi que les adresses privées / de métadonnées cloud
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Bloquer les adresses de métadonnées Cloud (AWS, GCP, Azure, OpenStack)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'instance-data') {
      return false;
    }
    // Bloquer les plages loopback locales
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

export const logAction = async (userId: string, userName: string, action: string, module: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info', targetId?: string) => {
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
      severity,
      ...(targetId ? { targetId } : {})
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
    await exportToExcelSafely(data, fileName, "Catalogue");
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
export { playScanSound, announcePrice } from './audioUtils';

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

// --- Data Sanitizer Exports ---
export {
  sanitizeProductForSupabase,
  parseCashierNotes,
  type CashierNoteItem
} from './data-sanitizer';
