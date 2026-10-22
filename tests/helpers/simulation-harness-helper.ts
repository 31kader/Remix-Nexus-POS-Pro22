
import { useCoreStore } from '../../src/store/useCoreStore';
import { useCartStore } from '../../src/store/useCartStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { usePeopleStore } from '../../src/store/usePeopleStore';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { Product, CartItem, OnlineOrder, CompanySettings } from '../../src/types';
import { DEFAULT_SETTINGS } from '../../src/hooks/data-fetching/initialStates';
import { REAL_105_PRODUCTS_CATALOG, REAL_SUPPLIERS, TEST_CUSTOMERS } from './simulation-catalog-data';

export const simulationSettings: CompanySettings = {
  ...DEFAULT_SETTINGS,
  name: 'Nexus POS Store (Stress Harness)',
  currency: 'DA',
  taxRate: 19.00,
  loyaltyPointsPerCurrencyUnit: 0.1,
  loyaltyPointValue: 1.0,
  allowNegativeStock: true
};

/**
 * Initialise et réinitialise de façon étanche tous les stores Zustand avant chaque test.
 */
export function resetSimulationEnvironment() {
  const gVi = (globalThis as any).vi;
  if (gVi && typeof gVi.clearAllMocks === 'function') {
    gVi.clearAllMocks();
  }
  if (typeof localStorage !== 'undefined') localStorage.clear();
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

  useCoreStore.getState().setSettings(simulationSettings);
  useCoreStore.getState().setProducts([...REAL_105_PRODUCTS_CATALOG]);
  useCoreStore.getState().setPromotions([]);
  
  usePeopleStore.getState().setSuppliers([...REAL_SUPPLIERS]);
  usePeopleStore.getState().setCustomers([...TEST_CUSTOMERS]);
  
  useTransactionStore.getState().setTransactions([]);
  useTransactionStore.getState().setOnlineOrders([]);
  
  useFinanceStore.getState().setPurchases([]);
  useFinanceStore.getState().setExpenses([]);

  useCartStore.setState({
    posSessions: [{ id: 'sess-stress-1', name: 'Ticket 1', cart: [], selectedCustomer: null }],
    activeSessionId: 'sess-stress-1',
    isWholesale: false,
    deliveryMethod: 'in_store'
  });
}

/**
 * Générateur de panier de stress avec articles réels et multi-lignes d'un même article.
 */
export function generateStressCart(
  itemCount: number,
  productsPool: Product[] = REAL_105_PRODUCTS_CATALOG,
  multiLineRatio: number = 0.3
): CartItem[] {
  const cart: CartItem[] = [];
  const selectedProds: Product[] = [];

  for (let i = 0; i < itemCount; i++) {
    // Si ratio multi-lignes atteint et au moins 1 produit déjà sélectionné, répéter un produit existant
    if (Math.random() < multiLineRatio && selectedProds.length > 0) {
      const repeated = selectedProds[Math.floor(Math.random() * selectedProds.length)];
      cart.push({
        ...repeated,
        quantity: Math.floor(Math.random() * 3) + 1,
        cartItemId: `cart-line-${i}-${Math.random().toString(36).substring(2, 7)}`
      } as CartItem);
    } else {
      const prod = productsPool[i % productsPool.length];
      selectedProds.push(prod);
      cart.push({
        ...prod,
        quantity: Math.floor(Math.random() * 4) + 1,
        cartItemId: `cart-line-${i}-${Math.random().toString(36).substring(2, 7)}`
      } as CartItem);
    }
  }
  return cart;
}

/**
 * Générateur de commande en ligne e-commerce avec ID numérique (bigint Supabase).
 */
export function generateStressOnlineOrder(
  numericId: number,
  itemsCount: number = 5,
  productsPool: Product[] = REAL_105_PRODUCTS_CATALOG
): OnlineOrder {
  const items = [];
  let total = 0;
  for (let i = 0; i < itemsCount; i++) {
    const prod = productsPool[(numericId + i) % productsPool.length];
    const qty = (i % 3) + 1;
    const price = Number(prod.price);
    items.push({
      lineId: `line-${numericId}-${i}`,
      productId: prod.id,
      name: prod.name,
      quantity: qty,
      price: price
    });
    total += price * qty;
  }

  return {
    id: String(numericId), // Entier séquentiel stringifié convertible en bigint
    externalOrderId: `EXT-${numericId}`,
    customerName: `Client E-Commerce #${numericId}`,
    customerPhone: '0550998877',
    items,
    total: Math.round(total * 100) / 100,
    status: 'pending',
    timestamp: new Date().toISOString(),
    paymentStatus: 'unpaid',
    source: 'online',
    syncedToPos: false
  };
}

/**
 * Scanner d'intégrité récursif anti-NaN, anti-Infinity et anti-undefined.
 */
export function assertNoNaN(obj: any, path: string = 'root'): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    if (isNaN(obj)) throw new Error(`[Assertion Error] NaN détecté au chemin: ${path}`);
    if (!isFinite(obj)) throw new Error(`[Assertion Error] Infinity détecté au chemin: ${path}`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoNaN(item, `${path}[${idx}]`));
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      assertNoNaN(val, `${path}.${key}`);
    }
  }
}

/**
 * Assertion d'équilibre financier comptable en Dinars Algériens (DA).
 * Reçu - Rendu + Dette = Total TTC
 */
export function assertFinancialEquilibrium(
  total: number,
  received: number,
  change: number,
  debt: number = 0
): void {
  const netPaid = received - change;
  const balance = Math.round((netPaid + debt) * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;
  if (Math.abs(balance - roundedTotal) > 0.01) {
    throw new Error(`[Assertion Error] Déséquilibre financier : Reçu (${received}) - Rendu (${change}) + Dette (${debt}) = ${balance} DA vs Total (${roundedTotal}) DA`);
  }
}

/**
 * Assertion de consolidation préalable par productId avant déstockage.
 * Garantit qu'aucun delta n'est écrasé en cas de multi-lignes.
 */
export function assertStockConsolidation(
  enqueuedCalls: [string, number][],
  cart: CartItem[]
): void {
  const expectedMap = new Map<string, number>();
  for (const item of cart) {
    if (item.isBundle && item.bundleItems) {
      for (const bi of item.bundleItems) {
        expectedMap.set(bi.productId, (expectedMap.get(bi.productId) || 0) + item.quantity * bi.quantity);
      }
    } else {
      expectedMap.set(item.id, (expectedMap.get(item.id) || 0) + item.quantity);
    }
  }

  const seenProducts = new Set<string>();
  for (const [productId, qty] of enqueuedCalls) {
    if (seenProducts.has(productId)) {
      throw new Error(`[Assertion Error] Violation de consolidation : productId ${productId} déstocké plusieurs fois sans consolidation préalable !`);
    }
    seenProducts.add(productId);
    const expectedQty = expectedMap.get(productId) || 0;
    if (Math.abs(Math.abs(qty) - expectedQty) > 0.001) {
      throw new Error(`[Assertion Error] Quantité déstockée discordante pour ${productId} : déstocké ${qty} vs attendu ${expectedQty}`);
    }
  }
}
