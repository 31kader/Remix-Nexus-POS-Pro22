import fs from 'fs';
import { RealProductFixture } from './extremeLoadSimulationHelpers';

export interface SimulatedSupplier {
  id: string;
  name: string;
  category: string;
  initialBalance: number;
  currentBalance: number;
  totalPurchasedTTC: number;
  totalPaidTTC: number;
}

export interface SupplyChainProduct {
  id: string;
  name: string;
  barcode: string;
  costPrice: number;
  pmp: number;
  stock: number;
  unitsPerParent?: number;
  autoUnpack?: boolean;
  isCarton?: boolean;
}

export interface SimulatedPurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: { productId: string; name: string; orderedQty: number; costPrice: number; isCarton: boolean; unitsPerParent: number }[];
  totalTTC: number;
  status: 'ordered';
}

export interface SimulatedBLReception {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: { productId: string; name: string; orderedQty: number; receivedQty: number; unitCost: number; unpackedUnits: number; damagedUnits: number; incomingPampCost: number }[];
  invoiceTotalTTC: number;
  status: 'completed' | 'partial' | 'disputed';
  damagedIncidents: { id: string; productId: string; productName: string; quantity: number; lossValue: number; reason: string; claimStatus: 'to_claim' }[];
}

export interface SimulatedSupplierPayment {
  id: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: 'cash' | 'transfer' | 'check';
  date: string;
  note: string;
}

export function initSuppliersAndProducts(realProducts: RealProductFixture[]): {
  suppliers: SimulatedSupplier[];
  products: SupplyChainProduct[];
} {
  const suppliers: SimulatedSupplier[] = [
    { id: 'SUPP-01', name: 'Sarl Moula Agro & Minoterie', category: 'Céréales & Farines', initialBalance: 120000, currentBalance: 120000, totalPurchasedTTC: 0, totalPaidTTC: 0 },
    { id: 'SUPP-02', name: 'Spa Cevital Distribution', category: 'Huiles & Sucres', initialBalance: 85000, currentBalance: 85000, totalPurchasedTTC: 0, totalPaidTTC: 0 },
    { id: 'SUPP-03', name: 'Ifri Boissons & Eaux', category: 'Eaux & Sodas (Cartons)', initialBalance: 45000, currentBalance: 45000, totalPurchasedTTC: 0, totalPaidTTC: 0 },
    { id: 'SUPP-04', name: 'Snc Laiterie Soummam & Frais', category: 'Produits Laitiers', initialBalance: 60000, currentBalance: 60000, totalPurchasedTTC: 0, totalPaidTTC: 0 },
    { id: 'SUPP-05', name: 'Henkel Algérie & Droguerie', category: 'Lessives & Hygiène (Cartons)', initialBalance: 95000, currentBalance: 95000, totalPurchasedTTC: 0, totalPaidTTC: 0 }
  ];

  const products: SupplyChainProduct[] = realProducts.slice(0, 50).map((p, idx) => {
    const cost = parseFloat(p.cost_price) || 200;
    const isCarton = idx < 20; // 20 produits conditionnés en cartons
    const unitsPerParent = isCarton ? (idx % 2 === 0 ? 24 : 12) : 1;
    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode || `BAR-${idx + 1}`,
      costPrice: isCarton ? cost * unitsPerParent : cost,
      pmp: cost, // PAMP initial à l'unité
      stock: parseFloat(p.stock) || 50,
      unitsPerParent,
      autoUnpack: isCarton,
      isCarton
    };
  });

  return { suppliers, products };
}

export function buildPurchaseOrders(
  suppliers: SimulatedSupplier[],
  products: SupplyChainProduct[]
): SimulatedPurchaseOrder[] {
  const orders: SimulatedPurchaseOrder[] = [];

  for (let i = 0; i < 20; i++) {
    const supp = suppliers[i % suppliers.length];
    const poId = `PO-202611-${String(i + 1).padStart(3, '0')}`;
    const itemsCount = 3 + (i % 4); // 3 à 6 articles par commande
    const orderItems: SimulatedPurchaseOrder['items'] = [];
    let totalHT = 0;

    for (let j = 0; j < itemsCount; j++) {
      const prod = products[(i * 3 + j * 7) % products.length];
      const orderedQty = prod.isCarton ? 5 + (i % 5) : 20 + (i % 15);
      const lineCost = prod.costPrice * orderedQty;
      totalHT += lineCost;

      orderItems.push({
        productId: prod.id,
        name: prod.name,
        orderedQty,
        costPrice: prod.costPrice,
        isCarton: !!prod.isCarton,
        unitsPerParent: prod.unitsPerParent || 1
      });
    }

    const totalTTC = Math.round(totalHT * 1.19 * 100) / 100;
    orders.push({
      id: poId,
      supplierId: supp.id,
      supplierName: supp.name,
      date: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
      items: orderItems,
      totalTTC,
      status: 'ordered'
    });
  }

  return orders;
}

export function processBLReceptions(
  orders: SimulatedPurchaseOrder[]
): SimulatedBLReception[] {
  const receptions: SimulatedBLReception[] = [];

  for (let i = 0; i < orders.length; i++) {
    const po = orders[i];
    const blId = `BL-${po.id.replace('PO-', '')}`;
    const isPartial = i >= 14 && i < 18; // 4 réceptions partielles (14, 15, 16, 17)
    const hasDamage = i >= 18; // 2 réceptions avec litige avarie au déchargement (18, 19)

    let invoiceTotalHT = 0;
    const items: SimulatedBLReception['items'] = [];
    const damagedIncidents: SimulatedBLReception['damagedIncidents'] = [];

    for (const line of po.items) {
      let receivedQty = line.orderedQty;
      if (isPartial) {
        receivedQty = Math.max(1, Math.floor(line.orderedQty * 0.7)); // 70% reçu
      }

      let damagedUnits = 0;
      if (hasDamage && line.isCarton && damagedIncidents.length === 0) {
        damagedUnits = 1; // 1 carton endommagé au transport
      }

      const acceptedQty = Math.max(0, receivedQty - damagedUnits);
      const unpackedUnits = acceptedQty * line.unitsPerParent;
      const unitCostAfterColisage = line.costPrice / line.unitsPerParent;

      invoiceTotalHT += line.costPrice * receivedQty;

      if (damagedUnits > 0) {
        damagedIncidents.push({
          id: `DAM-${blId}-01`,
          productId: line.productId,
          productName: line.name,
          quantity: damagedUnits * line.unitsPerParent,
          lossValue: line.costPrice * damagedUnits,
          reason: 'Carton écrasé et marchandise brisée au déchargement du camion',
          claimStatus: 'to_claim'
        });
      }

      items.push({
        productId: line.productId,
        name: line.name,
        orderedQty: line.orderedQty,
        receivedQty: acceptedQty,
        unitCost: line.costPrice,
        unpackedUnits,
        damagedUnits,
        incomingPampCost: unitCostAfterColisage
      });
    }

    const invoiceTotalTTC = Math.round(invoiceTotalHT * 1.19 * 100) / 100;
    const status: SimulatedBLReception['status'] = hasDamage ? 'disputed' : (isPartial ? 'partial' : 'completed');

    receptions.push({
      id: blId,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      date: new Date().toISOString(),
      items,
      invoiceTotalTTC,
      status,
      damagedIncidents
    });
  }

  return receptions;
}

export function calculateNewPamp(
  currentStock: number,
  currentPamp: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  if (currentStock + incomingQty <= 0) return incomingUnitCost > 0 ? incomingUnitCost : currentPamp;
  const currentTotalVal = Math.max(0, currentStock) * currentPamp;
  const incomingTotalVal = incomingQty * incomingUnitCost;
  const newPamp = (currentTotalVal + incomingTotalVal) / (Math.max(0, currentStock) + incomingQty);
  return Math.round(newPamp * 100) / 100;
}

export function processSupplierPayments(
  receptions: SimulatedBLReception[],
  suppliers: SimulatedSupplier[]
): {
  payments: SimulatedSupplierPayment[];
  debtReconciliation: {
    totalInitialDebt: number;
    totalPurchasesTTC: number;
    totalPaidTTC: number;
    totalFinalDebt: number;
    discrepancy: number;
  };
} {
  const payments: SimulatedSupplierPayment[] = [];
  const suppMap = new Map(suppliers.map(s => [s.id, s]));

  let totalPurchasesTTC = 0;
  let totalPaidTTC = 0;

  for (let i = 0; i < receptions.length; i++) {
    const bl = receptions[i];
    const supp = suppMap.get(bl.supplierId);
    if (!supp) continue;

    totalPurchasesTTC += bl.invoiceTotalTTC;
    supp.totalPurchasedTTC += bl.invoiceTotalTTC;
    supp.currentBalance += bl.invoiceTotalTTC;

    // 8 règlements comptant 100%, 8 règlements 50%, 4 achats à crédit 0%
    let paymentAmount = 0;
    let method: 'cash' | 'transfer' | 'check' = 'transfer';

    if (i < 8) {
      paymentAmount = bl.invoiceTotalTTC;
      method = i % 2 === 0 ? 'transfer' : 'cash';
    } else if (i < 16) {
      paymentAmount = Math.round((bl.invoiceTotalTTC * 0.5) * 100) / 100;
      method = 'transfer';
    }

    if (paymentAmount > 0) {
      supp.currentBalance -= paymentAmount;
      supp.totalPaidTTC += paymentAmount;
      totalPaidTTC += paymentAmount;

      payments.push({
        id: `PAY-${bl.id}`,
        purchaseId: bl.id,
        supplierId: supp.id,
        supplierName: supp.name,
        amount: paymentAmount,
        method,
        date: new Date().toISOString(),
        note: `Règlement BL #${bl.id} (${paymentAmount === bl.invoiceTotalTTC ? 'Solde Total' : 'Acompte 50%'})`
      });
    }
  }

  const totalInitialDebt = suppliers.reduce((sum, s) => sum + s.initialBalance, 0);
  const totalFinalDebtCalculated = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);
  const expectedFinalDebt = totalInitialDebt + totalPurchasesTTC - totalPaidTTC;
  const discrepancy = Math.round((totalFinalDebtCalculated - expectedFinalDebt) * 100) / 100;

  return {
    payments,
    debtReconciliation: {
      totalInitialDebt: Math.round(totalInitialDebt * 100) / 100,
      totalPurchasesTTC: Math.round(totalPurchasesTTC * 100) / 100,
      totalPaidTTC: Math.round(totalPaidTTC * 100) / 100,
      totalFinalDebt: Math.round(totalFinalDebtCalculated * 100) / 100,
      discrepancy
    }
  };
}

export function updateSupplyChainReportStep(
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
      /\| \*\*Étape 0 : Cadrage & Référentiel Fournisseurs & Cartons\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Émission de 20 Bons de Commande \(Purchase Orders\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Réception Physique \(BL \/ GRN\) & Déconditionnement\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Recalcul Dynamique du PAMP & Historique Prix\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Grand Livre Dettes Fournisseurs & Règlements\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Clôture Comptable Supply Chain & Rapprochement Exact\*\* \|.*?\|.*?\|/
    ];

    const stepNames = [
      'Étape 0 : Cadrage & Référentiel Fournisseurs & Cartons',
      'Étape 1 : Émission de 20 Bons de Commande (Purchase Orders)',
      'Étape 2 : Réception Physique (BL / GRN) & Déconditionnement',
      'Étape 3 : Recalcul Dynamique du PAMP & Historique Prix',
      'Étape 4 : Grand Livre Dettes Fournisseurs & Règlements',
      'Étape 5 : Clôture Comptable Supply Chain & Rapprochement Exact'
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
    console.warn('[Simulation] Erreur maj rapport supply chain:', e);
  }
}
