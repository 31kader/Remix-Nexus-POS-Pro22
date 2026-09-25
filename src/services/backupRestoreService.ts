import { localDb } from './LocalDatabase';
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
    const idbSupplierPayments = (await idbGet<any[]>('nexus_supplier_payments_cache')) || [];
    const idbDamagedItems = (await idbGet<any[]>('nexus_damaged_items_cache')) || [];
    const idbAuditLogs = (await idbGet<any[]>('nexus_audit_logs_cache')) || [];
    const idbPromotions = (await idbGet<any[]>('nexus_promotions')) || coreStore.promotions || [];

    const backupData: BackupData = {
      version: '1.2.7',
      createdAt: new Date().toISOString(),
      appName: 'Nexus POS Pro',
      settings: coreStore.settings,
      products: idbProducts || [],
      categories: idbCategories || [],
      brands: coreStore.brands || [],
      customers: peopleStore.customers || [],
      suppliers: peopleStore.suppliers || [],
      employees: peopleStore.employees || [],
      transactions: transStore.transactions || [],
      expenses: finStore.expenses || [],
      stockAdjustments: invStore.stockAdjustments || [],
      purchases: finStore.purchases || [],
      returns: idbReturns,
      supplierPayments: idbSupplierPayments,
      damagedItems: idbDamagedItems,
      auditLogs: idbAuditLogs,
      promotions: idbPromotions
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
          backup.products.forEach(p => { prodMap[p.id] = p; });
          await localDb.insertBatch('products', prodMap);
        }

        if (backup.categories && Array.isArray(backup.categories)) {
          useCoreStore.getState().setCategories(backup.categories);
          await idbSet('nexus_categories', backup.categories);
          const catMap: Record<string, any> = {};
          backup.categories.forEach(c => { catMap[c.id] = c; });
          await localDb.insertBatch('categories', catMap);
        }

        if (backup.brands && Array.isArray(backup.brands)) {
          useCoreStore.getState().setBrands(backup.brands);
          const brandMap: Record<string, any> = {};
          backup.brands.forEach(b => { brandMap[b.id] = b; });
          await localDb.insertBatch('brands', brandMap);
        }

        if (backup.customers && Array.isArray(backup.customers)) {
          usePeopleStore.getState().setCustomers(backup.customers);
          const custMap: Record<string, any> = {};
          backup.customers.forEach(c => { custMap[c.id] = c; });
          await localDb.insertBatch('customers', custMap);
        }

        if (backup.suppliers && Array.isArray(backup.suppliers)) {
          usePeopleStore.getState().setSuppliers(backup.suppliers);
          const suppMap: Record<string, any> = {};
          backup.suppliers.forEach(s => { suppMap[s.id] = s; });
          await localDb.insertBatch('suppliers', suppMap);
        }

        if (backup.transactions && Array.isArray(backup.transactions)) {
          useTransactionStore.getState().setTransactions(backup.transactions);
          const txMap: Record<string, any> = {};
          backup.transactions.forEach(t => { txMap[t.id] = t; });
          await localDb.insertBatch('transactions', txMap);
        }

        if (backup.expenses && Array.isArray(backup.expenses)) {
          useFinanceStore.getState().setExpenses(backup.expenses);
          const expMap: Record<string, any> = {};
          backup.expenses.forEach(x => { expMap[x.id] = x; });
          await localDb.insertBatch('expenses', expMap);
        }

        if (backup.returns && Array.isArray(backup.returns)) {
          useTransactionStore.getState().setReturns(backup.returns);
          await idbSet('nexus_returns_cache', backup.returns);
          const retMap: Record<string, any> = {};
          backup.returns.forEach(r => { if (r && r.id) retMap[r.id] = r; });
          await localDb.insertBatch('returns', retMap);
        }

        if (backup.supplierPayments && Array.isArray(backup.supplierPayments)) {
          await idbSet('nexus_supplier_payments_cache', backup.supplierPayments);
          const spMap: Record<string, any> = {};
          backup.supplierPayments.forEach(sp => { if (sp && sp.id) spMap[sp.id] = sp; });
          await localDb.insertBatch('supplierPayments', spMap);
        }

        if (backup.damagedItems && Array.isArray(backup.damagedItems)) {
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
