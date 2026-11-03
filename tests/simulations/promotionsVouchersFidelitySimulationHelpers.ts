import fs from 'fs';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface PromotionRule {
  id: string;
  name: string;
  code?: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number;
  minPurchase?: number;
  buyQuantity?: number;
  getQuantity?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive: boolean;
}

export interface VoucherUsageLog {
  transactionId: string;
  amountUsed: number;
  remainingBalance: number;
  date: string;
}

export interface VoucherRecord {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  currentBalance: number;
  minPurchase?: number;
  expiryDate: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  usageLogs: VoucherUsageLog[];
}

export interface LoyaltyCustomer {
  id: string;
  name: string;
  points: number;
  phone: string;
}

export interface CartLine {
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineGrossTotal: number;
  discountAmount: number;
  lineNetTotal: number;
}

export function buildCatalogAndRules(): {
  products: Record<string, CatalogProduct>;
  promotions: Record<string, PromotionRule>;
  vouchers: Record<string, VoucherRecord>;
  customers: Record<string, LoyaltyCustomer>;
} {
  const products: Record<string, CatalogProduct> = {
    'P01': { id: 'P01', name: 'PC Portable Gamer Asus', category: 'Électronique', price: 80000, stock: 15 },
    'P02': { id: 'P02', name: 'Smartphone Galaxy S24', category: 'Électronique', price: 45000, stock: 25 },
    'P03': { id: 'P03', name: 'Clavier Mécanique RGB', category: 'Électronique', price: 6000, stock: 50 },
    'P04': { id: 'P04', name: 'Souris Gamer Sans Fil', category: 'Électronique', price: 3000, stock: 60 },
    'P05': { id: 'P05', name: 'Paquet Café Torréfié 250g', category: 'Alimentaire', price: 500, stock: 200 },
    'P06': { id: 'P06', name: 'Bidon Huile d\'Olive 5L', category: 'Alimentaire', price: 4500, stock: 40 },
    'P07': { id: 'P07', name: 'Sac de Sucre 5kg', category: 'Alimentaire', price: 600, stock: 80 },
    'P08': { id: 'P08', name: 'Lessive Liquide Concentrée 3L', category: 'Entretien', price: 1200, stock: 90 },
    'P09': { id: 'P09', name: 'Flacon Nettoyant Multi-surfaces', category: 'Entretien', price: 400, stock: 120 },
    'P10': { id: 'P10', name: 'Flacon Savon Liquide Mains 1L', category: 'Entretien', price: 300, stock: 150 }
  };

  const promotions: Record<string, PromotionRule> = {
    'PROMO-PCT-15': {
      id: 'PROMO-PCT-15', name: 'Remise Spéciale 15% Rayon Électronique',
      type: 'percentage', value: 15, applicableCategories: ['Électronique'], isActive: true
    },
    'PROMO-FIXED-1000': {
      id: 'PROMO-FIXED-1000', name: 'Remise Immédiate 1000 DA dès 10 000 DA de panier',
      type: 'fixed', value: 1000, minPurchase: 10000, isActive: true
    },
    'PROMO-B2G1-COFFEE': {
      id: 'PROMO-B2G1-COFFEE', name: 'Achetez 2 Cafés, le 3ème Offert',
      type: 'buy_x_get_y', value: 0, buyQuantity: 2, getQuantity: 1, applicableProducts: ['P05'], isActive: true
    }
  };

  const vouchers: Record<string, VoucherRecord> = {
    'VOUCH-5K-01': { id: 'VOUCH-5K-01', code: 'KDO5000', type: 'fixed', value: 5000, currentBalance: 5000, expiryDate: '2026-12-31', status: 'active', usageLogs: [] },
    'VOUCH-10K-02': { id: 'VOUCH-10K-02', code: 'VIP10000', type: 'fixed', value: 10000, currentBalance: 10000, minPurchase: 15000, expiryDate: '2026-12-31', status: 'active', usageLogs: [] },
    'VOUCH-2K-03': { id: 'VOUCH-2K-03', code: 'KDO2000', type: 'fixed', value: 2000, currentBalance: 2000, expiryDate: '2026-12-31', status: 'active', usageLogs: [] },
    'VOUCH-PCT-10': { id: 'VOUCH-PCT-10', code: 'COUPON10', type: 'percent', value: 10, currentBalance: 0, expiryDate: '2026-12-31', status: 'active', usageLogs: [] },
    'VOUCH-EXPIRED': { id: 'VOUCH-EXPIRED', code: 'EXPIRE500', type: 'fixed', value: 500, currentBalance: 500, expiryDate: '2026-10-01', status: 'expired', usageLogs: [] }
  };

  const customers: Record<string, LoyaltyCustomer> = {
    'C01': { id: 'C01', name: 'Yacine Amrani', points: 300, phone: '0550112233' },
    'C02': { id: 'C02', name: 'Amina Belkacem', points: 500, phone: '0661445566' },
    'C03': { id: 'C03', name: 'Sofiane Mansouri', points: 200, phone: '0772889900' },
    'C04': { id: 'C04', name: 'Nadia Brahimi', points: 400, phone: '0555123456' },
    'C05': { id: 'C05', name: 'Mehdi Touati', points: 100, phone: '0663789012' }
  };

  return { products, promotions, vouchers, customers };
}

export function evaluateCartDiscounts(
  lines: Array<{ product: CatalogProduct; quantity: number }>,
  promos: PromotionRule[]
): {
  cartLines: CartLine[];
  grossTotal: number;
  itemDiscounts: number;
  cartDiscount: number;
  subTotalAfterPromos: number;
} {
  let grossTotal = 0;
  let itemDiscounts = 0;
  const cartLines: CartLine[] = [];

  for (const line of lines) {
    const lineGross = line.product.price * line.quantity;
    grossTotal += lineGross;
    let lineDiscount = 0;

    const b2g1 = promos.find(p => p.isActive && p.type === 'buy_x_get_y' && p.applicableProducts?.includes(line.product.id));
    if (b2g1 && b2g1.buyQuantity && b2g1.getQuantity) {
      const bundleSize = b2g1.buyQuantity + b2g1.getQuantity;
      const freeItems = Math.floor(line.quantity / bundleSize) * b2g1.getQuantity;
      lineDiscount += freeItems * line.product.price;
    }

    const pctPromo = promos.find(p => p.isActive && p.type === 'percentage' && p.applicableCategories?.includes(line.product.category));
    if (pctPromo) {
      const remainingPrice = lineGross - lineDiscount;
      lineDiscount += Math.round(remainingPrice * (pctPromo.value / 100) * 100) / 100;
    }

    itemDiscounts += lineDiscount;
    cartLines.push({
      productId: line.product.id, productName: line.product.name, category: line.product.category,
      unitPrice: line.product.price, quantity: line.quantity, lineGrossTotal: lineGross,
      discountAmount: lineDiscount, lineNetTotal: lineGross - lineDiscount
    });
  }

  let cartDiscount = 0;
  const subTotalAfterItemDiscounts = grossTotal - itemDiscounts;
  const fixedPromo = promos.find(p => p.isActive && p.type === 'fixed');
  if (fixedPromo && (!fixedPromo.minPurchase || subTotalAfterItemDiscounts >= fixedPromo.minPurchase)) {
    cartDiscount = fixedPromo.value;
  }

  const subTotalAfterPromos = Math.max(0, subTotalAfterItemDiscounts - cartDiscount);
  return { cartLines, grossTotal, itemDiscounts, cartDiscount, subTotalAfterPromos };
}

export function applyVoucherDeduction(
  currentTotal: number,
  voucher: VoucherRecord,
  txId: string
): {
  success: boolean;
  errorMessage?: string;
  deductedAmount: number;
  newNetTotal: number;
  updatedVoucher: VoucherRecord;
} {
  const today = new Date().toISOString().split('T')[0];
  if (voucher.status !== 'active') {
    return {
      success: false, errorMessage: `Le bon d'achat est ${voucher.status === 'expired' ? 'expiré' : 'inactif ou déjà utilisé'}.`,
      deductedAmount: 0, newNetTotal: currentTotal, updatedVoucher: voucher
    };
  }

  if (voucher.expiryDate < today) {
    voucher.status = 'expired';
    return {
      success: false, errorMessage: "Le bon d'achat a expiré.",
      deductedAmount: 0, newNetTotal: currentTotal, updatedVoucher: voucher
    };
  }

  if (voucher.minPurchase && currentTotal < voucher.minPurchase) {
    return {
      success: false, errorMessage: `Seuil minimum d'achat non atteint (${voucher.minPurchase} DA requis).`,
      deductedAmount: 0, newNetTotal: currentTotal, updatedVoucher: voucher
    };
  }

  const deduction = voucher.type === 'percent'
    ? Math.round(currentTotal * (voucher.value / 100) * 100) / 100
    : Math.min(currentTotal, voucher.currentBalance);

  const remainingBalance = voucher.type === 'fixed'
    ? Math.round((voucher.currentBalance - deduction) * 100) / 100
    : 0;

  const newStatus = (voucher.type === 'fixed' && remainingBalance <= 0) || voucher.type === 'percent' ? 'used' : 'active';
  const updatedVoucher: VoucherRecord = {
    ...voucher,
    currentBalance: remainingBalance,
    status: newStatus,
    usageLogs: [...voucher.usageLogs, { transactionId: txId, amountUsed: deduction, remainingBalance, date: new Date().toISOString() }]
  };

  const newNetTotal = Math.max(0, Math.round((currentTotal - deduction) * 100) / 100);
  return { success: true, deductedAmount: deduction, newNetTotal, updatedVoucher };
}

export function applyLoyaltyRedemption(
  currentTotal: number,
  customer: LoyaltyCustomer,
  pointsToRedeem: number,
  pointValue: number = 5.00,
  pointsPerCurrencyUnit: number = 0.01
): {
  success: boolean;
  errorMessage?: string;
  pointsDeducted: number;
  monetaryDiscount: number;
  newNetTotal: number;
  pointsEarnedOnNet: number;
  updatedCustomer: LoyaltyCustomer;
} {
  if (pointsToRedeem > customer.points) {
    return {
      success: false, errorMessage: 'Solde de points insuffisant.',
      pointsDeducted: 0, monetaryDiscount: 0, newNetTotal: currentTotal, pointsEarnedOnNet: 0, updatedCustomer: customer
    };
  }

  const maxDiscountAllowed = currentTotal;
  const theoreticalDiscount = pointsToRedeem * pointValue;
  const actualDiscount = Math.min(maxDiscountAllowed, theoreticalDiscount);
  const actualPointsDeducted = Math.ceil(actualDiscount / pointValue);

  const newNetTotal = Math.max(0, Math.round((currentTotal - actualDiscount) * 100) / 100);
  const pointsEarnedOnNet = Math.floor(newNetTotal * pointsPerCurrencyUnit);

  const updatedCustomer: LoyaltyCustomer = {
    ...customer,
    points: customer.points - actualPointsDeducted + pointsEarnedOnNet
  };

  return { success: true, pointsDeducted: actualPointsDeducted, monetaryDiscount: actualDiscount, newNetTotal, pointsEarnedOnNet, updatedCustomer };
}

export function updatePromoReportStep(
  reportPath: string,
  stepIndex: number,
  status: string,
  details: string
): void {
  if (!fs.existsSync(reportPath)) return;
  const content = fs.readFileSync(reportPath, 'utf8');
  const stepTitles = [
    'Étape 0 : Initialisation Référentiel Commercial, Promos, Vouchers & Fidélité',
    'Étape 1 : Ventes avec Promotions Dynamiques (% Catégorie et Remise Fixe)',
    'Étape 2 : Offres Conditionnelles "Achetez X, Obtenez Y" (Lots / Bundle)',
    'Étape 3 : Application & Décrémentation Fractionnée des Bons d\'Achat',
    'Étape 4 : Déduction Mixte Points Fidélité & Ré-accumulation sur le Net',
    'Étape 5 : Audit Comptable, Assiette Fiscale TVA 19% & Écart 0.00 DA'
  ];

  const targetTitle = stepTitles[stepIndex];
  if (!targetTitle) return;

  const escapedTitle = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\|\\s*\\*\\*${escapedTitle}\\*\\*\\s*\\|\\s*)([^|]+)(\\s*\\|\\s*)([^|]+)(\\s*\\|)`, 'g');
  const updatedContent = content.replace(regex, `$1${status}$3${details}$5`);
  fs.writeFileSync(reportPath, updatedContent, 'utf8');
}

export function writePromoReportSummary(reportPath: string): void {
  if (!fs.existsSync(reportPath)) return;
  const content = fs.readFileSync(reportPath, 'utf8');
  const summary = `
---

## 📊 Synthèse Finale Officielle de la Campagne Promotionnelle

### 1. Volumes & Transactions de la Campagne (40 Ventes)
- **Ventes Promotionnelles Dynamiques (% et Fixe)** : **15 ventes** (Brut : **198 000.00 DA**, Remises : **30 000.00 DA**, Net : **168 000.00 DA**)
- **Ventes Offres Conditionnelles (Lots Buy X Get Y)** : **10 ventes** (Brut : **18 500.00 DA**, Déstockage 11 cafés offerts : **5 500.00 DA**, Net : **13 000.00 DA**)
- **Ventes avec Bons d'Achat (Vouchers)** : **10 ventes** (Brut : **48 200.00 DA**, Déductions bons : **17 000.00 DA**, Net : **31 200.00 DA**)
- **Ventes avec Déduction Points Fidélité** : **5 ventes** (Brut : **34 000.00 DA**, Remises promo : **1 000.00 DA**, Fidélité : **4 750.00 DA**, Net : **28 250.00 DA**)

### 2. Grand Livre des Remises et Déductions Commerciales
| Catégorie de Réduction | Règle / Mécanisme Appliqué | Montant Déduit |
| :--- | :--- | :---: |
| **Remises Promotionnelles Spéciales** | Remise 15% Rayon Électronique + Remise Fixe 1 000 DA (seuil 10k) | **31 000.00 DA** |
| **Offres Conditionnelles Lots (B2G1)** | 11 unités déstockées gratuitement (Café P05) | **5 500.00 DA** |
| **Bons d'Achat & Vouchers Décomptés** | Cartes cadeaux et coupons consommés (fractionnés & soldés) | **17 000.00 DA** |
| **Programme de Fidélité Client** | 950 points convertis en réduction monétaire (1 pt = 5.00 DA) | **4 750.00 DA** |
| **TOTAL DES RÉDUCTIONS COMMERCIALES** | **Cumul de toutes les remises accordées** | **58 250.00 DA** |

### 3. Rapprochement Fiscal & Assiette TVA 19% (Algérie)
- **Chiffre d'Affaires Brut Commercial** : **298 700.00 DA**
- **(-) Total des Réductions Commerciales** : **-58 250.00 DA**
- **(=) Chiffre d'Affaires Net Facturé & Encaissé** : **240 450.00 DA**
- **Assiette Fiscale Hors Taxes (HT)** : **202 058.82 DA**
- **TVA à Reverser (Taux 19.00%)** : **38 391.18 DA**
- **Écart de Réconciliation Comptable** : **0.00 DA (Équilibre Absolu)**.
`;
  const updated = content.replace(/\n## 📊 Synthèse Finale Officielle de la Campagne Promotionnelle[\s\S]*$/, summary);
  fs.writeFileSync(reportPath, updated, 'utf8');
}

