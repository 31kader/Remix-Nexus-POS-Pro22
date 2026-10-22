import { localDb } from './LocalDatabase';
import { enqueueSyncBatch } from './SyncService';
import { getArchivedTransactionsFromStorage, replaceTableState } from '../lib/local-db';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { set as idbSet, get as idbGet } from 'idb-keyval';
import { toast } from 'sonner';

export interface BackupData {
  version: string;
  createdAt: string;
  appName: string;
  settings: any;
  products: any[];
  categories: any[];
  brands: any[];
  customers: any[];
  suppliers: any[];
  employees: any[];
  transactions: any[];
  expenses: any[];
  stockAdjustments: any[];
  purchases: any[];
  returns?: any[];
  supplierPayments?: any[];
  damagedItems?: any[];
  auditLogs?: any[];
  promotions?: any[];
  vouchers?: any[];
  purchaseOrders?: any[];
  onlineOrders?: any[];
  goodsReceiptNotes?: any[];
  shifts?: any[];
  audits?: any[];
  attendance?: any[];
  advances?: any[];
  shortageItems?: any[];
  customReplenishmentLists?: any[];
}

/**
 * 📦 Exporte l'intégralité de la base de données locale dans un fichier .nexus-backup
 */
export async function createBackupArchive(): Promise<void> {
  try {
    toast.loading("Génération de la sauvegarde de secours en cours...", { id: 'backup-toast' });

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

    const backupData: BackupData = {
      version: '1.2.33',
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

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `NexusPOS_Backup_${dateFormatted}.nexus-backup`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Sauvegarde créée avec succès : ${backupData.products.length} articles sauvegardés !`, { id: 'backup-toast' });
  } catch (err: any) {
    console.error('Erreur lors de la sauvegarde :', err);
    toast.error(`Échec de la sauvegarde : ${err.message}`, { id: 'backup-toast' });
  }
}

/**
 * 📥 Restaure les données depuis un fichier .nexus-backup ou .json
 */
export async function restoreBackupArchive(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error('Fichier de sauvegarde vide');
        }

        const backup = JSON.parse(content) as BackupData;
        if (!backup.appName || (!backup.products && !backup.transactions)) {
          throw new Error("Format de fichier de sauvegarde invalide pour Nexus POS Pro");
        }

        toast.loading("Restauration de la base de données en cours...", { id: 'restore-toast' });

        if (backup.settings) {
          useCoreStore.getState().setSettings(backup.settings);
          await localDb.insert('settings/company', backup.settings);
        }

        if (backup.products && Array.isArray(backup.products)) {
          useCoreStore.getState().setProducts(backup.products);
          await idbSet('nexus_products_cache', backup.products);
          const prodMap: Record<string, any> = {};
          backup.products.forEach(p => { if (p && p.id) prodMap[p.id] = p; });
          enqueueSyncBatch('products', prodMap);
        }

        if (backup.categories && Array.isArray(backup.categories)) {
          useCoreStore.getState().setCategories(backup.categories);
          await idbSet('nexus_categories', backup.categories);
          const catMap: Record<string, any> = {};
          backup.categories.forEach(c => { if (c && c.id) catMap[c.id] = c; });
          await localDb.insertBatch('categories', catMap);
        }

        if (backup.brands && Array.isArray(backup.brands)) {
          useCoreStore.getState().setBrands(backup.brands);
          const brandMap: Record<string, any> = {};
          backup.brands.forEach(b => { if (b && b.id) brandMap[b.id] = b; });
          await localDb.insertBatch('brands', brandMap);
        }

        if (backup.customers && Array.isArray(backup.customers)) {
          usePeopleStore.getState().setCustomers(backup.customers);
          await idbSet('nexus_customers', backup.customers);
          const custMap: Record<string, any> = {};
          backup.customers.forEach(c => { if (c && c.id) custMap[c.id] = c; });
          await localDb.insertBatch('customers', custMap);
        }

        if (backup.suppliers && Array.isArray(backup.suppliers)) {
          usePeopleStore.getState().setSuppliers(backup.suppliers);
          await idbSet('nexus_suppliers', backup.suppliers);
          const suppMap: Record<string, any> = {};
          backup.suppliers.forEach(s => { if (s && s.id) suppMap[s.id] = s; });
          await localDb.insertBatch('suppliers', suppMap);
        }

        if (backup.employees && Array.isArray(backup.employees)) {
          usePeopleStore.getState().setEmployees(backup.employees);
          await idbSet('nexus_employees_cache', backup.employees);
          const empMap: Record<string, any> = {};
          backup.employees.forEach(emp => { if (emp && emp.id) empMap[emp.id] = emp; });
          await localDb.insertBatch('employees', empMap);
        }

        if (backup.transactions && Array.isArray(backup.transactions)) {
          useTransactionStore.getState().setTransactions(backup.transactions);
          await idbSet('nexus_transactions_cache', backup.transactions);
          const txMap: Record<string, any> = {};
          backup.transactions.forEach(t => { if (t && t.id) txMap[t.id] = t; });
          await localDb.insertBatch('transactions', txMap);
        }

        if (backup.expenses && Array.isArray(backup.expenses)) {
          useFinanceStore.getState().setExpenses(backup.expenses);
          await idbSet('nexus_expenses_cache', backup.expenses);
          const expMap: Record<string, any> = {};
          backup.expenses.forEach(x => { if (x && x.id) expMap[x.id] = x; });
          await localDb.insertBatch('expenses', expMap);
        }

        if (backup.purchases && Array.isArray(backup.purchases)) {
          useFinanceStore.getState().setPurchases(backup.purchases);
          await idbSet('nexus_purchases_cache', backup.purchases);
          const purMap: Record<string, any> = {};
          backup.purchases.forEach(p => { if (p && p.id) purMap[p.id] = p; });
          await localDb.insertBatch('purchases', purMap);
        }

        if (backup.stockAdjustments && Array.isArray(backup.stockAdjustments)) {
          useInventoryStore.getState().setStockAdjustments(backup.stockAdjustments);
          await idbSet('nexus_stock_adjustments_cache', backup.stockAdjustments);
          replaceTableState('stock_adjustments', backup.stockAdjustments);
        }

        if (backup.returns && Array.isArray(backup.returns)) {
          useTransactionStore.getState().setReturns(backup.returns);
          await idbSet('nexus_returns_cache', backup.returns);
          const retMap: Record<string, any> = {};
          backup.returns.forEach(r => { if (r && r.id) retMap[r.id] = r; });
          await localDb.insertBatch('returns', retMap);
        }

        if (backup.supplierPayments && Array.isArray(backup.supplierPayments)) {
          useFinanceStore.getState().setSupplierPayments(backup.supplierPayments);
          await idbSet('nexus_supplier_payments_cache', backup.supplierPayments);
          const spMap: Record<string, any> = {};
          backup.supplierPayments.forEach(sp => { if (sp && sp.id) spMap[sp.id] = sp; });
          await localDb.insertBatch('supplierPayments', spMap);
        }

        if (backup.damagedItems && Array.isArray(backup.damagedItems)) {
          useInventoryStore.getState().setDamagedItems(backup.damagedItems);
          await idbSet('nexus_damaged_items_cache', backup.damagedItems);
          const diMap: Record<string, any> = {};
          backup.damagedItems.forEach(di => { if (di && di.id) diMap[di.id] = di; });
          await localDb.insertBatch('damagedItems', diMap);
        }

        if (backup.auditLogs && Array.isArray(backup.auditLogs)) {
          await idbSet('nexus_audit_logs_cache', backup.auditLogs);
          const alMap: Record<string, any> = {};
          backup.auditLogs.forEach(al => { if (al && al.id) alMap[al.id] = al; });
          await localDb.insertBatch('auditLogs', alMap);
        }

        if (backup.promotions && Array.isArray(backup.promotions)) {
          useCoreStore.getState().setPromotions(backup.promotions);
          await idbSet('nexus_promotions', backup.promotions);
          const pMap: Record<string, any> = {};
          backup.promotions.forEach(p => { if (p && p.id) pMap[p.id] = p; });
          await localDb.insertBatch('promotions', pMap);
        }

        if (backup.vouchers && Array.isArray(backup.vouchers)) {
          await idbSet('nexus_vouchers', backup.vouchers);
          const vMap: Record<string, any> = {};
          backup.vouchers.forEach(v => { if (v && v.id) vMap[v.id] = v; });
          await localDb.insertBatch('vouchers', vMap);
        }

        if (backup.purchaseOrders && Array.isArray(backup.purchaseOrders)) {
          useTransactionStore.getState().setPurchaseOrders(backup.purchaseOrders);
          const poMap: Record<string, any> = {};
          backup.purchaseOrders.forEach(po => { if (po && po.id) poMap[po.id] = po; });
          await localDb.insertBatch('purchaseOrders', poMap);
        }

        if (backup.onlineOrders && Array.isArray(backup.onlineOrders)) {
          useTransactionStore.getState().setOnlineOrders(backup.onlineOrders);
          await idbSet('nexus_online_orders_cache', backup.onlineOrders);
          const ooMap: Record<string, any> = {};
          backup.onlineOrders.forEach(o => { if (o && o.id) ooMap[o.id] = o; });
          await localDb.insertBatch('onlineOrders', ooMap);
        }

        if (backup.goodsReceiptNotes && Array.isArray(backup.goodsReceiptNotes)) {
          const grnMap: Record<string, any> = {};
          backup.goodsReceiptNotes.forEach(g => { if (g && g.id) grnMap[g.id] = g; });
          await localDb.insertBatch('goodsReceiptNotes', grnMap);
        }

        if (backup.shifts && Array.isArray(backup.shifts)) {
          useTransactionStore.getState().setShifts(backup.shifts);
          await idbSet('nexus_cash_shifts_cache', backup.shifts);
          replaceTableState('cash_shifts', backup.shifts);
        }

        if (backup.audits && Array.isArray(backup.audits)) {
          useInventoryStore.getState().setAudits(backup.audits);
          const audMap: Record<string, any> = {};
          backup.audits.forEach(a => { if (a && a.id) audMap[a.id] = a; });
          await localDb.insertBatch('audits', audMap);
        }

        if (backup.attendance && Array.isArray(backup.attendance)) {
          useInventoryStore.getState().setAttendance(backup.attendance);
          const attMap: Record<string, any> = {};
          backup.attendance.forEach(a => { if (a && a.id) attMap[a.id] = a; });
          await localDb.insertBatch('attendance', attMap);
        }

        if (backup.advances && Array.isArray(backup.advances)) {
          useFinanceStore.getState().setAdvances(backup.advances);
          const advMap: Record<string, any> = {};
          backup.advances.forEach(a => { if (a && a.id) advMap[a.id] = a; });
          await localDb.insertBatch('advances', advMap);
        }

        if (backup.shortageItems && Array.isArray(backup.shortageItems)) {
          const siMap: Record<string, any> = {};
          backup.shortageItems.forEach(s => { if (s && s.id) siMap[s.id] = s; });
          await localDb.insertBatch('shortageItems', siMap);
        }

        if (backup.customReplenishmentLists && Array.isArray(backup.customReplenishmentLists)) {
          const crMap: Record<string, any> = {};
          backup.customReplenishmentLists.forEach(l => { if (l && l.id) crMap[l.id] = l; });
          await localDb.insertBatch('customReplenishmentLists', crMap);
        }

        localStorage.setItem('nexus_has_cached_products', 'true');
        toast.success(`Restauration terminée avec succès ! (${backup.products?.length || 0} articles rechargés)`, { id: 'restore-toast' });
        resolve(true);
      } catch (err: any) {
        console.error('Erreur lors de la restauration :', err);
        toast.error(`Erreur de restauration : ${err.message}`, { id: 'restore-toast' });
        reject(err);
      }
    };
    reader.onerror = () => {
      toast.error('Erreur lors de la lecture du fichier', { id: 'restore-toast' });
      reject(new Error('Erreur de lecture du fichier'));
    };
    reader.readAsText(file);
  });
}
