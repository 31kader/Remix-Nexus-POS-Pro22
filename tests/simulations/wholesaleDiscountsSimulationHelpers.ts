import fs from 'fs';
import { RealProductFixture } from './extremeLoadSimulationHelpers';

export interface SimulatedB2BCustomer {
  id: string;
  name: string;
  company: string;
  creditLimit: number;
  initialBalance: number;
  currentBalance: number;
  totalCreditPurchasesTTC: number;
  totalTopUpPaidTTC: number;
  isWholesale: boolean;
}

export interface WholesaleProductFixture {
  id: string;
  name: string;
  retailPrice: number;
  wholesalePrice: number;
  quantityDiscounts: { minQuantity: number; discountPrice: number }[];
  costPrice: number;
  stock: number;
}

export interface SimulatedSaleLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCharged: number;
  discountApplied: 'retail_standard' | 'wholesale_tariff' | 'volume_tier1' | 'volume_tier2';
  totalTTC: number;
}

export interface SimulatedB2BTransaction {
  id: string;
  customerId?: string;
  customerName?: string;
  items: SimulatedSaleLine[];
  subtotal: number;
  total: number;
  isWholesale: boolean;
  paymentMethod: 'cash' | 'card' | 'balance';
  isCreditSale: boolean;
  timestamp: string;
  source?: string;
}

export interface SimulatedTopUpPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: 'cash' | 'transfer' | 'check';
  date: string;
  note: string;
  source: 'topup';
}

export function initB2BCustomers(): SimulatedB2BCustomer[] {
  return [
    { id: 'CUST-B2B-01', name: 'Mourad Benali', company: 'Supérette El-Baraka', creditLimit: 250000, initialBalance: -45000, currentBalance: -45000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-02', name: 'Karim Ould-Kaci', company: 'Restaurant Le Cèdre', creditLimit: 300000, initialBalance: -80000, currentBalance: -80000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-03', name: 'Amine Meziane', company: 'Pâtisserie Viennoise', creditLimit: 150000, initialBalance: -25000, currentBalance: -25000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-04', name: 'Farid Saidi', company: 'Cafétéria de la Gare', creditLimit: 100000, initialBalance: -30000, currentBalance: -30000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: false },
    { id: 'CUST-B2B-05', name: 'Yacine Belkacem', company: 'Épicerie Centrale Hydra', creditLimit: 500000, initialBalance: -120000, currentBalance: -120000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-06', name: 'Sofiane Hamidi', company: 'Alimentation Générale El-Biar', creditLimit: 200000, initialBalance: -60000, currentBalance: -60000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-07', name: 'Nadir Brahimi', company: 'Pizzeria Bella Napoli', creditLimit: 180000, initialBalance: -40000, currentBalance: -40000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: false },
    { id: 'CUST-B2B-08', name: 'Reda Cherif', company: 'Fast-Food Le Sultan', creditLimit: 220000, initialBalance: -55000, currentBalance: -55000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-09', name: 'Tarek Mansouri', company: 'Boulangerie Les Oliviers', creditLimit: 350000, initialBalance: -90000, currentBalance: -90000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: true },
    { id: 'CUST-B2B-10', name: 'Walid Benaissa', company: 'Snack Bar Le Palmier', creditLimit: 120000, initialBalance: -20000, currentBalance: -20000, totalCreditPurchasesTTC: 0, totalTopUpPaidTTC: 0, isWholesale: false }
  ];
}

export function initWholesaleProducts(realProducts: RealProductFixture[]): WholesaleProductFixture[] {
  return realProducts.slice(0, 50).map((p, idx) => {
    const retailPrice = parseFloat(p.price) || 300;
    const costPrice = parseFloat(p.cost_price) || (retailPrice * 0.75);
    const wholesalePrice = Math.round(retailPrice * 0.85); // 15% de remise en gros standard
    const tier1Price = Math.round(retailPrice * 0.92);     // 8% de remise dès 10 unités
    const tier2Price = Math.round(retailPrice * 0.84);     // 16% de remise dès 25 unités

    return {
      id: p.id,
      name: p.name,
      retailPrice,
      wholesalePrice,
      quantityDiscounts: [
        { minQuantity: 10, discountPrice: tier1Price },
        { minQuantity: 25, discountPrice: tier2Price }
      ],
      costPrice,
      stock: parseFloat(p.stock) || 100
    };
  });
}

export function evaluateItemPrice(
  product: WholesaleProductFixture,
  quantity: number,
  isWholesale: boolean
): { unitPrice: number; discountType: SimulatedSaleLine['discountApplied'] } {
  // Respect scrupuleux de l'ordre d'évaluation de calculateItemPrice dans src/lib/utils.ts :
  // 1. Remise par quantité prioritaire si le palier de volume est atteint
  if (product.quantityDiscounts && product.quantityDiscounts.length > 0) {
    const sorted = [...product.quantityDiscounts].sort((a, b) => b.minQuantity - a.minQuantity);
    const matched = sorted.find(d => quantity >= d.minQuantity);
    if (matched) {
      const discountType = matched.minQuantity >= 25 ? 'volume_tier2' : 'volume_tier1';
      return { unitPrice: matched.discountPrice, discountType };
    }
  }

  // 2. Si vente en gros, tarif wholesalePrice
  if (isWholesale && product.wholesalePrice !== undefined) {
    return { unitPrice: product.wholesalePrice, discountType: 'wholesale_tariff' };
  }

  // 3. Tarif détail standard
  return { unitPrice: product.retailPrice, discountType: 'retail_standard' };
}

export function verifyCreditLimit(
  customer: SimulatedB2BCustomer,
  requestedAmountTTC: number
): { allowed: boolean; currentDebt: number; remainingCredit: number; overshoot?: number } {
  const currentDebt = Math.abs(Math.min(0, customer.currentBalance));
  const remainingCredit = Math.max(0, customer.creditLimit - currentDebt);

  if (currentDebt + requestedAmountTTC > customer.creditLimit) {
    return {
      allowed: false,
      currentDebt,
      remainingCredit,
      overshoot: Math.round((currentDebt + requestedAmountTTC - customer.creditLimit) * 100) / 100
    };
  }

  return { allowed: true, currentDebt, remainingCredit };
}

export function executeSimulatedTopUp(
  customer: SimulatedB2BCustomer,
  amount: number,
  method: 'cash' | 'transfer' | 'check',
  note: string
): SimulatedTopUpPayment {
  customer.currentBalance += amount;
  customer.totalTopUpPaidTTC += amount;

  return {
    id: `TOPUP-${customer.id}-${Date.now().toString().slice(-4)}`,
    customerId: customer.id,
    customerName: customer.name,
    amount,
    method,
    date: new Date().toISOString(),
    note: `[REGLEMENT] Versement de ${amount.toFixed(2)} DA (${method.toUpperCase()}) - ${note}`,
    source: 'topup'
  };
}

export function updateWholesaleReportStep(
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
      /\| \*\*Étape 0 : Cadrage, Référentiel Clients B2B & Tarifs\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 1 : Ventes Mixtes \(Détail B2C vs Gros B2B\)\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 2 : Déclenchement Automatique des Barèmes par Palier\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 3 : Contrôle Strict d'Encours & Ventes à Crédit\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 4 : Règlements Différés \(Top-Up\) & Isolation CA\*\* \|.*?\|.*?\|/,
      /\| \*\*Étape 5 : Clôture Grand Livre Clients & Rapprochement Exact\*\* \|.*?\|.*?\|/
    ];

    const stepNames = [
      'Étape 0 : Cadrage, Référentiel Clients B2B & Tarifs',
      'Étape 1 : Ventes Mixtes (Détail B2C vs Gros B2B)',
      'Étape 2 : Déclenchement Automatique des Barèmes par Palier',
      'Étape 3 : Contrôle Strict d\'Encours & Ventes à Crédit',
      'Étape 4 : Règlements Différés (Top-Up) & Isolation CA',
      'Étape 5 : Clôture Grand Livre Clients & Rapprochement Exact'
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
    console.warn('[Simulation] Erreur maj rapport gros/detail:', e);
  }
}
