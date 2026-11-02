import { AuditLog, Transaction } from '../../types';

export type AuditPeriodFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';
export type AuditActionCategory = 'all' | 'sales' | 'stock' | 'price_discount' | 'deletions' | 'returns_undo' | 'auth_security' | 'finance';
export type AuditShiftHourFilter = 'all' | 'morning' | 'afternoon' | 'night';
export type AuditSortBy = 'newest' | 'oldest' | 'severity_desc' | 'user_asc';

export const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  warning: 2,
  info: 1,
};

export function inferLogSeverity(log: AuditLog): 'info' | 'warning' | 'high' | 'critical' {
  if (log.severity && ['info', 'warning', 'high', 'critical'].includes(log.severity)) {
    return log.severity;
  }
  const text = `${log.action || ''} ${log.details || ''}`.toLowerCase();
  if (text.includes('suppr') || text.includes('delete') || text.includes('purge') || text.includes('annul') || (log as any).isCancelled) {
    return 'critical';
  }
  if (text.includes('prix') || text.includes('remise') || text.includes('marge') || text.includes('retour') || text.includes('ajustement')) {
    return 'high';
  }
  if (text.includes('modif') || text.includes('edit') || text.includes('dépense') || text.includes('ouverture')) {
    return 'warning';
  }
  return 'info';
}

export function inferActionCategory(log: AuditLog): AuditActionCategory {
  const act = `${log.action || ''} ${log.module || ''} ${log.details || ''}`.toLowerCase();
  if (act.includes('suppr') || act.includes('delete') || act.includes('purge') || act.includes('vider')) return 'deletions';
  if (act.includes('retour') || act.includes('annul') || act.includes('rollback') || (log as any).isCancelled) return 'returns_undo';
  if (act.includes('prix') || act.includes('remise') || act.includes('discount') || act.includes('tarif') || act.includes('marge')) return 'price_discount';
  if (act.includes('stock') || act.includes('inventaire') || act.includes('produit') || act.includes('article') || act.includes('audit')) return 'stock';
  if (act.includes('login') || act.includes('connexion') || act.includes('auth') || act.includes('mot de passe') || act.includes('pin') || act.includes('sécurité')) return 'auth_security';
  if (act.includes('dépense') || act.includes('caisse') || act.includes('clôture') || act.includes('fournisseur') || act.includes('versement')) return 'finance';
  if (act.includes('vente') || act.includes('pos') || act.includes('ticket') || act.includes('encaissement')) return 'sales';
  return 'sales';
}

export function extractAmountFromLog(log: AuditLog): number {
  const details = String(log.details || '');
  const match = details.match(/(\d[\d\s]*([.,]\d+)?)\s*(DA|DZD)/i) || details.match(/(\d{3,}([.,]\d+)?)/);
  if (!match) return 0;
  const cleaned = match[1].replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatAuditDetails(log: AuditLog, transactions: Transaction[] = []): string {
  const raw: any = log?.details;
  let str = '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed !== '' && trimmed !== '[]' && trimmed !== '{}' && trimmed !== 'null') {
      str = trimmed;
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    str = raw.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' • ');
  } else if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
    str = JSON.stringify(raw);
  }

  if (str) return str;

  // Enrichissement automatique si details était vide/[] sur d'anciens logs
  const act = String(log?.action || 'Opération').trim();
  const mod = String(log?.module || 'POS').trim();
  const usr = String(log?.userName || 'Opérateur').trim();
  const logTime = new Date(log?.timestamp || 0).getTime();

  if (act.toLowerCase().includes('vente') && !isNaN(logTime) && transactions.length > 0) {
    const matchedTx = transactions.find(t => {
      const txTime = new Date(t.timestamp || (t as any).date || 0).getTime();
      return !isNaN(txTime) && Math.abs(txTime - logTime) < 120000;
    });
    if (matchedTx) {
      const itemsCount = Array.isArray(matchedTx.items) ? matchedTx.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) : 0;
      const itemNames = Array.isArray(matchedTx.items) ? matchedTx.items.slice(0, 3).map(i => `${i.name} (x${i.quantity || 1})`).join(', ') : '';
      return `Ticket #${String(matchedTx.id).slice(-8)} • Total: ${Number(matchedTx.total || 0).toFixed(2)} DA • Paiement: ${matchedTx.paymentMethod || 'Espèces'} • ${itemsCount} art. (${itemNames})`;
    }
  }

  return `Action "${act}" exécutée dans le module [${mod}] par ${usr}`;
}
