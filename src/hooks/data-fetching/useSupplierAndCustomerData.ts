import { useEffect } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured, removeChannelByName } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { PurchaseOrder, Transaction, CompanySettings } from '../../types';

interface useSupplierAndCustomerDataParams {
  loading: boolean;
  appMode: string;
  currentSupplierId: string | undefined;
  currentCustomerId: string | undefined;
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setTransactions: (txs: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function useSupplierAndCustomerData({
  loading,
  appMode,
  currentSupplierId,
  currentCustomerId,
  setPurchaseOrders,
  setTransactions,
  setSettings
}: useSupplierAndCustomerDataParams) {
  // Supplier POs
  useEffect(() => {
    if (loading || !currentSupplierId) return;

    let isSubscribed = true;
    let unsubPos: (() => void) | undefined;
    let channel: any;

    const loadSupplierPOs = async () => {
      try {
        const poCols = TABLE_COLUMNS['purchase_orders'] ? TABLE_COLUMNS['purchase_orders'].join(',') : '*';
        let result = await supabase
          .from('purchase_orders')
          .select(poCols)
          .eq('supplier_id', currentSupplierId);
          
        if (result.error) {
          console.warn("[Supplier PO Fetch] Retrying without potentially un-migrated columns...");
          const columnsToRemove = ['is_active', 'old_quantity', 'order_number', 'user_id'];
          const safeCols = (TABLE_COLUMNS['purchase_orders'] || [])
            .filter(c => !columnsToRemove.includes(c))
            .join(',');
          
          result = await supabase
            .from('purchase_orders')
            .select(safeCols || '*')
            .eq('supplier_id', currentSupplierId);
            
          if (result.error) {
            console.warn("[Supplier PO Fetch Override] Safe columns failed too, retrying with raw * select...");
            result = await supabase
              .from('purchase_orders')
              .select('*')
              .eq('supplier_id', currentSupplierId);
          }
        }
        
        const { data, error } = result;
        if (!error && data && isSubscribed) {
          const poDocs = data.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch(e) {}
            }
            return convertKeysToCamel(item) as PurchaseOrder;
          });
          setPurchaseOrders(poDocs.filter((po: PurchaseOrder) => po.supplierId === currentSupplierId));
        }
      } catch (err) {
        console.warn('[useDataFetching] direct PO fetch failed', err);
      }
    };
    
    if (isSupabaseConfigured) {
      loadSupplierPOs();
      
      removeChannelByName('public:purchase_orders');
      channel = supabase
        .channel('public:purchase_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders', filter: `supplier_id=eq.${currentSupplierId}` }, () => {
          loadSupplierPOs();
        })
        .subscribe();
    } else {
      unsubPos = localDb.subscribe('purchaseOrders', (snapshot) => {
          if (isSubscribed) {
            if (snapshot.exists()) {
               const data = snapshot.val();
               const pos = Object.keys(data).map(id => ({ id, ...data[id] } as PurchaseOrder));
               setPurchaseOrders(pos.filter(po => po.supplierId === currentSupplierId));
            } else {
               setPurchaseOrders([]);
            }
          }
      });
    }

    return () => {
      isSubscribed = false;
      if (unsubPos) unsubPos();
      if (channel) supabase.removeChannel(channel);
    };
  }, [loading, currentSupplierId]);

  // Customer transactions
  useEffect(() => {
    if (appMode !== 'customer' || !currentCustomerId) return;
    
    let isSubscribed = true;
    let unsubTxs: (() => void) | undefined;
    let channel: any;
    
    const loadCustomerTxs = async () => {
      try {
        const txCols = TABLE_COLUMNS['transactions']
          ? TABLE_COLUMNS['transactions'].filter((c: string) => !['audited_by', 'audited_at', 'audit_duration', 'audit_note'].includes(c)).join(',')
          : '*';
        const { data, error } = await supabase
          .from('transactions')
          .select(txCols)
          .eq('customer_id', currentCustomerId);
        if (!error && data && isSubscribed) {
          const txDocs = data.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch(e) {}
            }
            return convertKeysToCamel(item) as Transaction;
          });
          setTransactions(txDocs.filter((t: Transaction) => t.customerId === currentCustomerId));
        }
      } catch (err) {
        console.warn('[useDataFetching] direct customer tx fetch failed', err);
      }
    };
    
    if (isSupabaseConfigured) {
      loadCustomerTxs();
      
      removeChannelByName('public:transactions');
      channel = supabase
        .channel('public:transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `customer_id=eq.${currentCustomerId}` }, () => {
          loadCustomerTxs();
        })
        .subscribe();
    } else {
      unsubTxs = localDb.subscribe('transactions', (snapshot) => {
          if (isSubscribed) {
            if (snapshot.exists()) {
               const data = snapshot.val();
               const txs = Object.keys(data).map(id => ({ id, ...data[id] } as Transaction));
               setTransactions(txs.filter(t => t.customerId === currentCustomerId));
            } else {
               setTransactions([]);
            }
          }
      });
          
      localDb.get('settings/company')
          .then(snap => { if (snap.exists() && isSubscribed) setSettings(snap.val() as CompanySettings); })
          .catch((err: any) => {
              const msg = String(err?.message || err);
              if (msg.includes('Quota') || msg.includes('PERMISSION_DENIED') || msg.includes('resource-exhausted')) {
                  console.warn("[Quota/Permission] Fetch fallback for company settings");
              } else {
                  console.error("Error fetching settings", err);
              }
          });
    }

    return () => {
        isSubscribed = false;
        if (unsubTxs) unsubTxs();
        if (channel) supabase.removeChannel(channel);
    };
  }, [appMode, currentCustomerId]);
}
