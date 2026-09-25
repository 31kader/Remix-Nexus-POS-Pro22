import { useEffect } from 'react';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured, removeChannelByName, safeRemoveChannel, realtimeCircuitBreaker } from '../../supabase';
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
  setSettings,
}: useSupplierAndCustomerDataParams) {
  // Supplier POs
  useEffect(() => {
    if (appMode !== 'supplier' || !currentSupplierId) return;
    
    let isSubscribed = true;
    let unsubPos: (() => void) | undefined;
    let channel: any;
    
    const loadSupplierPOs = async () => {
      try {
        const poCols = '*';
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(poCols)
          .eq('supplier_id', currentSupplierId)
          .limit(100);
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
      if (typeof navigator === 'undefined' || navigator.onLine) {
        if (!realtimeCircuitBreaker.isOpen()) {
          channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              realtimeCircuitBreaker.recordSuccess();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              realtimeCircuitBreaker.recordFailure('public:purchase_orders');
            }
          });
        }
      }
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
      if (channel) safeRemoveChannel(channel);
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
        const txCols = '*';
        const { data, error } = await supabase
          .from('transactions')
          .select(txCols)
          .eq('customer_id', currentCustomerId)
          .limit(100);
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
      if (typeof navigator === 'undefined' || navigator.onLine) {
        if (!realtimeCircuitBreaker.isOpen()) {
          channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              realtimeCircuitBreaker.recordSuccess();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              realtimeCircuitBreaker.recordFailure('public:transactions');
            }
          });
        }
      }
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
        if (channel) safeRemoveChannel(channel);
    };
  }, [appMode, currentCustomerId]);
}
