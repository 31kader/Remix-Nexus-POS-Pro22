import { useState } from 'react';
import { supabase } from '../../supabase';
import { convertKeysToSnake } from '../../lib/db-converters';
import { Supplier, Product } from '../../types';

interface UseSupplierSyncParams {
  products: Product[];
}

export function useSupplierSync({ products }: UseSupplierSyncParams) {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleSync = async (supplier: Supplier) => {
    if (!supplier.feedUrl) return;
    setIsSyncing(supplier.id);
    try {
      console.log(`Syncing from ${supplier.feedUrl} (${supplier.feedFormat})...`);
      
      const response = await fetch(supplier.feedUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      let data: any[] = [];
      
      if (supplier.feedFormat === 'json') {
        data = await response.json();
        if (!Array.isArray(data) && (data as any).products) {
          data = (data as any).products;
        }
      } else {
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or missing data');
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = values[i];
          });
          return obj;
        });
      }

      if (!Array.isArray(data)) throw new Error('Invalid data format: expected an array of products');

      const supplierProducts = products.filter(p => p.supplier === supplier.name);
      let updatedCount = 0;
      
      for (const item of data) {
        const sku = item.sku || item.SKU || item.reference || item.id;
        if (!sku) continue;

        const product = supplierProducts.find(p => p.sku === sku);
        if (product) {
          const newPrice = parseFloat(item.price || item.Price || item.sale_price);
          const newStock = parseInt(item.stock || item.Stock || item.quantity || item.qty);
          const newCostPrice = parseFloat(item.cost_price || item.costPrice || item.purchase_price);

          const updates: any = { updatedAt: new Date().toISOString() };
          if (!isNaN(newPrice)) updates.price = newPrice;
          if (!isNaN(newStock)) updates.stock = newStock;
          if (!isNaN(newCostPrice)) updates.costPrice = newCostPrice;

          const snakeUpdates = convertKeysToSnake(updates);
          if (Object.keys(snakeUpdates).length > 1) {
            if (product.id && product.id !== 'undefined') {
              const { error } = await supabase
                .from('products')
                .update(snakeUpdates)
                .eq('id', product.id);
              if (error) throw error;
              updatedCount++;
            }
          }
        }
      }

      const { error: syncError } = await supabase
        .from('suppliers')
        .update({
          last_sync: new Date().toISOString()
        })
        .eq('id', supplier.id);
      if (syncError) throw syncError;

      alert(`Synchronisation terminée pour ${supplier.name}. ${updatedCount} produits mis à jour.`);
    } catch (error: any) {
      console.error('Sync failed:', error);
      alert(`La synchronisation a échoué: ${error.message}`);
    } finally {
      setIsSyncing(null);
    }
  };

  return {
    isSyncing,
    setIsSyncing,
    handleSync
  };
}
