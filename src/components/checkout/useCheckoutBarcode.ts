import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { playScanSound } from '../../lib/utils';
import { toast } from 'sonner';

interface UseCheckoutBarcodeProps {
  products: Product[];
  addToCart: (product: Product, quantity: number) => void;
  isReturnMode: boolean;
}

export function useCheckoutBarcode({
  products,
  addToCart,
  isReturnMode,
}: UseCheckoutBarcodeProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false);
  const [priceCheckResult, setPriceCheckResult] = useState<Product | null>(null);
  
  const scannerBuffer = useRef<{ text: string, lastTime: number }>({ text: '', lastTime: 0 });

  // Pre-cached O(1) maps of products for lightning fast scan/search resolution
  const productsCache = useMemo(() => {
    const exactMap = new Map<string, Product>();
    const normalizedMap = new Map<string, Product>();
    const nameMap = new Map<string, Product>();

    // 🛡️ SÉCURITÉ : Protection si la liste des produits est undefined
    const safeProducts = Array.isArray(products) ? products : [];

    safeProducts.forEach((p: Product) => {
      if (!p) return;
      // 1. Exact matches (sku, barcode, reference, id)
      if (p.sku) exactMap.set(String(p.sku).trim().toLowerCase(), p);
      if (p.barcode) exactMap.set(String(p.barcode).trim().toLowerCase(), p);
      if (p.reference) exactMap.set(String(p.reference).trim().toLowerCase(), p);
      if (p.id) exactMap.set(String(p.id).trim().toLowerCase(), p);

      // 2. Normalized matches
      if (p.sku) normalizedMap.set(String(p.sku).replace(/[^a-z0-9]/g, '').toLowerCase(), p);
      if (p.barcode) normalizedMap.set(String(p.barcode).replace(/[^a-z0-9]/g, '').toLowerCase(), p);
      if (p.reference) normalizedMap.set(String(p.reference).replace(/[^a-z0-9]/g, '').toLowerCase(), p);

      // 3. Name matches
      if (p.name) nameMap.set(String(p.name).trim().toLowerCase(), p);
    });

    return {
      exactMap,
      normalizedMap,
      nameMap
    };
  }, [products]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode || barcode.trim().length === 0) return;
    const cleanBarcode = barcode.trim().toLowerCase();
    const normalizedBarcode = cleanBarcode.replace(/[^a-z0-9]/g, '');
    playScanSound();

    let product = productsCache.exactMap.get(cleanBarcode);

    if (!product && normalizedBarcode) {
      product = productsCache.normalizedMap.get(normalizedBarcode);
    }
    
    if (!product) {
      product = productsCache.nameMap.get(cleanBarcode);
    }
    
    if (!product && normalizedBarcode.length >= 6) {
      const safeProducts = Array.isArray(products) ? products : [];
      product = safeProducts.find((p: Product) => 
        p && (
          (p.sku && String(p.sku).toLowerCase().endsWith(normalizedBarcode)) ||
          (p.barcode && String(p.barcode).toLowerCase().endsWith(normalizedBarcode))
        )
      );
    }

    if (product) {
      if (isPriceCheckerOpen) {
        setPriceCheckResult(product);
      } else {
        // 🛡️ SÉCURITÉ : Encapsulation dans un try-catch pour intercepter le crash de addToCart
        try {
          addToCart(product, isReturnMode ? -1 : 1);
        } catch (error) {
          console.error("Erreur lors de l'ajout au panier:", error);
          toast.error("Erreur d'initialisation du panier. Réessayez.");
        }
        setIsScannerOpen(false);
      }
    } else {
      toast.error(`Code barres non reconnu: ${barcode}`);
      setIsScannerOpen(false);
    }
  }, [products, productsCache, isPriceCheckerOpen, isReturnMode, addToCart]);

  // Global Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      
      const now = Date.now();
      const diff = now - scannerBuffer.current.lastTime;
      
      if (e.key === 'Enter') {
        if (scannerBuffer.current.text.length >= 2 && diff < 200) {
          handleBarcodeScan(scannerBuffer.current.text);
          scannerBuffer.current.text = '';
        } else {
          scannerBuffer.current.text = '';
        }
      } else if (e.key.length === 1) {
        if (diff < 150 || scannerBuffer.current.text === '') {
          scannerBuffer.current.text += e.key;
        } else {
          scannerBuffer.current.text = e.key;
        }
      }
      scannerBuffer.current.lastTime = now;
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleBarcodeScan]);

  return {
    isScannerOpen,
    setIsScannerOpen,
    isPriceCheckerOpen,
    setIsPriceCheckerOpen,
    priceCheckResult,
    setPriceCheckResult,
    handleBarcodeScan,
    scannerBuffer
  };
}