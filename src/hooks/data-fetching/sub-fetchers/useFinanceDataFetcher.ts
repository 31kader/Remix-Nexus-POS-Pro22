import { useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../../services/LocalDatabase';
import { Transaction, ProductReturn } from '../../../types';

interface UseFinanceDataFetcherParams {
  setTransactions: (txs: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setReturns: React.Dispatch<React.SetStateAction<ProductReturn[]>>;
  isSubscribedRef: { current: boolean };
}

export function useFinanceDataFetcher({
  setTransactions,
  setReturns,
  isSubscribedRef
}: UseFinanceDataFetcherParams) {
  useEffect(() => {
    // 1. Chargement des transactions hors ligne sauvegardées en secours
    try {
      const offlineTxs = JSON.parse(localStorage.getItem('nexus_offline_transactions') || '[]');
      if (offlineTxs.length > 0) {
        setTransactions(offlineTxs);
      }
    } catch (e) {
      console.warn("Failed to load local offline transactions", e);
    }

    // 2. Listeners pour les transactions et retours créés hors ligne
    const handleOfflineTxCreated = (e: Event) => {
      const customEvent = e as CustomEvent<Transaction>;
      if (customEvent.detail && isSubscribedRef.current) {
        setTransactions(prev => {
          const map = new Map<string, Transaction>();
          (Array.isArray(prev) ? prev : []).forEach(t => { if (t && t.id) map.set(t.id, t); });
          if (customEvent.detail && customEvent.detail.id) {
            map.set(customEvent.detail.id, customEvent.detail);
          }
          const unique = Array.from(map.values());
          setTimeout(() => {
            idbSet('nexus_transactions_cache', unique).catch(() => {});
          }, 0);
          return unique;
        });
      }
    };
    
    const handleOfflineReturnCreated = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && isSubscribedRef.current) {
        setReturns(prev => {
          const map = new Map<string, any>();
          (Array.isArray(prev) ? prev : []).forEach(r => { if (r && r.id) map.set(r.id, r); });
          if (customEvent.detail && customEvent.detail.id) {
            map.set(customEvent.detail.id, customEvent.detail);
          }
          return Array.from(map.values());
        });
      }
    };
    
    window.addEventListener('offline-transaction-created', handleOfflineTxCreated);
    window.addEventListener('offline-return-created', handleOfflineReturnCreated);

    // 3. Purge automatique des fausses commandes auto-réapprovisionnement
    const purgeAutoReapprovisionnement = async () => {
      try {
        const purchasesSnap = await localDb.get('purchases');
        if (purchasesSnap.exists()) {
          const pData = purchasesSnap.val() || {};
          for (const [key, p] of Object.entries<any>(pData)) {
            const sId = p?.supplierId || p?.supplier_id;
            const sName = (p?.supplierName || p?.supplier_name || '').toLowerCase();
            if (sId === 'low-stock-auto' || sName.includes('auto-réapprovisionnement') || sName.includes('auto-reapprovisionnement')) {
              await localDb.delete(`purchases/${key}`);
            }
          }
        }
        const cached = await idbGet<any[]>('nexus_purchases_cache');
        if (Array.isArray(cached)) {
          const filtered = cached.filter(p => {
            const sId = p?.supplierId || p?.supplier_id;
            const sName = (p?.supplierName || p?.supplier_name || '').toLowerCase();
            return sId !== 'low-stock-auto' && !sName.includes('auto-réapprovisionnement') && !sName.includes('auto-reapprovisionnement');
          });
          if (filtered.length !== cached.length) {
            await idbSet('nexus_purchases_cache', filtered);
          }
        }
      } catch (err) {
        console.warn('[Startup] Cleanup Auto-Réapprovisionnement warning:', err);
      }
    };
    purgeAutoReapprovisionnement();

    return () => {
      window.removeEventListener('offline-transaction-created', handleOfflineTxCreated);
      window.removeEventListener('offline-return-created', handleOfflineReturnCreated);
    };
  }, [setTransactions, setReturns]);
}
