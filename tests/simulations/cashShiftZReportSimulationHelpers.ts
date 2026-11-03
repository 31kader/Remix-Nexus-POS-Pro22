import fs from 'fs';

export interface BanknoteDenominations {
  b2000: number; // Billets de 2000 DA
  b1000: number; // Billets de 1000 DA
  b500: number;  // Billets de 500 DA
  c200: number;  // Pièces de 200 DA
  c100: number;  // Pièces de 100 DA
  c50: number;   // Pièces de 50 DA
}

export interface SimulatedCashShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialCash: number;
  finalCash?: number;
  expectedCash?: number;
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalExpenses: number;
  status: 'open' | 'closed';
  notes?: string;
  terminalId: string;
  terminalName: string;
}

export interface SimulatedShiftExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: 'cash';
  date: string;
}

export function calculateDenominationsTotal(d: BanknoteDenominations): number {
  return (
    (d.b2000 || 0) * 2000 +
    (d.b1000 || 0) * 1000 +
    (d.b500 || 0) * 500 +
    (d.c200 || 0) * 200 +
    (d.c100 || 0) * 100 +
    (d.c50 || 0) * 50
  );
}

export function openNewCashShift(
  operatorName: string,
  denominations: BanknoteDenominations
): SimulatedCashShift {
  const initialCash = calculateDenominationsTotal(denominations);
  return {
    id: `SHIFT-20261103-01`,
    openedAt: new Date().toISOString(),
    openedBy: operatorName,
    initialCash,
    totalSales: 0,
    totalCashSales: 0,
    totalCardSales: 0,
    totalExpenses: 0,
    status: 'open',
    terminalId: 'TERM-POS-01',
    terminalName: 'Caisse Principale Tactile'
  };
}

export function buildShiftTransactions(): {
  transactions: any[];
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalCreditSales: number;
} {
  const transactions: any[] = [];
  let totalCashSales = 0;
  let totalCardSales = 0;
  let totalCreditSales = 0;

  // 18 ventes en espèces (total 145 000 DA)
  const cashAmounts = [
    5000, 8000, 12000, 6000, 9000, 15000, 4500, 7500, 11000,
    6500, 8500, 13000, 5500, 7000, 9500, 6000, 4000, 7000
  ];
  for (let i = 0; i < cashAmounts.length; i++) {
    const amt = cashAmounts[i];
    totalCashSales += amt;
    transactions.push({
      id: `TX-SHIFT-CASH-${String(i + 1).padStart(2, '0')}`,
      total: amt,
      paymentMethod: 'cash',
      amountReceived: amt,
      amountReturned: 0,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });
  }

  // 8 ventes par carte CIB/TPE (total 65 000 DA)
  const cardAmounts = [10000, 7000, 12000, 8000, 9000, 5000, 8000, 6000];
  for (let i = 0; i < cardAmounts.length; i++) {
    const amt = cardAmounts[i];
    totalCardSales += amt;
    transactions.push({
      id: `TX-SHIFT-CARD-${String(i + 1).padStart(2, '0')}`,
      total: amt,
      paymentMethod: 'card',
      timestamp: new Date().toISOString(),
      status: 'completed'
    });
  }

  // 4 ventes à crédit sur compte client (total 30 000 DA)
  const creditAmounts = [10000, 8000, 5000, 7000];
  for (let i = 0; i < creditAmounts.length; i++) {
    const amt = creditAmounts[i];
    totalCreditSales += amt;
    transactions.push({
      id: `TX-SHIFT-CREDIT-${String(i + 1).padStart(2, '0')}`,
      total: amt,
      paymentMethod: 'balance',
      timestamp: new Date().toISOString(),
      status: 'completed'
    });
  }

  const totalSales = totalCashSales + totalCardSales + totalCreditSales;
  return { transactions, totalSales, totalCashSales, totalCardSales, totalCreditSales };
}

export function buildShiftExpenses(): {
  expenses: SimulatedShiftExpense[];
  totalExpenses: number;
} {
  const expenses: SimulatedShiftExpense[] = [
    {
      id: 'EXP-01',
      description: 'Achat fournitures de nettoyage et d\'entretien caisse',
      amount: 3500,
      category: 'Entretien & Fournitures',
      paymentMethod: 'cash',
      date: new Date().toISOString()
    },
    {
      id: 'EXP-02',
      description: 'Règlement coursier express livraison commande urgente',
      amount: 1500,
      category: 'Transport & Logistique',
      paymentMethod: 'cash',
      date: new Date().toISOString()
    },
    {
      id: 'EXP-03',
      description: 'Prélèvement d\'écrémage de sécurité vers le coffre-fort central',
      amount: 50000,
      category: 'Transfert Coffre-Fort',
      paymentMethod: 'cash',
      date: new Date().toISOString()
    }
  ];

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  return { expenses, totalExpenses };
}

export function calculateExpectedCash(
  initialCash: number,
  totalCashSales: number,
  totalExpenses: number
): number {
  return initialCash + totalCashSales - totalExpenses;
}

export function evaluateCashDiscrepancy(
  expectedCash: number,
  actualCountedCash: number
): { diff: number; status: 'balanced' | 'shortage' | 'surplus'; label: string } {
  const diff = Math.round((actualCountedCash - expectedCash) * 100) / 100;
  if (diff === 0) return { diff: 0, status: 'balanced', label: 'Équilibre Absolu (0.00 DA)' };
  if (diff < 0) return { diff, status: 'shortage', label: `Mali de Caisse (Déficit : ${diff.toFixed(2)} DA)` };
  return { diff, status: 'surplus', label: `Boni de Caisse (Excédent : +${diff.toFixed(2)} DA)` };
}

export function closeCashShift(
  shift: SimulatedCashShift,
  finalCashVal: number,
  expectedCash: number,
  totalSales: number,
  totalCashSales: number,
  totalCardSales: number,
  totalExpenses: number,
  closedBy: string,
  notes: string = ''
): SimulatedCashShift {
  return {
    ...shift,
    closedAt: new Date().toISOString(),
    closedBy,
    finalCash: finalCashVal,
    expectedCash,
    totalSales,
    totalCashSales,
    totalCardSales,
    totalExpenses,
    status: 'closed',
    notes
  };
}

export function updateZReportReportStep(
  reportPath: string,
  stepNumber: number,
  status: string,
  details: string,
  extraMarkdown: string = ''
): void {
  try {
    if (!fs.existsSync(reportPath)) return;
    let content = fs.readFileSync(reportPath, 'utf8');

    const stepPatterns = [
      /\| \*\*Étape 0 : Ouverture de Shift & Dotation Fond de Caisse\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Ventes Multi-Moyens de Paiement du Shift\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Mouvements de Trésorerie Sortants \(Dépenses & Coffre\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Calcul Arithmétique de l'Attendu en Caisse\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Comptage par Coupures & Qualification des Écarts\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Clôture Définitive du Shift & Émission Rapport Z\*\* \|.*?\|.*?\|/
    ];

    const stepNames = [
      'Étape 0 : Ouverture de Shift & Dotation Fond de Caisse',
      'Étape 1 : Ventes Multi-Moyens de Paiement du Shift',
      'Étape 2 : Mouvements de Trésorerie Sortants (Dépenses & Coffre)',
      'Étape 3 : Calcul Arithmétique de l\'Attendu en Caisse',
      'Étape 4 : Comptage par Coupures & Qualification des Écarts',
      'Étape 5 : Clôture Définitive du Shift & Émission Rapport Z'
    ];

    const newRow = `| **${stepNames[stepNumber]}** | ${status} | ${details} |`;
    content = content.replace(stepPatterns[stepNumber], () => newRow);

    if (extraMarkdown) {
      const summaryMarker = '## 📊 Synthèse Finale Officielle';
      if (content.includes(summaryMarker)) {
        content = content.split(summaryMarker)[0].trim() + '\n\n' + extraMarkdown.trim() + '\n';
      } else {
        content += `\n\n${extraMarkdown}`;
      }
    }

    fs.writeFileSync(reportPath, content, 'utf8');
  } catch (e) {
    console.warn('[Simulation] Erreur maj rapport rapport Z:', e);
  }
}
