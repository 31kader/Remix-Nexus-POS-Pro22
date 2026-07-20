import { useState } from 'react';
import { localDb } from '../services/LocalDatabase';
import { Product } from '../types';
import { generateUniqueId } from '../lib/utils';
import { toast } from 'sonner';

interface UseProductImportParams {
  products: Product[];
  categories: any[];
  importPreviewData: any[];
  setIsImportModalOpen: (val: boolean) => void;
}

export function useProductImport({ products, categories, importPreviewData, setIsImportModalOpen }: UseProductImportParams) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<{ row: number, message: string }[]>([]);

  const executeImport = async (mapping: Record<string, string>) => {
    setIsProcessing(true);
    setImportProgress(1); // Start immediately with 1%
    setImportErrors([]);
    let importedCount = 0;
    let errorCount = 0;
    const errors: { row: number, message: string }[] = [];

    let upsertQueue: Product[] = [];
    const totalLines = importPreviewData.length;

    // Cache existing products by SKU, Barcode, and Name in O(1) Map for lightning-fast lookups and live updates
    const productBySkuMap = new Map<string, Product>();
    const productByBarcodeMap = new Map<string, Product>();
    const productByNameMap = new Map<string, Product>();
    products.forEach(prod => {
      if (prod.sku) {
        productBySkuMap.set(prod.sku.toLowerCase().trim(), prod);
      }
      if (prod.barcode) {
        productByBarcodeMap.set(prod.barcode.toLowerCase().trim(), prod);
      }
      if (prod.name) {
        productByNameMap.set(prod.name.toLowerCase().trim(), prod);
      }
    });

    // Cache categories by name
    const categoryByNameMap = new Map<string, any>();
    categories.forEach(cat => {
      if (cat.name) {
        categoryByNameMap.set(cat.name.toLowerCase().trim(), cat);
      }
    });

    // Ensure default 'uncategorized' category exists in localDb to avoid foreign key errors on products
    try {
      await localDb.insert('categories/uncategorized', { id: 'uncategorized', name: 'Sans catégorie', level: 1 });
    } catch (err) {
      console.warn('[Import] Failed to insert default category:', err);
    }

    for (let i = 0; i < totalLines; i++) {
      const p = importPreviewData[i];
      const name = p[mapping.name] || p.name;
      const price = p[mapping.price] || p.price;
      
      if (!name || (!price && price !== 0)) {
        errors.push({ row: i + 1, message: 'Nom ou prix de vente manquant' });
        errorCount++;
      } else {
        try {
          const categoryName = p[mapping.category] || p.category || 'Général';
          const category = categoryByNameMap.get(categoryName.toString().toLowerCase().trim());
          const categoryId = category ? category.id : '';

          const skuVal = (p[mapping.sku] || p.sku || '').toString().trim();
          const barcodeVal = (p[mapping.barcode] || p.barcode || '').toString().trim();

          // Get product by either matching SKU, matching Barcode, or crossed lookups
          const existingProductBySku = skuVal ? productBySkuMap.get(skuVal.toLowerCase()) : null;
          const existingProductByBarcode = barcodeVal ? productByBarcodeMap.get(barcodeVal.toLowerCase()) : null;
          const existingProductBySkuAsBarcode = skuVal ? productByBarcodeMap.get(skuVal.toLowerCase()) : null;
          const existingProductByBarcodeAsSku = barcodeVal ? productBySkuMap.get(barcodeVal.toLowerCase()) : null;

          const existingProduct = existingProductBySku || existingProductByBarcode || existingProductBySkuAsBarcode || existingProductByBarcodeAsSku;

          const updatedAt = new Date().toISOString();

          // Safe math conversions to prevent NaN from breaking reports and analytics
          const parsedPrice = parseFloat(price.toString().replace(',', '.').replace(/\s/g, '') || '0');
          const finalPrice = isNaN(parsedPrice) ? 0 : parsedPrice;

          const rawCost = p[mapping.costPrice] || p.costprice || p.cost_price || '0';
          const parsedCost = parseFloat(rawCost.toString().replace(',', '.').replace(/\s/g, '') || '0');
          const finalCost = isNaN(parsedCost) ? 0 : parsedCost;

          const rawStock = p[mapping.stock] || p.stock || '0';
          const parsedStock = parseFloat(rawStock.toString().replace(',', '.').replace(/\s/g, '') || '0');
          const finalStock = isNaN(parsedStock) ? 0 : parsedStock;

          if (existingProduct) {
            const currentStock = parseFloat(existingProduct.stock?.toString() || '0');
            const updatedProduct: Product = {
              ...existingProduct,
              name: name.toString().trim(),
              price: finalPrice,
              costPrice: finalCost,
              stock: currentStock + finalStock,
              categoryId: categoryId || existingProduct.categoryId || '',
              sku: skuVal || existingProduct.sku || `SKU-${generateUniqueId()}`,
              barcode: barcodeVal || existingProduct.barcode || '',
              unit: p[mapping.unit] || p.unit || existingProduct.unit || 'unité',
              updatedAt: updatedAt
            };

            upsertQueue.push(updatedProduct);

            // Dynamically update the lookups maps in real-time to avoid creating duplicates from identical sequential entries in the source file
            productByNameMap.set(updatedProduct.name.toLowerCase().trim(), updatedProduct);
            if (updatedProduct.sku) {
              productBySkuMap.set(updatedProduct.sku.toLowerCase().trim(), updatedProduct);
            }
            if (updatedProduct.barcode) {
              productByBarcodeMap.set(updatedProduct.barcode.toLowerCase().trim(), updatedProduct);
            }
          } else {
            const productId = Math.random().toString(36).substring(2, 11);
            const newProduct: Product = {
              id: productId,
              name: name.toString().trim(),
              price: finalPrice,
              costPrice: finalCost,
              stock: finalStock,
              categoryId: categoryId,
              sku: skuVal || `SKU-${generateUniqueId()}`,
              barcode: barcodeVal || '',
              unit: p[mapping.unit] || p.unit || 'unité',
              status: 'active',
              taxRate: 0,
              minStock: 0,
              supplier: '',
              createdAt: updatedAt,
              updatedAt: updatedAt
            };

            upsertQueue.push(newProduct);

            // Dynamically add to maps to track new creations list instantly
            productByNameMap.set(newProduct.name.toLowerCase().trim(), newProduct);
            if (newProduct.sku) {
              productBySkuMap.set(newProduct.sku.toLowerCase().trim(), newProduct);
            }
            if (newProduct.barcode) {
              productByBarcodeMap.set(newProduct.barcode.toLowerCase().trim(), newProduct);
            }
          }
          importedCount++;
          
          if (upsertQueue.length >= 250) {
            const batchRecords: Record<string, Product> = {};
            upsertQueue.forEach(p => {
              batchRecords[p.id] = p;
            });
            await localDb.insertBatch('products', batchRecords);

            upsertQueue.forEach(item => {
              window.dispatchEvent(new CustomEvent('product-cache-update', { detail: item }));
            });

            upsertQueue = [];
            
            // Periodically update progress bar and yield to browser paint thread
            const currentPercent = Math.min(100, Math.round(((i + 1) / totalLines) * 100));
            setImportProgress(currentPercent);
            if (errors.length > 0) {
              setImportErrors([...errors]);
            }
            // Yield thread for snappy UI response
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        } catch (error) {
          console.error('Error preparing update for product:', p, error);
          errors.push({ row: i + 1, message: error instanceof Error ? error.message : 'Erreur inconnue' });
          errorCount++;
        }
      }
      
      // Prevent running setTimeout on every single line, which slows down execution significantly.
      // Instead, we only yield occasionally based on progress.
      const shouldYield = (i % 250 === 0) || (totalLines < 250 && i % Math.max(1, Math.floor(totalLines / 10)) === 0) || i === totalLines - 1;
      if (shouldYield) {
        const currentPercent = Math.min(100, Math.round(((i + 1) / totalLines) * 100));
        setImportProgress(currentPercent);
        if (errors.length > 0) {
          setImportErrors([...errors]);
        }
        // Small yield so the DOM has a chance to repaint the progress bar
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    if (upsertQueue.length > 0) {
      const batchRecords: Record<string, Product> = {};
      upsertQueue.forEach(p => {
        batchRecords[p.id] = p;
      });
      await localDb.insertBatch('products', batchRecords);

      upsertQueue.forEach(item => {
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: item }));
      });
    }
    
    setImportProgress(100);
    setImportErrors([...errors]);
    setIsProcessing(false);

    if (errorCount === 0) {
      toast.success(`Importation réussie de ${importedCount} produits !`);
      setTimeout(() => {
        setIsImportModalOpen(false);
      }, 1200);
    } else {
      toast.warning(`Importation terminée : ${importedCount} importés, ${errorCount} lignes ignorées (voir détails).`);
    }
  };

  return {
    isProcessing,
    importProgress,
    importErrors,
    executeImport
  };
}
