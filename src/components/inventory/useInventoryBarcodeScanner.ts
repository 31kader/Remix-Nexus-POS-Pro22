import { useMemo, useState } from 'react';
import { Product } from '../../types';

export function useInventoryBarcodeScanner(products: Product[], setEditingProduct: any, setIsProductModalOpen: any, setSearch: any) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // O(1) Speed Index for Barcode Scanning - High Performance
  const productsIndexMap = useMemo(() => {
    const map = new Map<string, Product>();
    const normalizedMap = new Map<string, Product>();

    products.forEach(p => {
      const keys = [p.sku, p.barcode, p.reference, p.id].filter(Boolean) as string[];
      keys.forEach(k => {
        const clean = k.trim().toLowerCase();
        map.set(clean, p);
        const normalized = clean.replace(/[^a-z0-9]/g, '');
        if (normalized) normalizedMap.set(normalized, p);
      });
    });
    return { exact: map, normalized: normalizedMap };
  }, [products]);

  const handleBarcodeScan = (barcode: string) => {
    if (!barcode) return;
    const cleanBarcode = barcode.trim().toLowerCase();
    const normalizedBarcode = cleanBarcode.replace(/[^a-z0-9]/g, '');
    
    // O(1) Lookup instead of nested loop searches
    const product = productsIndexMap.exact.get(cleanBarcode) || productsIndexMap.normalized.get(normalizedBarcode);
    
    if (product) {
      setSearch(barcode);
      setIsScannerOpen(false);
      setEditingProduct(product);
      setIsProductModalOpen(true);
    } else {
      setSearch(barcode);
      setIsScannerOpen(false);
      // Removed the location.reload() or anything that causes refresh
    }
  };

  return { isScannerOpen, setIsScannerOpen, handleBarcodeScan };
}
