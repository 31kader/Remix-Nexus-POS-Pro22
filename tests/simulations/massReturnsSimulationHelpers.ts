import fs from 'fs';
import { RealProductFixture } from './extremeLoadSimulationHelpers';

export interface SimulatedCartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  taxRate: number;
}

export interface SimulatedHistoricalTransaction {
  id: string;
  items: SimulatedCartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  taxAmount: number;
  paymentMethod: 'cash' | 'card' | 'balance';
  customerId?: string;
  customerName?: string;
  pointsEarned: number;
  timestamp: string;
  status: 'completed' | 'returned' | 'partially_returned';
}

export type ReturnRefundMethod = 'cash' | 'voucher' | 'balance';

export interface ReturnItemDecision {
  lineId: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  decision: 'restock' | 'damaged'; // Sain (remis en vente) vs Avarié (perte sèche)
  reason: string;
}

export interface SimulatedReturnCase {
  id: string;
  transactionId: string;
  type: 'refund' | 'credit_note' | 'credit';
  refundMethod: ReturnRefundMethod;
  isPartial: boolean;
  items: ReturnItemDecision[];
  totalRefundTTC: number;
  refundHT: number;
  taxRefunded: number;
  voucherCode?: string;
  customerId?: string;
  customerPointsDeducted: number;
  timestamp: string;
}

export interface ReturnFiscalSummary {
  initialRevenueTTC: number;
  initialRevenueHT: number;
  initialTaxCollected: number;
  initialCogsHT: number;
  totalRefundedTTC: number;
  totalRefundedHT: number;
  totalTaxCancelled: number;
  restockedItemsCount: number;
  restockedValuePAMP: number;
  damagedItemsCount: number;
  damagedLossValuePAMP: number;
  netRevenueTTC: number;
  netRevenueHT: number;
  netTaxDue: number;
  finalGrossMarginDA: number;
}

export interface CashShiftReconciliation {
  initialCashFloat: number;
  totalCashSales: number;
  totalCashRefunds: number;
  theoreticalClosingCash: number;
  actualCountedCash: number;
  cashDiscrepancy: number;
}

export function buildHistoricalTransactions(
  products: RealProductFixture[],
  count: number = 50
): SimulatedHistoricalTransaction[] {
  const transactions: SimulatedHistoricalTransaction[] = [];
  const paymentMethods: Array<'cash' | 'card' | 'balance'> = ['cash', 'cash', 'card', 'balance'];

  for (let i = 0; i < count; i++) {
    const txId = `TX-HIST-${String(i + 1).padStart(3, '0')}`;
    const itemsCount = 10 + (i % 8); // 10 à 17 articles distincts par panier
    const items: SimulatedCartItem[] = [];

    let subtotal = 0;
    for (let j = 0; j < itemsCount; j++) {
      const p = products[(i * 3 + j * 5) % products.length];
      const price = parseFloat(p.price) || 250;
      const costPrice = parseFloat(p.cost_price) || (price * 0.75);
      const qty = 1 + ((i + j) % 3);

      items.push({
        id: `LINE-${txId}-${j + 1}`,
        productId: p.id,
        name: p.name,
        price,
        costPrice,
        quantity: qty,
        taxRate: 0.19
      });
      subtotal += price * qty;
    }

    const discountAmount = i % 5 === 0 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discountAmount;
    const totalHT = total / 1.19;
    const taxAmount = total - totalHT;
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const customerId = paymentMethod === 'balance' || i % 2 === 0 ? `CUST-${(i % 10) + 1}` : undefined;

    transactions.push({
      id: txId,
      items,
      subtotal,
      discountAmount,
      total,
      taxAmount,
      paymentMethod,
      customerId,
      customerName: customerId ? `Client Régulier #${customerId}` : undefined,
      pointsEarned: Math.floor(total * 0.01),
      timestamp: new Date(Date.now() - (50 - i) * 3600000).toISOString(),
      status: 'completed'
    });
  }

  return transactions;
}

export function buildSimulationReturns(
  transactions: SimulatedHistoricalTransaction[]
): SimulatedReturnCase[] {
  const returns: SimulatedReturnCase[] = [];

  for (let i = 0; i < 50; i++) {
    const tx = transactions[i];
    const isPartial = i < 25; // 25 partiels, 25 totaux
    const retId = `RET-${String(i + 1).padStart(3, '0')}`;

    // Ventilation des modes de remboursement :
    // 20 Espèces (cash), 15 Bons d'achat (voucher / credit_note), 15 Solde dette (balance / credit)
    let refundMethod: ReturnRefundMethod = 'cash';
    let type: 'refund' | 'credit_note' | 'credit' = 'refund';

    if (i >= 20 && i < 35) {
      refundMethod = 'voucher';
      type = 'credit_note';
    } else if (i >= 35) {
      refundMethod = 'balance';
      type = 'credit';
    }

    const selectedLines = isPartial ? tx.items.slice(0, 2 + (i % 3)) : [...tx.items];
    const discountRatio = tx.subtotal > 0 ? tx.total / tx.subtotal : 1;

    let totalRefundTTC = 0;
    const returnItems: ReturnItemDecision[] = [];

    selectedLines.forEach((item, idx) => {
      const returnQty = isPartial ? Math.max(1, Math.floor(item.quantity / 2)) : item.quantity;
      const lineRefund = item.price * returnQty * discountRatio;
      totalRefundTTC += lineRefund;

      // 70% sains (restock), 30% avariés/cassés (damaged)
      const isDamaged = (i + idx) % 3 === 0;
      returnItems.push({
        lineId: `RETLINE-${retId}-${idx + 1}`,
        productId: item.productId,
        name: item.name,
        quantity: returnQty,
        price: item.price,
        costPrice: item.costPrice,
        decision: isDamaged ? 'damaged' : 'restock',
        reason: isDamaged ? 'Produit endommagé / emballage déchiré' : 'Erreur choix client / article intact'
      });
    });

    totalRefundTTC = Math.min(tx.total, Math.round(totalRefundTTC * 100) / 100);
    const refundHT = totalRefundTTC / 1.19;
    const taxRefunded = totalRefundTTC - refundHT;

    const voucherCode = type === 'credit_note' ? `AVOIR-${tx.id.slice(-6)}-${String(i + 1).padStart(3, '0')}` : undefined;
    const customerPointsDeducted = Math.floor(totalRefundTTC * 0.01);

    returns.push({
      id: retId,
      transactionId: tx.id,
      type,
      refundMethod,
      isPartial,
      items: returnItems,
      totalRefundTTC,
      refundHT,
      taxRefunded,
      voucherCode,
      customerId: tx.customerId,
      customerPointsDeducted,
      timestamp: new Date().toISOString()
    });
  }

  return returns;
}

export function computeFiscalAndMarginSummary(
  transactions: SimulatedHistoricalTransaction[],
  returns: SimulatedReturnCase[]
): ReturnFiscalSummary {
  let initialRevenueTTC = 0;
  let initialCogsHT = 0;

  for (const tx of transactions) {
    initialRevenueTTC += tx.total;
    for (const item of tx.items) {
      initialCogsHT += item.costPrice * item.quantity;
    }
  }

  const initialRevenueHT = initialRevenueTTC / 1.19;
  const initialTaxCollected = initialRevenueTTC - initialRevenueHT;

  let totalRefundedTTC = 0;
  let restockedItemsCount = 0;
  let restockedValuePAMP = 0;
  let damagedItemsCount = 0;
  let damagedLossValuePAMP = 0;

  for (const ret of returns) {
    totalRefundedTTC += ret.totalRefundTTC;
    for (const it of ret.items) {
      if (it.decision === 'restock') {
        restockedItemsCount += it.quantity;
        restockedValuePAMP += it.costPrice * it.quantity;
      } else {
        damagedItemsCount += it.quantity;
        damagedLossValuePAMP += it.costPrice * it.quantity;
      }
    }
  }

  const totalRefundedHT = totalRefundedTTC / 1.19;
  const totalTaxCancelled = totalRefundedTTC - totalRefundedHT;

  const netRevenueTTC = initialRevenueTTC - totalRefundedTTC;
  const netRevenueHT = netRevenueTTC / 1.19;
  const netTaxDue = initialTaxCollected - totalTaxCancelled;

  // Calcul du bénéfice brut selon le standard Nexus POS (useProfitsReportLogic) :
  // 1. Coût d'achat des marchandises effectivement conservées par les clients (hors retours)
  const netSalesCogs = initialCogsHT - restockedValuePAMP - damagedLossValuePAMP;
  // 2. Bénéfice brut sur les ventes nettes conservées
  const grossSalesMargin = netRevenueTTC - netSalesCogs;
  // 3. Marge nette finale après absorption de la charge de perte sèche d'avaries au PAMP
  const finalGrossMarginDA = grossSalesMargin - damagedLossValuePAMP;

  return {
    initialRevenueTTC: Math.round(initialRevenueTTC * 100) / 100,
    initialRevenueHT: Math.round(initialRevenueHT * 100) / 100,
    initialTaxCollected: Math.round(initialTaxCollected * 100) / 100,
    initialCogsHT: Math.round(initialCogsHT * 100) / 100,
    totalRefundedTTC: Math.round(totalRefundedTTC * 100) / 100,
    totalRefundedHT: Math.round(totalRefundedHT * 100) / 100,
    totalTaxCancelled: Math.round(totalTaxCancelled * 100) / 100,
    restockedItemsCount,
    restockedValuePAMP: Math.round(restockedValuePAMP * 100) / 100,
    damagedItemsCount,
    damagedLossValuePAMP: Math.round(damagedLossValuePAMP * 100) / 100,
    netRevenueTTC: Math.round(netRevenueTTC * 100) / 100,
    netRevenueHT: Math.round(netRevenueHT * 100) / 100,
    netTaxDue: Math.round(netTaxDue * 100) / 100,
    finalGrossMarginDA: Math.round(finalGrossMarginDA * 100) / 100
  };
}

export function updateReturnsReportStep(
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
      /\| \*\*Étape 0 : Cadrage & Lot Historique \(50 Ventes\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Traitement de 50 Retours Clients & Remboursements\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Qualification Logistique \(Réintégration vs Pertes\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Régularisation Fiscale \(TVA 19%\) & Marges Réelles\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Synchronisation & Résilience Offline-First\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Clôture de Caisse & Rapprochement Mathématique\*\* \|.*?\|.*?\|/
    ];

    const stepNames = [
      'Étape 0 : Cadrage & Lot Historique (50 Ventes)',
      'Étape 1 : Traitement de 50 Retours Clients & Remboursements',
      'Étape 2 : Qualification Logistique (Réintégration vs Pertes)',
      'Étape 3 : Régularisation Fiscale (TVA 19%) & Marges Réelles',
      'Étape 4 : Synchronisation & Résilience Offline-First',
      'Étape 5 : Clôture de Caisse & Rapprochement Mathématique'
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
    console.warn('[Simulation] Erreur maj rapport retours:', e);
  }
}
