import { InventoryAudit as InventoryAuditType, Product } from '../../../types';
import { localDb } from '../../../services/LocalDatabase';
import { enqueueStockAdjustment } from '../../../services/SyncService';
import { useCoreStore } from '../../../store/useCoreStore';
import { generateUniqueId } from '../../../lib/utils';

interface ConfirmAuditParams {
  activeAudit: InventoryAuditType;
  auditItems: any[];
  products: Product[];
  user: any;
}

export async function executeConfirmAudit({
  activeAudit,
  auditItems,
  products,
  user,
}: ConfirmAuditParams): Promise<void> {
  const totalDiscrepancyValue = auditItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + item.discrepancy * (product?.costPrice || item.costPrice || 0);
  }, 0);

  const completedAudit = {
    ...activeAudit,
    status: 'completed' as const,
    endDate: new Date().toISOString(),
    items: auditItems,
    totalDiscrepancyValue
  };

  await localDb.update(`audits/${activeAudit.id}`, {
    status: 'completed',
    endDate: completedAudit.endDate,
    items: auditItems,
    totalDiscrepancyValue
  });

  const { useInventoryStore } = await import('../../../store/useInventoryStore');
  useInventoryStore.getState().setAudits(prev =>
    (prev || []).map(a => a.id === activeAudit.id ? completedAudit : a)
  );

  // 🛡️ Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
  const consolidatedAuditItems = new Map<string, {
    productId: string;
    productName: string;
    expectedStock: number;
    actualStock: number;
    discrepancy: number;
    notes: string;
  }>();

  for (const item of auditItems) {
    if (item.discrepancy !== 0 && item.productId) {
      const existing = consolidatedAuditItems.get(item.productId);
      if (existing) {
        existing.discrepancy += item.discrepancy;
        existing.actualStock = existing.expectedStock + existing.discrepancy;
        if (item.notes && !existing.notes.includes(item.notes)) {
          existing.notes = [existing.notes, item.notes].filter(Boolean).join(' | ');
        }
      } else {
        consolidatedAuditItems.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          expectedStock: item.expectedStock,
          actualStock: item.actualStock,
          discrepancy: item.discrepancy,
          notes: item.notes || ''
        });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const createdAdjustments: any[] = [];
  for (const item of consolidatedAuditItems.values()) {
    await localDb.updateLocalOnly(`products/${item.productId}`, {
      stock: item.actualStock,
      updatedAt: nowIso
    });

    useCoreStore.setState(state => ({
      products: (state.products || []).map(p =>
        p.id === item.productId ? { ...p, stock: item.actualStock, updatedAt: nowIso } : p
      )
    }));

    const isLossRecord = item.discrepancy < 0;
    const adjData = {
      id: generateUniqueId(),
      productId: item.productId,
      productName: item.productName,
      oldQuantity: item.expectedStock,
      newQuantity: item.actualStock,
      adjustment: item.discrepancy,
      quantity: item.discrepancy,
      type: item.discrepancy > 0 ? 'found' : 'damage',
      reason: item.notes || "Audit d'inventaire physique",
      date: nowIso,
      timestamp: nowIso,
      userId: user?.uid || 'admin',
      userName: user?.displayName || user?.name || 'Admin',
      isLoss: isLossRecord
    };
    createdAdjustments.push(adjData);
    await localDb.insertLocalOnly(`stock_adjustments/${adjData.id}`, adjData);
    enqueueStockAdjustment(item.productId, item.discrepancy, {
      mode: 'delta',
      adjustmentId: adjData.id,
      reason: adjData.reason,
      userId: adjData.userId,
      userName: adjData.userName,
      isLoss: isLossRecord
    });
  }

  if (createdAdjustments.length > 0) {
    useInventoryStore.getState().setStockAdjustments(prev => [...createdAdjustments, ...(prev || [])]);
  }
}
