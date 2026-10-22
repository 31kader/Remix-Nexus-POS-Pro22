import { useState, useMemo } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { formatSafe } from '../../lib/utils';
import { CashShift, Transaction, Expense, UserProfile as User, CompanySettings, isTopUpTransaction } from '../../types';
import { getTerminalId, getTerminalName } from '../../services/terminalService';
import { escapeHtml } from '../../services/receiptPrintService';
import { toast } from 'sonner';

interface UseCashManagementLogicProps {
  activeShift: CashShift | null;
  shifts: CashShift[];
  transactions: Transaction[];
  expenses: Expense[];
  user: User;
  settings: CompanySettings;
}

export function useCashManagementLogic({
  activeShift,
  shifts,
  transactions,
  expenses,
  user,
  settings
}: UseCashManagementLogicProps) {
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [initialCash, setInitialCash] = useState('');
  const [finalCash, setFinalCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentShiftStats = useMemo(() => {
    if (!activeShift) return null;
    const openedAtDate = new Date(activeShift.openedAt);
    const openedTimestamp = !isNaN(openedAtDate.getTime()) ? openedAtDate.getTime() : 0;
    const openedDayUtc = !isNaN(openedAtDate.getTime()) ? openedAtDate.toISOString().slice(0, 10) : '';
    const openedDayLocal = !isNaN(openedAtDate.getTime())
      ? `${openedAtDate.getFullYear()}-${String(openedAtDate.getMonth() + 1).padStart(2, '0')}-${String(openedAtDate.getDate()).padStart(2, '0')}`
      : '';

    // Toutes les transactions non annulées réalisées pendant le shift (y compris celles retournées ensuite,
    // car leur remboursement en espèces génère une dépense 'Remboursement / Retour' déduite dans shiftExpenses)
    // 🛡️ BUG-05 : Filtrage par terminalId pour éviter les interférences multi-caisses
    const shiftTransactions = (transactions || []).filter(t => {
      if (!t || !t.timestamp) return false;
      if (new Date(t.timestamp).getTime() < openedTimestamp) return false;
      if (t.status === 'cancelled') return false;
      if (activeShift.terminalId && t.terminalId && t.terminalId !== activeShift.terminalId) return false;
      return true;
    });

    const shiftExpenses = (expenses || []).filter(e => {
      if (!e || !e.date) return false;
      // Seules les dépenses en espèces impactent le tiroir-caisse attendu
      const isCash = !e.paymentMethod || e.paymentMethod === 'cash';
      if (!isCash) return false;

      const rawTs = (e as any).createdAt || (e as any).timestamp || e.date;
      if (typeof rawTs === 'string' && rawTs.includes('T')) {
        const expTime = new Date(rawTs).getTime();
        return !isNaN(expTime) && expTime >= openedTimestamp;
      }

      // Si e.date est un format jour YYYY-MM-DD sans horodatage précis
      const expDateStr = String(e.date).trim().slice(0, 10);
      const isCurrentDay = expDateStr === openedDayLocal || expDateStr === openedDayUtc;
      const isFutureDay = expDateStr > openedDayLocal && expDateStr > openedDayUtc;
      if (!isCurrentDay && !isFutureDay) return false;

      // Si la dépense date d'aujourd'hui sans heure et qu'un shift antérieur a déjà été clôturé ce jour-là,
      // on ne l'attribue pas au shift suivant pour éviter la double soustraction
      if (isCurrentDay) {
        const hasEarlierClosedShiftSameDay = (shifts || []).some(s =>
          s && s.id !== activeShift.id && s.closedAt &&
          new Date(s.closedAt).getTime() <= openedTimestamp &&
          (new Date(s.openedAt).toISOString().slice(0, 10) === openedDayUtc ||
           `${new Date(s.openedAt).getFullYear()}-${String(new Date(s.openedAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(s.openedAt).getDate()).padStart(2, '0')}` === openedDayLocal)
        );
        if (hasEarlierClosedShiftSameDay) return false;
      }
      return true;
    });

    const getCollectedForTx = (t: Transaction) => {
      const total = Number(t.total) || 0;
      const balanceUsed = Number(t.balanceUsed) || 0;
      let collected = Math.max(0, total - balanceUsed);
      // 🛡️ P1-BIZ-9 : Prise en compte de la monnaie conservée en solde (amountReceived - amountReturned)
      if (t.amountReceived !== undefined && t.amountReturned !== undefined) {
        const netCashReceived = Math.max(0, Number(t.amountReceived) - Number(t.amountReturned));
        if (netCashReceived > collected) {
          collected = netCashReceived;
        }
      }
      return collected;
    };

    // 🛡️ BUG-05 : Prise en compte des espèces encaissées pour les ventes mixtes ou à crédit avec acompte
    const getCashCollectedForTx = (t: Transaction) => {
      if (t.paymentMethod === 'cash') {
        return getCollectedForTx(t);
      }
      if (t.paymentMethod === 'debt' || (t.paymentMethod as string) === 'credit') {
        if (t.amountReceived !== undefined && Number(t.amountReceived) > 0) {
          return Math.max(0, Number(t.amountReceived) - Number(t.amountReturned || 0));
        }
        if ((t as any).cashReceived !== undefined && Number((t as any).cashReceived) > 0) {
          return Number((t as any).cashReceived);
        }
        if ((t as any).paidAmount !== undefined && Number((t as any).paidAmount) > 0) {
          return Number((t as any).paidAmount);
        }
      }
      if ((t.paymentMethod as string) === 'mixed' || (t.paymentMethod as string) === 'split') {
        if ((t as any).cashReceived !== undefined && Number((t as any).cashReceived) > 0) {
          return Number((t as any).cashReceived);
        }
        if (t.amountReceived !== undefined && Number(t.amountReceived) > 0) {
          return Math.max(0, Number(t.amountReceived) - Number(t.amountReturned || 0));
        }
      }
      return 0;
    };

    const totalSales = shiftTransactions
      .filter(t => t.status !== 'returned' && !isTopUpTransaction(t))
      .reduce((sum, t) => sum + (Number(t.total) || 0), 0);

    // Pour le tiroir-caisse : une vente espèces encaissée pendant ce shift puis remboursée en espèces pendant ce shift
    // a d'abord mis le cash dans le tiroir (+getCollectedForTx) puis créé une dépense 'Remboursement / Retour' (-refundAmount).
    // Si la vente a été retournée contre avoir/bon d'achat (sans dépense cash), on ne compte pas le montant retourné.
    const hasCashRefundExpenseForTx = (txId: string) =>
      shiftExpenses.some(e => e.category === 'Remboursement / Retour' && e.description && e.description.includes(String(txId).slice(0, 6)));

    const totalCashSales = shiftTransactions
      .filter(t => t.status !== 'returned' || hasCashRefundExpenseForTx(t.id))
      .reduce((sum, t) => sum + getCashCollectedForTx(t), 0);

    const totalCardSales = shiftTransactions
      .filter(t => t.paymentMethod === 'card' && t.status !== 'returned' && !isTopUpTransaction(t))
      .reduce((sum, t) => sum + getCollectedForTx(t), 0);

    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const initialCashNum = Number(activeShift.initialCash) || 0;
    const expectedCash = initialCashNum + totalCashSales - totalExpenses;

    return { totalSales, totalCashSales, totalCardSales, totalExpenses, expectedCash };
  }, [activeShift, shifts, transactions, expenses]);

  const printZReport = (shift: CashShift, settings: CompanySettings) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const diff = (shift.finalCash || 0) - (shift.expectedCash || 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport Z - ${formatSafe(shift.closedAt, 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.1em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RAPPORT Z</h2>
            <p>${escapeHtml(settings.name || 'NEXUS STORE')}</p>
            <p>Poste: ${escapeHtml(shift.terminalName || shift.terminalId || getTerminalName())}</p>
            <p>Session #${String(shift.id || '').slice(-6).toUpperCase()}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Ouverture:</span> <span>${formatSafe(shift.openedAt, 'dd/MM HH:mm')}</span></div>
          <div class="row"><span>Fermeture:</span> <span>${formatSafe(shift.closedAt, 'dd/MM HH:mm')}</span></div>
          <div class="row"><span>Par:</span> <span>${escapeHtml(shift.closedBy || 'Caissier')}</span></div>
          <div class="row"><span>Caisse ID:</span> <span>${escapeHtml(shift.terminalId || getTerminalId())}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Fonds initiaux:</span> <span>${Number(shift.initialCash || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>Ventes Espèces:</span> <span>${Number(shift.totalCashSales || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>Dépenses:</span> <span>-${Number(shift.totalExpenses || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="divider"></div>
          <div class="row total"><span>Attendu en caisse:</span> <span>${Number(shift.expectedCash || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="row total"><span>Réel en caisse:</span> <span>${Number(shift.finalCash || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="row" style="color: ${diff < 0 ? 'red' : 'green'}">
            <span>Écart:</span> <span>${Number(diff || 0).toFixed(2)} ${settings.currency}</span>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Ventes Carte:</span> <span>${Number(shift.totalCardSales || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="row total"><span>CHIFFRE D'AFFAIRES:</span> <span>${Number(shift.totalSales || 0).toFixed(2)} ${settings.currency}</span></div>
          <div class="divider"></div>
          ${shift.notes ? `<p>Notes: ${escapeHtml(shift.notes)}</p>` : ''}
          <div class="footer">
            <p>Nexus POS - Logiciel de Caisse</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenShift = async () => {
    if (!initialCash || isProcessing) return;
    setIsProcessing(true);
    try {
      const newId = Math.random().toString(36).substring(2, 10);
      const newShift: CashShift = {
        id: newId,
        openedAt: new Date().toISOString(),
        openedBy: user.displayName || user.email || 'Unknown',
        initialCash: parseFloat(initialCash) || 0,
        status: 'open',
        terminalId: getTerminalId(),
        terminalName: getTerminalName()
      };
      await localDb.insert(`shifts/${newId}`, newShift);
      setIsOpeningModalOpen(false);
      setInitialCash('');
      toast.success("Session de caisse ouverte avec succès !");
    } catch (error: any) {
      toast.error("Erreur lors de l'ouverture de la caisse: " + (error?.message || "Erreur inconnue"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift || !finalCash || !currentShiftStats || isProcessing) return;
    setIsProcessing(true);
    try {
      const finalCashVal = parseFloat(finalCash) || 0;
      const updatedShift: Partial<CashShift> = {
        closedAt: new Date().toISOString(),
        closedBy: user.displayName || user.email || 'Unknown',
        finalCash: finalCashVal,
        expectedCash: currentShiftStats.expectedCash,
        totalSales: currentShiftStats.totalSales,
        totalCashSales: currentShiftStats.totalCashSales,
        totalCardSales: currentShiftStats.totalCardSales,
        totalExpenses: currentShiftStats.totalExpenses,
        status: 'closed',
        notes
      };
      
      await localDb.update(`shifts/${activeShift.id}`, updatedShift);

      setIsClosingModalOpen(false);
      setFinalCash('');
      setNotes('');
      
      printZReport({ ...activeShift, ...updatedShift } as CashShift, settings);
      toast.success("Caisse clôturée avec succès et Rapport Z généré !");
    } catch (error: any) {
      toast.error("Erreur lors de la clôture de la caisse: " + (error?.message || "Erreur inconnue"));
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isOpeningModalOpen,
    setIsOpeningModalOpen,
    isClosingModalOpen,
    setIsClosingModalOpen,
    initialCash,
    setInitialCash,
    finalCash,
    setFinalCash,
    notes,
    setNotes,
    isProcessing,
    currentShiftStats,
    handleOpenShift,
    handleCloseShift,
    printZReport
  };
}
