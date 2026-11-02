import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  subscribeToCartonIntakes, 
  resolveBarcodeOrCarton, 
  getCartonTemplates, 
  CartonTemplate 
} from '../../../services/cartonIntakeService';
import { Product } from '../../../types';

interface UseNewPurchaseHardwareProps {
  products: Product[];
  cartonTemplatesProp?: CartonTemplate[];
  addToCart: (item: any) => void;
  setSearch: (s: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useNewPurchaseHardware({
  products,
  cartonTemplatesProp = [],
  addToCart,
  setSearch,
  searchInputRef
}: UseNewPurchaseHardwareProps) {
  const [lanIp, setLanIp] = useState<string>('');
  const [localCartonTemplates, setLocalCartonTemplates] = useState<CartonTemplate[]>([]);

  // 1. Fetch LAN IP for mobile QR pairing
  useEffect(() => {
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(data => {
        if (data?.ip) setLanIp(data.ip);
      })
      .catch(() => {});
  }, []);

  // 2. Subscribe to carton intakes from mobile app
  useEffect(() => {
    const unsubscribe = subscribeToCartonIntakes((item) => {
      addToCart({
        productId: item.productId,
        productName: item.productName,
        quantity: item.totalUnits,
        costPrice: item.unitCostPrice,
        cartonCount: item.cartonCount,
        unitsPerCarton: item.unitsPerCarton,
        cartonCostPrice: item.cartonCostPrice,
        cartonPhotoUrl: item.cartonPhotoUrl,
        imageUrl: item.cartonPhotoUrl
      });
      toast.success(`📦 Carton reçu du mobile : ${item.productName} (${item.cartonCount} cartons = ${item.totalUnits} pcs) ajouté au panier !`);
    });
    return () => unsubscribe();
  }, [addToCart]);

  // 3. Load carton templates
  useEffect(() => {
    let isMounted = true;
    getCartonTemplates().then(list => {
      if (isMounted && Array.isArray(list)) setLocalCartonTemplates(list);
    });
    return () => { isMounted = false; };
  }, []);

  const effectiveCartonTemplates = cartonTemplatesProp && cartonTemplatesProp.length > 0
    ? cartonTemplatesProp
    : localCartonTemplates;

  // 4. Handle barcode scanning resolution
  const handleExecuteScan = useCallback((rawCode: string): boolean => {
    if (!rawCode || !rawCode.trim()) return false;
    const res = resolveBarcodeOrCarton(rawCode, products, effectiveCartonTemplates);
    if (res?.type === 'carton') {
      addToCart({
        productId: res.product.id,
        productName: res.product.name,
        cartonCount: res.cartonCount,
        unitsPerCarton: res.unitsPerCarton,
        cartonCostPrice: res.cartonCostPrice,
        costPrice: res.unitCostPrice,
        cartonPhotoUrl: res.cartonPhotoUrl,
        imageUrl: res.cartonPhotoUrl || res.product.imageUrl
      });
      setSearch('');
      toast.success(`📦 Carton ajouté : ${res.product.name} (${res.cartonCount} ct × ${res.unitsPerCarton} = ${res.cartonCount * res.unitsPerCarton} pcs)`);
      return true;
    } else if (res?.type === 'product') {
      addToCart({ ...res.product, quantity: res.multiplier || 1 });
      setSearch('');
      toast.success(`Produit ajouté : ${res.product.name}`);
      return true;
    }
    return false;
  }, [products, effectiveCartonTemplates, addToCart, setSearch]);

  // 5. Hardware douchette barcode scanner buffer listener
  const scannerBuffer = useRef<{ text: string; lastTime: number }>({ text: '', lastTime: 0 });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target === searchInputRef.current) return;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (isInput && (target?.getAttribute('type') === 'number' || target?.classList.contains('qty-input') || target?.classList.contains('price-input'))) {
        return;
      }

      const now = Date.now();
      const diff = now - scannerBuffer.current.lastTime;
      if (diff > 150) {
        scannerBuffer.current.text = '';
      }
      scannerBuffer.current.lastTime = now;

      if (e.key === 'Enter') {
        if (scannerBuffer.current.text.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const scanned = scannerBuffer.current.text.trim();
          scannerBuffer.current.text = '';
          const handled = handleExecuteScan(scanned);
          if (!handled) {
            toast.error(`Aucun produit ni carton trouvé pour : ${scanned}`);
          }
        }
      } else if (e.key.length === 1) {
        scannerBuffer.current.text += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleExecuteScan, searchInputRef]);

  return {
    lanIp,
    effectiveCartonTemplates,
    handleExecuteScan
  };
}
