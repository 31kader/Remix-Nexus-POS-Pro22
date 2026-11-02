import { Transaction, OnlineOrder } from '../../types';

// Verrou mémoire atomique pour empêcher le traitement simultané d'une même commande
export const activeOrdersLock = new Set<string>();

export interface OrderItemLike {
  id?: string;
  productId?: string;
  barcode?: string;
  name?: string;
  quantity?: number;
  price?: number;
  costPrice?: number;
  taxRate?: number;
  unit?: string;
  [key: string]: unknown;
}

/**
 * Normalise l'ID d'une commande en ligne pour Supabase (int8 ou text)
 */
export function toSupabaseOrderId(id: string | number): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

/**
 * Échappe une chaîne pour utilisation dans une RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vérifie de façon stricte si une transaction correspond à une commande en ligne.
 * Empêche le bug P1-3 où `#2` matchait `#201` par substring.
 */
export function isTransactionMatchingOrder(t: Transaction, order: OnlineOrder): boolean {
  if (!t || !order) return false;
  const orderIdStr = String(order.id);
  const extIdStr = order.externalOrderId ? String(order.externalOrderId) : '';

  // 1. Correspondance exacte sur onlineOrderId
  if (t.onlineOrderId) {
    const tOnlineId = String(t.onlineOrderId);
    if (tOnlineId === orderIdStr) return true;
    if (extIdStr && tOnlineId === extIdStr) return true;
  }

  // 2. Correspondance stricte dans les notes avec bornes de mot
  if (t.notes) {
    const regexOrderId = new RegExp(`(^|[^0-9a-zA-Z])#?${escapeRegex(orderIdStr)}([^0-9a-zA-Z]|$)`);
    if (regexOrderId.test(t.notes)) return true;

    if (extIdStr) {
      const regexExtId = new RegExp(`(^|[^0-9a-zA-Z])#?${escapeRegex(extIdStr)}([^0-9a-zA-Z]|$)`);
      if (regexExtId.test(t.notes)) return true;
    }
  }

  return false;
}
