import { useRef, useEffect } from 'react';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { enqueueStockAdjustment, enqueueSyncBatch } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { OnlineOrder, CartItem, Transaction, Product, CompanySettings, Customer } from '../types';
import { generateUniqueId } from '../lib/utils';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../supabase';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

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
    if (order.syncedToPos || syncInProgress.current.has(order.id)) return;

    syncInProgress.current.add(order.id);

    try {
      // 🛡️ SÉCURITÉ STOCK (Phase 3) : Vérification préventive des ruptures de stock physiques (Option 1 : stock négatif permis par défaut)
      const allowNegative = settings.allowNegativeStock !== false;
      const safeItems = Array.isArray(order.items) ? order.items : [];
      const stockIssues: string[] = [];

      for (const item of safeItems) {
        if (!item || !item.productId) continue;
        const prod = products.find(p => p.id === item.productId);
        if (prod && !allowNegative) {
          const currentStock = prod.stock || 0;
          const requiredQty = Number(item.quantity || 1);
          if (currentStock < requiredQty) {
            stockIssues.push(`${prod.name} (Demandé: ${requiredQty}, Dispo: ${currentStock})`);
          }
        }
      }

      if (stockIssues.length > 0) {
        console.warn(`[useCartSync] Stock insuffisant pour la commande #${order.id}:`, stockIssues);
        toast.error(`Commande #${String(order.id).slice(-6)} en attente : Rupture de stock sur ${stockIssues.join(', ')}`, {
          duration: 7000,
          icon: '⚠️'
        });
        syncInProgress.current.delete(order.id);
        return;
      }

      let finalCustomerId = order.customerId;
      if (!finalCustomerId) {
        const found = customers.find(c => 
          (order.customerPhone && c.phone && c.phone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, '')) || 
          (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())
        );
        if (found) {
          finalCustomerId = found.id;
        }
      }

      const transactionItems: CartItem[] = safeItems.map((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...product,
          cartItemId: generateUniqueId(),
          id: item.productId || `prod-${idx}`,
          name: item.name || product?.name || 'Article',
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity || 1)),
          costPrice: product?.costPrice || 0,
          taxRate: product?.taxRate || settings.taxRate || 19,
          stock: product?.stock || 0,
          minStock: product?.minStock || 5,
          categoryId: product?.categoryId || 'Online',
          supplier: product?.supplier || '',
          unit: product?.unit || 'unité',
          sku: product?.sku || '',
          status: product?.status || 'active',
          updatedAt: new Date().toISOString()
        } as CartItem;
      });

      const transactionId = (await localDb.push('transactions')).key || generateUniqueId();
      const transaction: Transaction = {
        id: transactionId,
        items: transactionItems,
        total: Number(order.total || 0),
        paymentMethod: (order.paymentMethod as any) || 'card',
        deliveryMethod: order.deliveryMethod || 'in_store',
        timestamp: order.timestamp || new Date().toISOString(),
        userId: user?.uid || 'system',
        employeeId: 'online_sync',
        employeeName: 'Commande en ligne',
        customerId: finalCustomerId || null,
        customerName: order.customerName || null,
        status: 'completed',
        onlineOrderId: order.id,
        pointsEarned: finalCustomerId ? Math.floor(Number(order.total || 0) * (settings.loyaltyPointsPerCurrencyUnit || 1)) : 0
      };

      // 1. Enregistrement transaction local & queue offline Supabase
      await localDb.insert(`transactions/${transactionId}`, transaction);
      useTransactionStore.getState().setTransactions(prev => [transaction, ...(prev || [])]);
      enqueueSyncBatch([{ action: 'UPSERT', table: 'transactions', recordId: transactionId, payload: transaction }]);

      // 2. Déduction des stocks
      const currentProducts = useCoreStore.getState().products || [];
      const productMap = new Map(currentProducts.map(p => [p.id, p]));

      for (const item of transactionItems) {
        if (!item.id || item.id === 'undefined') continue;
        const currentProduct = productMap.get(item.id) || products.find(p => p.id === item.id);
        if (currentProduct && currentProduct.id) {
          if (currentProduct.isBundle && currentProduct.bundleItems) {
            for (const bundleItem of currentProduct.bundleItems) {
              const componentProduct = productMap.get(bundleItem.productId) || products.find((p: Product) => p.id === bundleItem.productId);
              if (componentProduct && componentProduct.id) {
                const bundleDelta = -(bundleItem.quantity * item.quantity);
                const newCompStock = (componentProduct.stock || 0) + bundleDelta;
                productMap.set(componentProduct.id, { ...componentProduct, stock: newCompStock, updatedAt: new Date().toISOString() });
                enqueueStockAdjustment(componentProduct.id, bundleDelta);
                await localDb.update(`products/${componentProduct.id}`, { stock: newCompStock, updatedAt: new Date().toISOString() });
                window.dispatchEvent(new CustomEvent('product-cache-update', {
                  detail: { ...componentProduct, stock: newCompStock }
                }));
                if (isSupabaseConfigured) {
                  try {
                    await supabase.from('products').update({ stock: newCompStock, updated_at: new Date().toISOString() }).eq('id', componentProduct.id);
                  } catch (_) {}
                }
              }
            }
          } else {
            let change = -item.quantity;
            if ((currentProduct.stock || 0) < item.quantity && currentProduct.autoUnpack && currentProduct.parentId && currentProduct.unitsPerParent) {
              const parentProduct = productMap.get(currentProduct.parentId) || products.find((p: Product) => p.id === currentProduct.parentId);
              if (parentProduct && parentProduct.id) {
                const shortfall = item.quantity - (currentProduct.stock || 0);
                const parentsNeeded = Math.ceil(shortfall / currentProduct.unitsPerParent);
                const newParentStock = (parentProduct.stock || 0) - parentsNeeded;
                productMap.set(parentProduct.id, { ...parentProduct, stock: newParentStock, updatedAt: new Date().toISOString() });
                enqueueStockAdjustment(parentProduct.id, -parentsNeeded);
                await localDb.update(`products/${parentProduct.id}`, { stock: newParentStock, updatedAt: new Date().toISOString() });
                window.dispatchEvent(new CustomEvent('product-cache-update', {
                  detail: { ...parentProduct, stock: newParentStock }
                }));
                if (isSupabaseConfigured) {
                  try {
                    await supabase.from('products').update({ stock: newParentStock, updated_at: new Date().toISOString() }).eq('id', parentProduct.id);
                  } catch (_) {}
                }
                change += (parentsNeeded * currentProduct.unitsPerParent);
              }
            }
            const newStock = (currentProduct.stock || 0) + change;
            productMap.set(currentProduct.id, { ...currentProduct, stock: newStock, updatedAt: new Date().toISOString() });
            enqueueStockAdjustment(currentProduct.id, change);
            await localDb.update(`products/${currentProduct.id}`, { stock: newStock, updatedAt: new Date().toISOString() });
            window.dispatchEvent(new CustomEvent('product-cache-update', {
              detail: { ...currentProduct, stock: newStock }
            }));
            if (isSupabaseConfigured) {
              try {
                await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', currentProduct.id);
              } catch (_) {}
            }
          }
        }
      }
      useCoreStore.getState().setProducts(Array.from(productMap.values()));
      idbSet('nexus_products_cache', Array.from(productMap.values())).catch(() => {});

      // 3. Marquage syncedToPos en local, en mémoire Zustand, et dans le cache IDB
      await localDb.update(`onlineOrders/${order.id}`, {
        syncedToPos: true,
        ...(finalCustomerId ? { customerId: finalCustomerId } : {})
      });

      const updatedOnlineOrders = (useTransactionStore.getState().onlineOrders || []).map(o => 
        o.id === order.id ? { ...o, syncedToPos: true, ...(finalCustomerId ? { customerId: finalCustomerId } : {}) } : o
      );
      useTransactionStore.getState().setOnlineOrders(updatedOnlineOrders);
      idbSet('nexus_online_orders_cache', updatedOnlineOrders).catch(() => {});

      // 4. Synchronisation immédiate vers Supabase + File d'attente hors-ligne
      if (isSupabaseConfigured && navigator.onLine) {
        try {
          await supabase
            .from('online_orders')
            .update({ 
              synced_to_pos: true,
              ...(finalCustomerId ? { customer_id: finalCustomerId } : {})
            })
            .eq('id', order.id);
        } catch (supErr) {
          console.warn('[useCartSync] Supabase direct update failed, queuing offline:', supErr);
        }
      }

      enqueueSyncBatch([{
        action: 'UPSERT',
        table: 'online_orders',
        recordId: String(order.id),
        payload: { synced_to_pos: true, ...(finalCustomerId ? { customer_id: finalCustomerId } : {}) }
      }]);

      // 5. Points de fidélité si livrée
      if (order.status === 'delivered' && finalCustomerId) {
        const customer = customers.find(c => c.id === finalCustomerId);
        if (customer) {
          const pointsEarned = Math.floor(Number(order.total || 0) * (settings.loyaltyPointsPerCurrencyUnit || 1));
          await localDb.update(`customers/${finalCustomerId}`, {
            loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned,
            totalSpent: (customer.totalSpent || 0) + Number(order.total || 0),
            lastVisit: new Date().toISOString()
          });
        }
      }

      toast.success(`Commande #${String(order.id).slice(-6)} intégrée à la caisse (Stock déduit)`, {
        icon: '✅'
      });
    } catch (error) {
      console.error("Error syncing order:", error);
      handleDatabaseError(error, OperationType.WRITE, 'transactions');
    } finally {
      // Retrait du verrou après un court délai pour éviter toute réentrance
      setTimeout(() => {
        syncInProgress.current.delete(order.id);
      }, 3000);
    }
  };

  // 🚀 SYNCHRONISATION AUTOMATIQUE EN ARRIÈRE-PLAN
  useEffect(() => {
    if (!autoSyncOrders || !onlineOrders || onlineOrders.length === 0) return;

    // Statuts autorisés pour la synchro automatique (Sécurité Métier : 'pending' requiert validation)
    const validStatuses = ['confirmed', 'paid', 'shipped', 'delivered'];
    const unsynced = onlineOrders.filter(o => 
      o && o.id && 
      !o.syncedToPos && 
      validStatuses.includes(String(o.status || '').toLowerCase()) &&
      !syncInProgress.current.has(o.id)
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

