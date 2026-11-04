import { Transaction, PurchaseOrder } from '../../types';

export interface ScfJournalEntry {
  date: string;
  journalCode: string; // 'VE' (Ventes), 'AC' (Achats), 'CA' (Caisse)
  pieceNumber: string;
  accountNumber: string; // Ex: 530000, 707000, 445700, 401000
  label: string;
  debit: number;
  credit: number;
}

export class ScfExportService {
  /**
   * Génère les écritures comptables du Journal des Ventes (VE)
   */
  static generateSalesJournalEntries(transactions: Transaction[]): ScfJournalEntry[] {
    const entries: ScfJournalEntry[] = [];

    for (const tx of transactions) {
      if (tx.status !== 'completed' || tx.total <= 0) continue;

      const dateStr = new Date(tx.date || (tx as any).created_at || Date.now())
        .toISOString()
        .split('T')[0];
      const piece = tx.id.slice(-8).toUpperCase();
      const totalTtc = tx.total;
      const totalTva = (tx as any).tax || (totalTtc * 0.19) / 1.19;
      const totalHt = Math.max(0, totalTtc - totalTva);

      // Compte de trésorerie / tiers au Débit
      let debitAccount = '530000'; // Caisse par défaut
      let accountLabel = 'Caisse Espèces';
      if (tx.paymentMethod === 'card') {
        debitAccount = '512000';
        accountLabel = 'Banque / TPE CIB';
      } else if (tx.paymentMethod === 'transfer') {
        debitAccount = '512100';
        accountLabel = 'Banque / BaridiMob';
      } else if (tx.paymentMethod === 'balance') {
        debitAccount = '411000';
        accountLabel = `Client ${(tx as any).customerName || 'Compte'}`;
      }

      // Ligne 1 : Débit Compte Trésorerie / Client (TTC)
      entries.push({
        date: dateStr,
        journalCode: 'VE',
        pieceNumber: piece,
        accountNumber: debitAccount,
        label: `Vente #${piece} - ${accountLabel}`,
        debit: Number(totalTtc.toFixed(2)),
        credit: 0
      });

      // Ligne 2 : Crédit Compte 707 (Ventes Marchandises HT)
      entries.push({
        date: dateStr,
        journalCode: 'VE',
        pieceNumber: piece,
        accountNumber: '707000',
        label: `Vente Marchandises HT #${piece}`,
        debit: 0,
        credit: Number(totalHt.toFixed(2))
      });

      // Ligne 3 : Crédit Compte 4457 (TVA Collectée) si TVA > 0
      if (totalTva > 0) {
        entries.push({
          date: dateStr,
          journalCode: 'VE',
          pieceNumber: piece,
          accountNumber: '445700',
          label: `TVA Collectée 19% #${piece}`,
          debit: 0,
          credit: Number(totalTva.toFixed(2))
        });
      }
    }

    return entries;
  }

  /**
   * Génère les écritures comptables du Journal des Achats (AC)
   */
  static generatePurchasesJournalEntries(purchases: PurchaseOrder[]): ScfJournalEntry[] {
    const entries: ScfJournalEntry[] = [];

    for (const po of purchases) {
      if ((po as any).status !== 'received' && (po as any).status !== 'completed') continue;

      const totalTtc = po.total || 0;
      if (totalTtc <= 0) continue;

      const dateStr = new Date((po as any).created_at || (po as any).date || Date.now())
        .toISOString()
        .split('T')[0];
      const piece = po.id.slice(-8).toUpperCase();
      const totalTva = (po as any).tax || (totalTtc * 0.19) / 1.19;
      const totalHt = Math.max(0, totalTtc - totalTva);

      // Ligne 1 : Débit Compte 380 (Achats de Marchandises HT)
      entries.push({
        date: dateStr,
        journalCode: 'AC',
        pieceNumber: piece,
        accountNumber: '380000',
        label: `Achat Fournisseur ${(po as any).supplierName || ''} HT`,
        debit: Number(totalHt.toFixed(2)),
        credit: 0
      });

      // Ligne 2 : Débit Compte 4456 (TVA Déductible sur Achats)
      if (totalTva > 0) {
        entries.push({
          date: dateStr,
          journalCode: 'AC',
          pieceNumber: piece,
          accountNumber: '445600',
          label: `TVA Déductible Achats #${piece}`,
          debit: Number(totalTva.toFixed(2)),
          credit: 0
        });
      }

      // Ligne 3 : Crédit Compte 401 (Fournisseurs - TTC)
      entries.push({
        date: dateStr,
        journalCode: 'AC',
        pieceNumber: piece,
        accountNumber: '401000',
        label: `Fournisseur ${(po as any).supplierName || 'Divers'} TTC`,
        debit: 0,
        credit: Number(totalTtc.toFixed(2))
      });
    }

    return entries;
  }

  /**
   * Exporte au format standard PC COMPTA (Fichier texte délimité par des points-virgules)
   * Structure PC Compta : Date;Journal;Compte;Libellé;Débit;Crédit;Pièce
   */
  static exportPcComptaFormat(entries: ScfJournalEntry[]): string {
    const lines = entries.map((e) => {
      const formattedDate = e.date.replace(/-/g, ''); // Format AAAAMMJJ
      const debitStr = e.debit > 0 ? e.debit.toFixed(2) : '';
      const creditStr = e.credit > 0 ? e.credit.toFixed(2) : '';
      return `${formattedDate};${e.journalCode};${e.accountNumber};${e.label};${debitStr};${creditStr};${e.pieceNumber}`;
    });

    return lines.join('\r\n');
  }

  /**
   * Exporte au format CSV universel SCF
   */
  static exportScfCsvFormat(entries: ScfJournalEntry[]): string {
    const header = 'Date;Code_Journal;Piece;N_Compte;Libelle;Debit_DA;Credit_DA\r\n';
    const lines = entries.map(
      (e) => `${e.date};${e.journalCode};${e.pieceNumber};${e.accountNumber};"${e.label}";${e.debit.toFixed(2)};${e.credit.toFixed(2)}`
    );
    return header + lines.join('\r\n');
  }

  /**
   * Déclenche le téléchargement d'un fichier comptable dans le navigateur
   */
  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
