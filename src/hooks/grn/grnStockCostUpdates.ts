import { Product, GRNItem, normalizeBatches } from '../../types';
import { enqueueStockAdjustment, enqueueSync } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { useCoreStore } from '../../store/useCoreStore';

export function applyGrnStockAndCostUpdates(
  grnItems: GRNItem[],
  products: Product[],
  suppliers: any[],
  nowIso: string,
  targetSupplierId?: string,
  grnGlobalDiscount: number = 0,
  grnGlobalVat: number = 0
) {
  // 🛡️ Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
  const groupedByProduct = new Map<string, GRNItem[]>();
  for (const item of (grnItems || [])) {
    if (!item.productId || item.productId === 'undefined') continue;
    const list = groupedByProduct.get(item.productId) || [];
    list.push(item);
    groupedByProduct.set(item.productId, list);
  }

  const globalFactor = (1 - (Number(grnGlobalDiscount) || 0) / 100) * (1 + (Number(grnGlobalVat) || 0) / 100);
  let totalGrnAmount = 0;

  for (const [productId, lines] of groupedByProduct.entries()) {
    const p = products.find(prod => prod.id === productId);
    if (!p) continue;

    const totalAddedQty = lines.reduce((sum, l) => sum + Math.max(0, Number(l.quantity) || 0), 0);
    if (totalAddedQty <= 0) continue;

    enqueueStockAdjustment(productId, totalAddedQty);

    // Calcul du PMP (Prix Moyen Pondéré) intégrant remises et TVA de la ligne et du bon
    const currentStock = Math.max(0, p.stock || 0);
    const currentCost = Math.max(0, p.costPrice || 0);
    const addedValue = lines.reduce((sum, l) => {
      const qty = Math.max(0, Number(l.quantity) || 0);
      const rawUnitCost = Math.max(0, Number(l.newCostPrice) || 0);
      const lineFactor = (1 - (Number(l.discount) || 0) / 100) * (1 + (Number(l.vatRate) || 0) / 100);
      const effectiveUnitCost = rawUnitCost * lineFactor * globalFactor;
      return sum + qty * effectiveUnitCost;
    }, 0);
    totalGrnAmount += addedValue;

    const lastLine = lines[lines.length - 1];
    const fallbackCost = lastLine
      ? Math.max(0, Number(lastLine.newCostPrice) || 0) * (1 - (Number(lastLine.discount) || 0) / 100) * (1 + (Number(lastLine.vatRate) || 0) / 100) * globalFactor
      : currentCost;

    let pmpCost = totalAddedQty > 0 && addedValue > 0 ? Number((addedValue / totalAddedQty).toFixed(2)) : Number(fallbackCost.toFixed(2));
    if (currentStock > 0 && currentCost > 0 && totalAddedQty > 0 && addedValue > 0) {
      const totalValue = (currentStock * currentCost) + addedValue;
      const totalQty = currentStock + totalAddedQty;
      pmpCost = totalQty > 0 ? Number((totalValue / totalQty).toFixed(2)) : pmpCost;
    }

    const nextStock = (Number(p.stock) || 0) + totalAddedQty;
    const prodUpdates: any = {
      stock: nextStock,
      costPrice: pmpCost,
      updatedAt: nowIso
    };

    if (p.useMultiExpiry || lines.some(l => !!l.expirationDate)) {
      let updatedBatches = normalizeBatches(p.batches).map(b => ({ ...b }));
      let useMultiExpiry = p.useMultiExpiry || false;

      if (!useMultiExpiry) {
        const existingBatches = [];
        if ((p.stock || 0) > 0) {
          existingBatches.push({
            id: Math.random().toString(36).substring(2, 9),
            batchNumber: p.batchNumber || 'LOT-INI',
            expirationDate: p.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            stock: p.stock || 0
          });
        }
        updatedBatches = existingBatches;
        useMultiExpiry = true;
      }

      const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      for (const item of lines) {
        const itemQty = Math.max(0, Number(item.quantity) || 0);
        if (itemQty <= 0) continue;
        updatedBatches.push({
          id: Math.random().toString(36).substring(2, 9),
          batchNumber: item.batchNumber || 'LOT-' + nowIso.split('T')[0].replace(/-/g, ''),
          expirationDate: item.expirationDate || defaultExpiry,
          stock: itemQty
        });
      }

      const sorted = [...updatedBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      prodUpdates.batches = updatedBatches;
      prodUpdates.useMultiExpiry = true;
      if (sorted.length > 0) {
        prodUpdates.expirationDate = sorted[0].expirationDate;
        prodUpdates.batchNumber = sorted[0].batchNumber;
      }
    }

    if (p.isBundle && p.bundleItems && p.bundleItems.length > 0) {
      for (const bItem of p.bundleItems) {
        const compId = bItem.productId || (bItem as any).id;
        const comp = products.find(prod => prod.id === compId);
        if (comp) {
          const compAddedQty = totalAddedQty * Math.max(1, Number(bItem.quantity) || 1);
          const nextCompStock = (Number(comp.stock) || 0) + compAddedQty;
          enqueueStockAdjustment(comp.id, compAddedQty);
          localDb.updateLocalOnly(`products/${comp.id}`, { ...comp, stock: nextCompStock, updatedAt: nowIso });
          useCoreStore.setState(state => ({
            products: (state.products || []).map(prod => prod.id === comp.id ? { ...prod, stock: nextCompStock, updatedAt: nowIso } : prod)
          }));
        }
      }
    }

    localDb.updateLocalOnly(`products/${productId}`, { ...p, ...prodUpdates });
    const { stock: _ignoredStock, ...nonStockUpdates } = prodUpdates;
    enqueueSync('products', productId, 'UPSERT', { id: productId, ...nonStockUpdates });
    useCoreStore.setState(state => ({
      products: (state.products || []).map(prod => prod.id === productId ? { ...prod, ...prodUpdates } : prod)
    }));
  }

  // 🛡️ P1-BIZ-9 : Mise à jour de la dette du fournisseur lors de la validation du GRN
  if (targetSupplierId && totalGrnAmount > 0) {
    import('../../store/usePeopleStore').then(({ usePeopleStore }) => {
      const peopleState = usePeopleStore.getState();
      const sup = (peopleState.suppliers || suppliers || []).find((s: any) => s && s.id === targetSupplierId);
      if (sup) {
        const debtToAdd = Number(totalGrnAmount.toFixed(2));
        const updatedSupplier = {
          ...sup,
          balance: (Number(sup.balance) || 0) + debtToAdd,
          updatedAt: nowIso
        };
        // localDb.update prend strictement 2 arguments: (path, value)
        localDb.update(`suppliers/${sup.id}`, updatedSupplier).catch(() => {});
        peopleState.setSuppliers(prev => (prev || []).map((s: any) => s.id === sup.id ? updatedSupplier : s));
      }
    }).catch(() => {});
  }
}
