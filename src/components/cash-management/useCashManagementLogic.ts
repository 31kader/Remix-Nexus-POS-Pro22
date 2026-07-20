import { useState, useMemo } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { formatSafe } from '../../lib/utils';
import { CashShift, Transaction, Expense, UserProfile as User, CompanySettings } from '../../types';

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
    const shiftTransactions = transactions.filter(t => 
      new Date(t.timestamp) >= new Date(activeShift.openedAt) && t.status !== 'returned'
    );
    const shiftExpenses = expenses.filter(e => 
      new Date(e.date) >= new Date(activeShift.openedAt)
    );

    const totalSales = shiftTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalCashSales = shiftTransactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0);
    const totalCardSales = shiftTransactions.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + t.total, 0);
    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = activeShift.initialCash + totalCashSales - totalExpenses;

    return { totalSales, totalCashSales, totalCardSales, totalExpenses, expectedCash };
  }, [activeShift, transactions, expenses]);

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
            <p>${settings.name}</p>
            <p>Session #${shift.id?.slice(-6).toUpperCase()}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Ouverture:</span> <span>${formatSafe(shift.openedAt, 'dd/MM HH:mm')}</span></div>
          <div class="row"><span>Fermeture:</span> <span>${formatSafe(shift.closedAt, 'dd/MM HH:mm')}</span></div>
          <div class="row"><span>Par:</span> <span>${shift.closedBy}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Fonds initiaux:</span> <span>${shift.initialCash.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>Ventes Espèces:</span> <span>${shift.totalCashSales?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>Dépenses:</span> <span>-${shift.totalExpenses?.toFixed(2)} ${settings.currency}</span></div>
          <div class="divider"></div>
          <div class="row total"><span>Attendu en caisse:</span> <span>${shift.expectedCash?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row total"><span>Réel en caisse:</span> <span>${shift.finalCash?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row" style="color: ${diff < 0 ? 'red' : 'green'}">
            <span>Écart:</span> <span>${diff.toFixed(2)} ${settings.currency}</span>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Ventes Carte:</span> <span>${shift.totalCardSales?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row total"><span>CHIFFRE D'AFFAIRES:</span> <span>${shift.totalSales?.toFixed(2)} ${settings.currency}</span></div>
          <div class="divider"></div>
          ${shift.notes ? `<p>Notes: ${shift.notes}</p>` : ''}
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
        status: 'open'
      };
      await localDb.insert(`shifts/${newId}`, newShift);
      setIsOpeningModalOpen(false);
      setInitialCash('');
    } catch (error: any) {
      alert("Erreur lors de l'ouverture de la caisse: " + error.message);
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
    } catch (error: any) {
      alert("Erreur lors de la clôture de la caisse: " + error.message);
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
