import { useRef, useEffect } from 'react';
import { OnlineOrder } from '../types';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useAuthStore } from '../store/useAuthStore';
import { destockOrder } from '../services/orderStockService';

export function useCartSync(autoSyncOrders: boolean) {
  const onlineOrders = useTransactionStore(s => s.onlineOrders);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const customers = usePeopleStore(s => s.customers);
  const user = useAuthStore(s => s.user);

  // Verrou atomique pour empêcher le traitement simultané d'une même commande
  const syncInProgress = useRef<Set<string>>(new Set());

  const syncOrder = async (order: OnlineOrder) => {
    if (!order || !order.id) return;
    if (order.syncedToPos || syncInProgress.current.has(String(order.id))) return;

    syncInProgress.current.add(String(order.id));
    try {
      await destockOrder(order, { user, settings, customers });
    } catch (err) {
      console.error('[useCartSync] Erreur syncOrder:', err);
    } finally {
      setTimeout(() => {
        syncInProgress.current.delete(String(order.id));
      }, 1500);
    }
  };

  // 🚀 SYNCHRONISATION AUTOMATIQUE EN ARRIÈRE-PLAN
  useEffect(() => {
    if (!autoSyncOrders || !onlineOrders || onlineOrders.length === 0) return;

    // Statuts autorisés pour la synchro automatique (Sécurité Métier : 'pending' requiert validation)
    const validStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
    const unsynced = onlineOrders.filter(o => 
      o && o.id && 
      !o.syncedToPos && 
      validStatuses.includes(String(o.status || '').toLowerCase()) &&
      !syncInProgress.current.has(String(o.id))
    );

    if (unsynced.length === 0) return;

    // Exécution séquentielle pour garantir l'intégrité des stocks
    const runAutoSync = async () => {
      for (const order of unsynced) {
        await syncOrder(order);
      }
    };

    runAutoSync();
  }, [onlineOrders, autoSyncOrders, products, customers, settings, user]);

  return { syncOrder };
}
