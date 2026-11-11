import { localDb } from '../LocalDatabase';
import { getArchivedTransactionsFromStorage } from '../../lib/local-db';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { get as idbGet } from 'idb-keyval';
import { BackupData } from './backupRestoreProcessor';
import { APP_CONFIG } from '../../config/appConfig';

/**
 * 📦 Récupère l'intégralité des données en cache local et stores pour archivage
 */
export async function collectCurrentBackupData(): Promise<BackupData> {
  const coreStore = useCoreStore.getState();
  const transStore = useTransactionStore.getState();
  const peopleStore = usePeopleStore.getState();
  const invStore = useInventoryStore.getState();
  const finStore = useFinanceStore.getState();

  const idbProducts = (await idbGet<any[]>('nexus_products_cache')) || coreStore.products;
  const idbCategories = (await idbGet<any[]>('nexus_categories')) || coreStore.categories;
  const idbReturns = (await idbGet<any[]>('nexus_returns_cache')) || transStore.returns || [];
  const idbSupplierPayments = (await idbGet<any[]>('nexus_supplier_payments_cache')) || finStore.supplierPayments || [];
  const idbDamagedItems = (await idbGet<any[]>('nexus_damaged_items_cache')) || invStore.damagedItems || [];
  const idbAuditLogs = (await idbGet<any[]>('nexus_audit_logs_cache')) || [];
  const idbPromotions = (await idbGet<any[]>('nexus_promotions')) || coreStore.promotions || [];
  const idbVouchersSnap = await localDb.get('vouchers').catch(() => ({ val: () => null }));
  const idbGrnSnap = await localDb.get('goods_receipt_notes').catch(() => ({ val: () => null }));
  const idbShortageSnap = await localDb.get('shortage_items').catch(() => ({ val: () => null }));
  const idbReplenishSnap = await localDb.get('custom_replenishment_lists').catch(() => ({ val: () => null }));
  const archivedTxs = await getArchivedTransactionsFromStorage().catch(() => []);

  const txMap = new Map<string, any>();
  if (Array.isArray(archivedTxs)) {
    archivedTxs.forEach(t => { if (t && t.id) txMap.set(t.id, t); });
  }
  (transStore.transactions || []).forEach(t => { if (t && t.id) txMap.set(t.id, t); });

  return {
    version: APP_CONFIG.version || '1.2.81',
    createdAt: new Date().toISOString(),
    appName: 'Nexus POS Pro',
    settings: coreStore.settings,
    products: idbProducts || [],
    categories: idbCategories || [],
    brands: coreStore.brands || [],
    customers: peopleStore.customers || [],
    suppliers: peopleStore.suppliers || [],
    employees: peopleStore.employees || [],
    transactions: Array.from(txMap.values()),
    expenses: finStore.expenses || [],
    stockAdjustments: invStore.stockAdjustments || [],
    purchases: finStore.purchases || [],
    returns: idbReturns,
    supplierPayments: idbSupplierPayments,
    damagedItems: idbDamagedItems,
    auditLogs: idbAuditLogs,
    promotions: idbPromotions,
    vouchers: Object.values(idbVouchersSnap.val() || {}),
    purchaseOrders: transStore.purchaseOrders || [],
    onlineOrders: transStore.onlineOrders || [],
    goodsReceiptNotes: Object.values(idbGrnSnap.val() || {}),
    shifts: transStore.shifts || [],
    audits: invStore.audits || [],
    attendance: invStore.attendance || [],
    advances: finStore.advances || [],
    shortageItems: Object.values(idbShortageSnap.val() || {}),
    customReplenishmentLists: Object.values(idbReplenishSnap.val() || {})
  };
}
