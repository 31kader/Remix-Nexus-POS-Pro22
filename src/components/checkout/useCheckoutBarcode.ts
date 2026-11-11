import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { playScanSound } from '../../lib/utils';
import { toast } from 'sonner';
import { resolveBarcodeOrCarton, getCartonTemplates, CartonTemplate } from '../../services/cartonIntakeService';

interface UseCheckoutBarcodeProps {
  products: Product[];
  addToCart: (product: Product, quantity?: number, isDistinctScan?: boolean) => void;
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
  const cartonTemplatesRef = useRef<CartonTemplate[]>([]);

  useEffect(() => {
    getCartonTemplates().then(list => {
      if (Array.isArray(list)) cartonTemplatesRef.current = list;
    });
  }, []);

  // Pre-cached O(1) maps of products for 100% exact scan resolution (identical to Inventory scanner)
  const productsCache = useMemo(() => {
    const exactMap = new Map<string, Product>();
    const normalizedMap = new Map<string, Product>();
    const nameMap = new Map<string, Product>();

    const safeProducts = Array.isArray(products) ? products : [];

    safeProducts.forEach((p: Product) => {
      if (!p) return;
      const keys = [p.sku, p.barcode, p.reference, p.id].filter(Boolean) as string[];
      keys.forEach(k => {
        const clean = String(k).trim().toLowerCase();
        if (clean) {
          exactMap.set(clean, p);
          const normalized = clean.replace(/[^a-z0-9]/g, '');
          if (normalized) normalizedMap.set(normalized, p);
        }
      });

      if (p.name) {
        nameMap.set(String(p.name).trim().toLowerCase(), p);
      }
    });

    return {
      exactMap,
      normalizedMap,
      nameMap
    };
  }, [products]);

  const handleBarcodeScan = useCallback((barcode: string, suppressNotFoundToast: boolean = false): boolean => {
    if (!barcode || barcode.trim().length === 0) return false;
    let cleanBarcode = barcode.trim().toLowerCase();
    
    // Support de la saisie de quantité par préfixe scanner (ex: 6*12345678 ou 12*REF01)
    let quantityMultiplier = 1;
    const prefixMatch = cleanBarcode.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (prefixMatch) {
      const parsedQty = parseInt(prefixMatch[1], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        quantityMultiplier = parsedQty;
        cleanBarcode = prefixMatch[2].trim();
      }
    }

    const normalizedBarcode = cleanBarcode.replace(/[^a-z0-9]/g, '');
    playScanSound();

    // 1. Recherche par correspondance exacte (code-barres, SKU, référence, ID)
    let product = productsCache.exactMap.get(cleanBarcode);

    // 2. Recherche normalisée (sans tirets/espaces)
    if (!product && normalizedBarcode) {
      product = productsCache.normalizedMap.get(normalizedBarcode);
    }
    
    // 3. Recherche par nom exact
    if (!product) {
      product = productsCache.nameMap.get(cleanBarcode);
    }

    // 4. Recherche par Carton Template (si le client achète un carton entier en caisse)
    let cartonUnits = 1;
    if (!product) {
      const res = resolveBarcodeOrCarton(barcode, products, cartonTemplatesRef.current);
      if (res?.type === 'carton') {
        product = res.product;
        cartonUnits = res.unitsPerCarton || 1;
      }
    }

    if (product) {
      if (isPriceCheckerOpen) {
        setPriceCheckResult(product);
      } else {
        try {
          const finalQty = (isReturnMode ? -1 : 1) * quantityMultiplier * cartonUnits;
          addToCart(product, finalQty, true);
          if (cartonUnits > 1) {
            toast.success(`📦 Carton scanné : ${product.name} (${finalQty} unités)`);
          } else if (quantityMultiplier > 1) {
            toast.success(`Ajouté : ${quantityMultiplier}x ${product.name}`);
          }
        } catch (error) {
          console.error("Erreur lors de l'ajout au panier:", error);
          toast.error("Erreur d'initialisation du panier. Réessayez.");
        }
        setIsScannerOpen(false);
      }
      return true;
    } else {
      if (!suppressNotFoundToast) {
        toast.error(`Code barres non reconnu: ${barcode}`);
      }
      setIsScannerOpen(false);
      return false;
    }
  }, [productsCache, isPriceCheckerOpen, isReturnMode, addToCart]);

  // Global Barcode Scanner Listener (Zéro-Focus Scan sans vol de curseur)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      
      // Détection des champs de saisie spécifiques
      const isSearchInput = Boolean(
        target?.id === 'product-search-input' ||
        target?.id === 'direct-barcode-input' ||
        target?.getAttribute?.('data-search-input') === 'true' ||
        (typeof target?.closest === 'function' && (target.closest('[data-search-container]') || target.closest('.search-container')))
      );
      const isQuantityOrPriceInput = Boolean(
        target?.classList?.contains?.('qty-input') || 
        target?.classList?.contains?.('price-input') ||
        target?.getAttribute?.('data-quantity-input') === 'true' ||
        target?.getAttribute?.('data-cart-item-id')
      );
      const isTextInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const isModalInput = typeof target?.closest === 'function' && Boolean(target.closest('.modal-content') || target.closest('[role="dialog"]'));

      const now = Date.now();
      const diff = now - scannerBuffer.current.lastTime;
      
      if (e.key === 'Enter') {
        // Ne jamais court-circuiter la barre de recherche produit, les inputs de prix/quantité ou les modales
        if (isSearchInput || isQuantityOrPriceInput || isModalInput) {
          scannerBuffer.current.text = '';
          return;
        }
        if (scannerBuffer.current.text.length >= 2 && diff < 250) {
          // Bloquer immédiatement toute action par défaut (ex: soumission, clic de bouton ou ouverture de menu)
          e.preventDefault();
          e.stopPropagation();
          handleBarcodeScan(scannerBuffer.current.text);
          scannerBuffer.current.text = '';
        } else {
          scannerBuffer.current.text = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Ne pas capturer les frappes dans la barre de recherche produit
        if (isSearchInput) {
          scannerBuffer.current.text = '';
          return;
        }
        // Détection de frappe rapide typique d'une douchette code-barres (< 65ms) ou saisie hors champ texte
        const isFastScan = diff < 65;
        const isNotInModal = !isModalInput && !isQuantityOrPriceInput && (!isTextInput || isFastScan);

        if (isFastScan || isNotInModal) {
          if (diff < 120 || scannerBuffer.current.text === '') {
            scannerBuffer.current.text += e.key;
          } else {
            scannerBuffer.current.text = e.key;
          }
        }
      }
      scannerBuffer.current.lastTime = now;
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleBarcodeScan]);

  // Écoute des codes-barres relayés depuis l'afficheur client (si l'écran client avait le focus)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const bc = new BroadcastChannel('nexus_customer_display');
      bc.onmessage = (event) => {
        if (event.data?.type === 'FORWARD_BARCODE' && event.data?.barcode) {
          handleBarcodeScan(event.data.barcode);
        }
      };
      return () => bc.close();
    } catch (_) {}
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