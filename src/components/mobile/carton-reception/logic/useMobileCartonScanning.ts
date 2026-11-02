import { useEffect, useCallback } from 'react';
import { Product } from '../../../../types';
import { resolveBarcodeOrCarton, CartonTemplate } from '../../../../services/cartonIntakeService';
import { toast } from 'sonner';

interface UseMobileCartonScanningProps {
  effectiveProducts: Product[];
  savedTemplates: CartonTemplate[];
  handleSelectProduct: (p: Product) => void;
  setUnitsPerCarton: (u: number) => void;
  setCartonCostPrice: (c: number) => void;
  setUnitCostPrice: (u: number) => void;
  setCartonPhoto: (url: string) => void;
  setSearchQuery: (s: string) => void;
  setQuickBarcode: (b: string) => void;
  setQuickName: (n: string) => void;
  setIsScannerOpen: (open: boolean) => void;
}

export function useMobileCartonScanning({
  effectiveProducts,
  savedTemplates,
  handleSelectProduct,
  setUnitsPerCarton,
  setCartonCostPrice,
  setUnitCostPrice,
  setCartonPhoto,
  setSearchQuery,
  setQuickBarcode,
  setQuickName,
  setIsScannerOpen
}: UseMobileCartonScanningProps) {
  const handleBarcodeScan = useCallback(async (barcodeData: string) => {
    if (!barcodeData) return;
    const clean = barcodeData.trim();
    setIsScannerOpen(false);

    const res = resolveBarcodeOrCarton(clean, effectiveProducts, savedTemplates);

    if (res?.type === 'carton') {
      handleSelectProduct(res.product);
      setUnitsPerCarton(res.unitsPerCarton);
      setCartonCostPrice(res.cartonCostPrice);
      setUnitCostPrice(res.unitCostPrice);
      if (res.cartonPhotoUrl) {
        setCartonPhoto(res.cartonPhotoUrl);
      }
      setSearchQuery('');
      toast.success(`🎯 Carton reconnu : ${res.product.name} (${res.unitsPerCarton} pcs/ct)`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      return;
    }

    if (res?.type === 'product') {
      handleSelectProduct(res.product);
      setSearchQuery('');
      toast.success(`🎯 Produit reconnu : ${res.product.name}`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      return;
    }

    setSearchQuery(clean);
    setQuickBarcode(clean);
    setQuickName(clean);
    toast.info(`Code scanné : ${clean}. Aucun article ni carton associé trouvé.`);
  }, [effectiveProducts, savedTemplates, handleSelectProduct, setCartonPhoto, setQuickBarcode, setQuickName, setIsScannerOpen, setSearchQuery, setUnitsPerCarton, setCartonCostPrice, setUnitCostPrice]);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScan]);

  return { handleBarcodeScan };
}
