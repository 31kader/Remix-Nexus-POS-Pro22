import { ParsedGeneralNote } from './journalTypes';

export function parseNoteInfo(
  customerId: string,
  customerName: string,
  customerPhone: string | undefined,
  noteItem: any
): ParsedGeneralNote {
  const noteStr = noteItem?.note || '';
  const timestamp = noteItem?.timestamp || new Date().toISOString();
  const author = noteItem?.author || 'Caisse';

  if (!noteStr.includes('[REGLEMENT]')) {
    return {
      customerId,
      customerName,
      customerPhone,
      timestamp,
      author,
      note: noteStr,
      isFinancial: false,
      type: 'memo',
      typeLabel: 'Mémo',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: noteStr || 'Note de compte',
      amount: null,
      method: null
    };
  }

  const isEncaissement = noteStr.toLowerCase().includes('encaissement') || noteStr.toLowerCase().includes('versement');
  const isDecaissement = noteStr.toLowerCase().includes('décaissement') || noteStr.toLowerCase().includes('decaissement') || noteStr.toLowerCase().includes('sortie') || noteStr.toLowerCase().includes('retrait');

  // Match amount
  const amountMatch = noteStr.match(/de\s+([0-9.,]+)\s*([A-Za-z]+)?/i);
  let amount: number | null = null;
  if (amountMatch) {
    const rawNum = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(rawNum)) amount = rawNum;
  }

  // Match method
  const methodMatch = noteStr.match(/\(([A-Z]+)\)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;

  // Clean description
  const dashIdx = noteStr.indexOf(' - ');
  let desc = dashIdx !== -1 ? noteStr.substring(dashIdx + 3).trim() : noteStr.replace('[REGLEMENT]', '').trim();
  if (!desc) desc = isEncaissement ? 'Versement / Règlement' : (isDecaissement ? 'Décaissement / Retrait' : 'Ajustement');

  return {
    customerId,
    customerName,
    customerPhone,
    timestamp,
    author,
    note: noteStr,
    isFinancial: true,
    type: isDecaissement ? 'retrait' : 'versement',
    typeLabel: isDecaissement ? 'Retrait / Décaissement' : 'Versement Client',
    badgeClass: isDecaissement ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: desc,
    amount,
    method
  };
}
