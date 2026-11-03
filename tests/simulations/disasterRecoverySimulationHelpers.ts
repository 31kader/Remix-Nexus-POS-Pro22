import fs from 'fs';
import { RealProductFixture } from './extremeLoadSimulationHelpers';
import { BackupData } from '../../src/services/backup/backupRestoreProcessor';

export interface LocalStoreState {
  products: any[];
  transactions: any[];
  customers: any[];
  suppliers: any[];
  purchases: any[];
  expenses: any[];
}

export interface IncrementalDayBatch {
  transactions: any[];
  purchases: any[];
  topUps: any[];
}

export interface DisasterRecoveryFingerprint {
  totalTxCount: number;
  totalTxVolumeDA: number;
  stocksByProduct: Map<string, number>;
  customerBalances: Map<string, number>;
  supplierBalances: Map<string, number>;
}

export function buildPreDisasterState(realProducts: RealProductFixture[]): LocalStoreState {
  const products = realProducts.slice(0, 100).map((p, idx) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price) || 250,
    costPrice: parseFloat(p.cost_price) || 180,
    stock: parseFloat(p.stock) || 100,
    barcode: p.barcode || `BAR-${idx + 1}`
  }));

  const customers = [
    { id: 'CUST-01', name: 'Mourad B.', balance: -20000 },
    { id: 'CUST-02', name: 'Karim O.', balance: -15000 },
    { id: 'CUST-03', name: 'Amine M.', balance: 5000 },
    { id: 'CUST-04', name: 'Farid S.', balance: -10000 },
    { id: 'CUST-05', name: 'Yacine B.', balance: -35000 }
  ];

  const suppliers = [
    { id: 'SUPP-01', name: 'Moula Minoterie', currentBalance: 80000 },
    { id: 'SUPP-02', name: 'Cevital Huiles', currentBalance: 65000 },
    { id: 'SUPP-03', name: 'Ifri Boissons', currentBalance: 40000 }
  ];

  const transactions: any[] = [];
  for (let i = 0; i < 50; i++) {
    const prod = products[i % products.length];
    const qty = 2;
    prod.stock -= qty;

    transactions.push({
      id: `TX-HIST-${String(i + 1).padStart(3, '0')}`,
      total: prod.price * qty,
      items: [{ productId: prod.id, name: prod.name, quantity: qty, price: prod.price }],
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      paymentMethod: 'cash'
    });
  }

  return {
    products,
    transactions,
    customers,
    suppliers,
    purchases: [],
    expenses: []
  };
}

export function createDailyBackupSnapshot(state: LocalStoreState, dateStr: string): BackupData {
  return {
    version: '1.2.70',
    createdAt: `${dateStr}T23:59:59.000Z`,
    appName: 'Nexus POS Pro',
    settings: { name: 'Nexus Supermarché Pro', currency: 'DA' },
    products: JSON.parse(JSON.stringify(state.products)),
    transactions: JSON.parse(JSON.stringify(state.transactions)),
    customers: JSON.parse(JSON.stringify(state.customers)),
    suppliers: JSON.parse(JSON.stringify(state.suppliers)),
    purchases: JSON.parse(JSON.stringify(state.purchases)),
    expenses: JSON.parse(JSON.stringify(state.expenses)),
    categories: [],
    brands: [],
    employees: [],
    stockAdjustments: []
  };
}

export function executeDayJActivity(state: LocalStoreState): IncrementalDayBatch {
  const newTransactions: any[] = [];

  // 1. 15 ventes du jour J
  for (let i = 0; i < 15; i++) {
    const prod = state.products[(i * 3) % state.products.length];
    const qty = 3;
    prod.stock -= qty;

    newTransactions.push({
      id: `TX-DAY-J-${String(i + 1).padStart(2, '0')}`,
      total: prod.price * qty,
      items: [{ productId: prod.id, name: prod.name, quantity: qty, price: prod.price }],
      timestamp: new Date().toISOString(),
      paymentMethod: i % 3 === 0 ? 'card' : 'cash'
    });
    state.transactions.push(newTransactions[newTransactions.length - 1]);
  }

  // 2. 1 BL réapprovisionnement fournisseur (250 unités)
  const targetProd = state.products[0];
  const reapproQty = 250;
  const reapproCost = targetProd.costPrice * reapproQty;
  targetProd.stock += reapproQty;

  const newPurchases: any[] = [{
    id: 'BL-DAY-J-01',
    supplierId: state.suppliers[0].id,
    total: reapproCost,
    items: [{ productId: targetProd.id, quantity: reapproQty, costPrice: targetProd.costPrice }],
    date: new Date().toISOString()
  }];
  state.suppliers[0].currentBalance += reapproCost;
  state.purchases.push(newPurchases[0]);

  // 3. 2 versements Top-Up clients (épuration de 30 000 DA)
  const newTopUps: any[] = [
    { id: 'TOPUP-01', customerId: 'CUST-01', amount: 15000, source: 'topup', timestamp: new Date().toISOString() },
    { id: 'TOPUP-02', customerId: 'CUST-02', amount: 15000, source: 'topup', timestamp: new Date().toISOString() }
  ];
  state.customers.find(c => c.id === 'CUST-01')!.balance += 15000;
  state.customers.find(c => c.id === 'CUST-02')!.balance += 15000;

  return {
    transactions: newTransactions,
    purchases: newPurchases,
    topUps: newTopUps
  };
}

export function captureFingerprint(state: LocalStoreState): DisasterRecoveryFingerprint {
  const stocksByProduct = new Map<string, number>();
  for (const p of state.products) stocksByProduct.set(p.id, p.stock);

  const customerBalances = new Map<string, number>();
  for (const c of state.customers) customerBalances.set(c.id, c.balance);

  const supplierBalances = new Map<string, number>();
  for (const s of state.suppliers) supplierBalances.set(s.id, s.currentBalance);

  const totalTxVolumeDA = state.transactions.reduce((s, t) => s + t.total, 0);

  return {
    totalTxCount: state.transactions.length,
    totalTxVolumeDA,
    stocksByProduct,
    customerBalances,
    supplierBalances
  };
}

export function wipeLocalDatabase(state: LocalStoreState): void {
  state.products = [];
  state.transactions = [];
  state.customers = [];
  state.suppliers = [];
  state.purchases = [];
  state.expenses = [];
}

export function restoreSnapshotIntoLocalState(snapshot: BackupData, state: LocalStoreState): void {
  state.products = JSON.parse(JSON.stringify(snapshot.products));
  state.transactions = JSON.parse(JSON.stringify(snapshot.transactions));
  state.customers = JSON.parse(JSON.stringify(snapshot.customers));
  state.suppliers = JSON.parse(JSON.stringify(snapshot.suppliers));
  state.purchases = JSON.parse(JSON.stringify(snapshot.purchases));
  state.expenses = JSON.parse(JSON.stringify(snapshot.expenses));
}

export function applyCloudCatchUp(state: LocalStoreState, batch: IncrementalDayBatch): void {
  // 1. Intégration des 15 transactions du jour J
  for (const tx of batch.transactions) {
    if (!state.transactions.some(t => t.id === tx.id)) {
      state.transactions.push(tx);
      for (const it of tx.items) {
        const prod = state.products.find(p => p.id === it.productId);
        if (prod) prod.stock -= it.quantity;
      }
    }
  }

  // 2. Intégration du BL réappro
  for (const pur of batch.purchases) {
    if (!state.purchases.some(p => p.id === pur.id)) {
      state.purchases.push(pur);
      const supp = state.suppliers.find(s => s.id === pur.supplierId);
      if (supp) supp.currentBalance += pur.total;
      for (const it of pur.items) {
        const prod = state.products.find(p => p.id === it.productId);
        if (prod) prod.stock += it.quantity;
      }
    }
  }

  // 3. Intégration des Top-Ups
  for (const tu of batch.topUps) {
    const cust = state.customers.find(c => c.id === tu.customerId);
    if (cust) cust.balance += tu.amount;
  }
}

export function updateDisasterRecoveryReportStep(
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
      /\| \*\*Étape 0 : État Nominal Pré-Sinistre & Snapshot J-1\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Activité du Jour J & Enregistrement Cloud\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Simulation Sinistre \(Destruction Partition Locale\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Restauration à Chaud depuis Snapshot J-1\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Rattrapage Incrémental Intelligent Supabase\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Audit d'Intégrité Post-Désastre & Bilan Zéro Perte\*\* \|.*?\|.*?\|/
    ];

    const stepNames = [
      'Étape 0 : État Nominal Pré-Sinistre & Snapshot J-1',
      'Étape 1 : Activité du Jour J & Enregistrement Cloud',
      'Étape 2 : Simulation Sinistre (Destruction Partition Locale)',
      'Étape 3 : Restauration à Chaud depuis Snapshot J-1',
      'Étape 4 : Rattrapage Incrémental Intelligent Supabase',
      'Étape 5 : Audit d\'Intégrité Post-Désastre & Bilan Zéro Perte'
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
    console.warn('[Simulation] Erreur maj rapport disaster recovery:', e);
  }
}
