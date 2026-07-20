import { useRef, useEffect } from 'react';
import { handleDatabaseError, OperationType } from '../lib/db-compat';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { OnlineOrder, CartItem, Transaction, Product, CompanySettings, Customer } from '../types';
import { generateUniqueId } from '../lib/utils';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useAuthStore } from '../store/useAuthStore';

export function useCartSync(
  autoSyncOrders: boolean
) {
  const onlineOrders = useTransactionStore(s => s.onlineOrders);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const customers = usePeopleStore(s => s.customers);
  const user = useAuthStore(s => s.user);

  const syncInProgress = useRef<Set<string>>(new Set());

  const syncOrder = async (order: OnlineOrder) => {
    if (order.syncedToPos) return;
    
    try {
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

      const transactionItems: CartItem[] = order.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...product,
          cartItemId: generateUniqueId(),
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          costPrice: product?.costPrice || 0,
          taxRate: product?.taxRate || settings.taxRate,
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
        total: order.total,
        paymentMethod: 'card',
        deliveryMethod: order.deliveryMethod || 'in_store',
        timestamp: order.timestamp || new Date().toISOString(),
        userId: user?.uid || 'system',
        employeeId: 'online_sync',
        employeeName: 'Commande en ligne',
        customerId: finalCustomerId || null,
        customerName: order.customerName || null,
        status: 'completed',
        onlineOrderId: order.id,
        pointsEarned: finalCustomerId ? Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1)) : 0
      };

      await localDb.insert(`transactions/${transactionId}`, transaction);

      for (const item of transactionItems) {
        if (!item.id || item.id === 'undefined') continue;
        const currentProduct = products.find(p => p.id === item.id);
        if (currentProduct && currentProduct.id) {
          if (currentProduct.isBundle && currentProduct.bundleItems) {
            for (const bundleItem of currentProduct.bundleItems) {
              const componentProduct = products.find((p: Product) => p.id === bundleItem.productId);
              if (componentProduct && componentProduct.id) {
                enqueueStockAdjustment(componentProduct.id, -(bundleItem.quantity * item.quantity));
                await localDb.update(`products/${componentProduct.id}`, { updatedAt: new Date().toISOString() });
              }
            }
          } else {
            let change = -item.quantity;
            if ((currentProduct.stock || 0) < item.quantity && currentProduct.autoUnpack && currentProduct.parentId && currentProduct.unitsPerParent) {
              const parentProduct = products.find((p: Product) => p.id === currentProduct.parentId);
              if (parentProduct && parentProduct.id) {
                const shortfall = item.quantity - (currentProduct.stock || 0);
                const parentsNeeded = Math.ceil(shortfall / currentProduct.unitsPerParent);
                enqueueStockAdjustment(parentProduct.id, -parentsNeeded);
                await localDb.update(`products/${parentProduct.id}`, { updatedAt: new Date().toISOString() });
                change += (parentsNeeded * currentProduct.unitsPerParent);
              }
            }
            enqueueStockAdjustment(currentProduct.id, change);
            await localDb.update(`products/${currentProduct.id}`, { updatedAt: new Date().toISOString() });
          }
        }
      }

      await localDb.update(`onlineOrders/${order.id}`, {
        syncedToPos: true,
        ...(finalCustomerId ? { customerId: finalCustomerId } : {})
      });

      if (order.status === 'delivered' && finalCustomerId) {
        const customer = customers.find(c => c.id === finalCustomerId);
        if (customer) {
          const pointsEarned = Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1));
          await localDb.update(`customers/${finalCustomerId}`, {
            loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned,
            totalSpent: (customer.totalSpent || 0) + order.total,
            lastVisit: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Error syncing order:", error);
      handleDatabaseError(error, OperationType.WRITE, 'transactions');
    }
  };

  useEffect(() => {
    // Respect user intent: Completely disabled automated background syncing of online orders
    if (false && autoSyncOrders && onlineOrders.length > 0) {
      const unsynced = onlineOrders.filter(o => 
        !o.syncedToPos && 
        ['confirmed', 'shipped', 'delivered'].includes(o.status) &&
        !syncInProgress.current.has(o.id)
      );

      unsynced.forEach(async (o) => {
        syncInProgress.current.add(o.id);
        try {
          await syncOrder(o);
        } finally {
          setTimeout(() => {
            syncInProgress.current.delete(o.id);
          }, 5000);
        }
      });
    }
  }, [onlineOrders, autoSyncOrders, products, customers, settings, user]);

  return { syncOrder };
}

