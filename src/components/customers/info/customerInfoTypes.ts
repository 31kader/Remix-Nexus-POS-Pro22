import { Customer, CompanySettings } from '../../../types';

export interface ParsedNoteInfo {
  isFinancial: boolean;
  type: 'versement' | 'retrait' | 'memo';
  typeLabel: string;
  badgeClass: string;
  description: string;
  amount: number | null;
  method: string | null;
  isPositive: boolean;
}

export function parseNoteFinancialInfo(noteStr: string): ParsedNoteInfo {
  if (!noteStr) {
    return {
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      description: 'Sans détail',
      amount: null,
      method: null,
      isPositive: true
    };
  }

  const isReglement = noteStr.includes('[REGLEMENT]');
  if (!isReglement) {
    return {
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: noteStr,
      amount: null,
      method: null,
      isPositive: true
    };
  }

  const isEncaissement = noteStr.toLowerCase().includes('encaissement') || noteStr.toLowerCase().includes('versement');
  const isDecaissement = noteStr.toLowerCase().includes('décaissement') || noteStr.toLowerCase().includes('decaissement') || noteStr.toLowerCase().includes('sortie') || noteStr.toLowerCase().includes('retrait');

  // Match amount like "de 2000.00 DA" or "de 2000 DA"
  const amountMatch = noteStr.match(/de\s+([0-9.,]+)\s*([A-Za-z]+)?/i);
  let amount: number | null = null;
  if (amountMatch) {
    const rawNum = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(rawNum)) amount = rawNum;
  }

  // Match payment method like "(CASH)" or "(CARD)"
  const methodMatch = noteStr.match(/\(([A-Z]+)\)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;

  // Clean description after dash " - "
  const dashIdx = noteStr.indexOf(' - ');
  let desc = dashIdx !== -1 ? noteStr.substring(dashIdx + 3).trim() : noteStr.replace('[REGLEMENT]', '').trim();
  if (!desc) desc = isEncaissement ? 'Versement / Règlement' : (isDecaissement ? 'Décaissement / Retrait' : 'Ajustement de solde');

  if (isEncaissement) {
    return {
      isFinancial: true,
      type: 'versement',
      typeLabel: 'Versement Client',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: desc,
      amount,
      method,
      isPositive: true
    };
  }

  if (isDecaissement) {
    return {
      isFinancial: true,
      type: 'retrait',
      typeLabel: 'Retrait / Décaissement',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: desc,
      amount,
      method,
      isPositive: false
    };
  }

  return {
    isFinancial: true,
    type: 'versement',
    typeLabel: 'Règlement',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: desc,
    amount,
    method,
    isPositive: true
  };
}

export interface CustomerInfoTabProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
  historyStats: {
    storeTotal: number;
    storeCount: number;
    onlineTotal: number;
    onlineCount: number;
    netTotal: number;
    returnsCount: number;
  };
}
