import { useCoreStore } from '../store/useCoreStore';
import { set as idbSet } from 'idb-keyval';
import { useState } from 'react';
import { localDb } from '../services/LocalDatabase';
import { Product } from '../types';
import { generateUniqueId } from '../lib/utils';
import { toast } from 'sonner';

export function parseNumericValue(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = val.toString().trim();
  // Strip currency words (DA, DZD, €, $, etc.) and invalid chars
  str = str.replace(/[^\d.,+\-]/g, '').trim();
  if (!str) return 0;

  // Case 1: Both comma and dot present (e.g. "378,480.00" or "1.250,50")
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastDot > lastComma) {
      // English format: "1,234,567.89" -> strip commas
      str = str.replace(/,/g, '');
    } else {
      // European format: "1.234.567,89" -> strip dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    // Only comma present
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount > 1) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * 🛡️ Règle automatique : Si aucun prix d'achat n'est fourni,
 * le prix d'achat par défaut est fixé à Prix de Vente - 10% (soit 90% du prix de vente).
 */
export function calculateDefaultCostPrice(sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return Number((sellingPrice * 0.9).toFixed(2));
}

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
    setImportProgress(2);
    setImportErrors([]);
    const errors: { row: number, message: string }[] = [];

    const totalLines = importPreviewData.length;
    const allProcessedProducts: Product[] = [];
    const localDbRecords: Record<string, Product> = {};

    // 1. Build lookup maps in O(1) for lightning lookups
    const productBySkuMap = new Map<string, Product>();
    const productByBarcodeMap = new Map<string, Product>();
    const productByNameMap = new Map<string, Product>();
    products.forEach(prod => {
      if (prod.sku) productBySkuMap.set(prod.sku.toLowerCase().trim(), prod);
      if (prod.barcode) productByBarcodeMap.set(prod.barcode.toLowerCase().trim(), prod);
      if (prod.name) productByNameMap.set(prod.name.toLowerCase().trim(), prod);
    });

    const categoryByNameMap = new Map<string, any>();
    categories.forEach(cat => {
      if (cat.name) categoryByNameMap.set(cat.name.toLowerCase().trim(), cat);
    });

    // Ensure default category exists in localDb
    try {
      await localDb.insert('categories/uncategorized', { id: 'uncategorized', name: 'Sans catégorie', level: 1 });
    } catch (err) {
      console.warn('[Import] Default category check:', err);
    }

    const chunkSize = 200;
    const updatedAt = new Date().toISOString();

    for (let i = 0; i < totalLines; i++) {
      const p = importPreviewData[i];
      if (!p) continue;

      const rawName = p[mapping.name] !== undefined ? p[mapping.name] : p.name;
      const rawPrice = p[mapping.price] !== undefined ? p[mapping.price] : p.price;
      const name = (rawName || '').toString().trim();
      
      // Skip empty or total summary rows cleanly
      if (!name) continue;

      const finalPrice = parseNumericValue(rawPrice);
      if (finalPrice <= 0 && rawPrice !== 0 && rawPrice !== '0' && rawPrice !== '0.00') {
        errors.push({ row: i + 1, message: `Prix invalide pour "${name}"` });
        continue;
      }

      try {
        const categoryName = (p[mapping.category] || p.category || 'Général').toString().trim();
        const category = categoryByNameMap.get(categoryName.toLowerCase());
        const categoryId = category ? category.id : '';

        const skuVal = (p[mapping.sku] || p.sku || '').toString().trim();
        const barcodeVal = (p[mapping.barcode] || p.barcode || '').toString().trim();

        const existingProductBySku = skuVal ? productBySkuMap.get(skuVal.toLowerCase()) : null;
        const existingProductByBarcode = barcodeVal ? productByBarcodeMap.get(barcodeVal.toLowerCase()) : null;
        const existingProductBySkuAsBarcode = skuVal ? productByBarcodeMap.get(skuVal.toLowerCase()) : null;
        const existingProductByBarcodeAsSku = barcodeVal ? productBySkuMap.get(barcodeVal.toLowerCase()) : null;
        const existingProductByName = name ? productByNameMap.get(name.toLowerCase()) : null;

        const existingProduct = existingProductBySku || existingProductByBarcode || existingProductBySkuAsBarcode || existingProductByBarcodeAsSku || existingProductByName;

        const rawCost = p[mapping.costPrice] !== undefined ? p[mapping.costPrice] : (p.costPrice || p.costprice || p.cost_price || 0);
        const parsedCost = parseNumericValue(rawCost);
        
        // 🛡️ Règle métier : Si le prix d'achat n'est pas fourni (ou égal à 0),
        // calculer automatiquement : Prix d'Achat = Prix de Vente - 10% (soit 90% du prix de vente)
        const defaultCostFromPrice = calculateDefaultCostPrice(finalPrice);
        const finalCost = parsedCost > 0 ? parsedCost : defaultCostFromPrice;

        const rawStock = p[mapping.stock] !== undefined ? p[mapping.stock] : (p.stock || 0);
        const finalStock = parseNumericValue(rawStock);

        let finalProduct: Product;

        if (existingProduct) {
          const currentStock = Math.max(0, parseFloat(existingProduct.stock?.toString() || '0'));
          const currentCost = Math.max(0, parseFloat(existingProduct.costPrice?.toString() || '0'));
          const addedStock = Math.max(0, finalStock);
          
          // Si le fichier fournit un prix d'achat, l'utiliser. Sinon, conserver le coût existant s'il existe (> 0), sinon appliquer prix de vente - 10%
          const effectiveAddedCost = parsedCost > 0 ? parsedCost : (currentCost > 0 ? currentCost : defaultCostFromPrice);

          let pmpCost = currentCost > 0 ? currentCost : effectiveAddedCost;
          if (currentStock > 0 && currentCost > 0 && addedStock > 0 && parsedCost > 0) {
            pmpCost = Number((((currentStock * currentCost) + (addedStock * parsedCost)) / (currentStock + addedStock)).toFixed(2));
          } else if (effectiveAddedCost > 0) {
            pmpCost = effectiveAddedCost;
          }

          finalProduct = {
            ...existingProduct,
            name: name,
            price: finalPrice,
            costPrice: pmpCost,
            stock: currentStock + finalStock,
            categoryId: categoryId || existingProduct.categoryId || '',
            sku: skuVal || existingProduct.sku || `SKU-${generateUniqueId()}`,
            barcode: barcodeVal || existingProduct.barcode || '',
            unit: (p[mapping.unit] || p.unit || existingProduct.unit || 'unité').toString().trim(),
            updatedAt: updatedAt
          };
        } else {
          const productId = Math.random().toString(36).substring(2, 11);
          finalProduct = {
            id: productId,
            name: name,
            price: finalPrice,
            costPrice: finalCost,
            stock: finalStock,
            categoryId: categoryId,
            sku: skuVal || (barcodeVal ? barcodeVal : `SKU-${generateUniqueId()}`),
            barcode: barcodeVal || (skuVal && /^[0-9]{8,14}$/.test(skuVal) ? skuVal : ''),
            unit: (p[mapping.unit] || p.unit || 'unité').toString().trim(),
            status: 'active',
            taxRate: 0,
            minStock: 0,
            supplier: '',
            createdAt: updatedAt,
            updatedAt: updatedAt
          };
        }

        allProcessedProducts.push(finalProduct);
        localDbRecords[finalProduct.id] = finalProduct;

        // Update maps in memory for fast intra-file deduplication
        productByNameMap.set(finalProduct.name.toLowerCase().trim(), finalProduct);
        if (finalProduct.sku) productBySkuMap.set(finalProduct.sku.toLowerCase().trim(), finalProduct);
        if (finalProduct.barcode) productByBarcodeMap.set(finalProduct.barcode.toLowerCase().trim(), finalProduct);

        // Yield thread smoothly every 200 items for progress animation
        if (i % chunkSize === 0 || i === totalLines - 1) {
          const currentPercent = Math.min(95, Math.round(((i + 1) / totalLines) * 95));
          setImportProgress(currentPercent);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (err: any) {
        errors.push({ row: i + 1, message: err?.message || 'Erreur de traitement' });
      }
    }

    // 2. Perform Single High-Speed LocalDB Batch Write
    if (Object.keys(localDbRecords).length > 0) {
      setImportProgress(98);
      await localDb.insertBatch('products', localDbRecords);

            // 3. Direct Core Store & IndexedDB atomic update
      useCoreStore.getState().setProducts(prev => {
        const map = new Map<string, Product>();
        prev.forEach(p => map.set(p.id, p));
        allProcessedProducts.forEach(p => map.set(p.id, p));
        const merged = Array.from(map.values());
        idbSet('nexus_products_cache', merged).catch(err => console.warn('[IDB Error]', err));
        return merged;
      });
      localStorage.setItem('nexus_has_cached_products', 'true');
      window.dispatchEvent(new CustomEvent('products-batch-upsert', { detail: { products: allProcessedProducts } }));
    }

    setImportProgress(100);
    setImportErrors(errors);
    setIsProcessing(false);

    if (allProcessedProducts.length > 0) {
      toast.success(`${allProcessedProducts.length} produit(s) importé(s) instantanément !`);
      setTimeout(() => {
        setIsImportModalOpen(false);
      }, 400);
    } else {
      toast.error("Aucun produit valide n'a pu être importé.");
    }
  };

  return {
    isProcessing,
    importProgress,
    importErrors,
    executeImport
  };
}
