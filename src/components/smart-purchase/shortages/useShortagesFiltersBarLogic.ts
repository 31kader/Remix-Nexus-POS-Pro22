import { useState, useRef, useEffect, useMemo } from 'react';
import { useShortageStore } from '../../../store/useShortageStore';
import { Product, Supplier } from '../../../types';
import { toast } from 'sonner';

/**
 * Bip sonore Web Audio API pour confirmation immédiate de la douchette USB ou de la caméra.
 * 100% hors-ligne, zéro fichier externe.
 */
export function playScannerBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // Note C6 (1046.5 Hz)
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 150);
  } catch (_) {}
}

export function useShortagesFiltersBarLogic(
  products: Product[],
  suppliers: Supplier[],
  onOpenAddCustom?: (barcode?: string) => void
) {
  const searchQuery = useShortageStore(s => s.searchQuery);
  const setSearchQuery = useShortageStore(s => s.setSearchQuery);
  const selectedSupplierFilter = useShortageStore(s => s.selectedSupplierFilter);
  const setSelectedSupplierFilter = useShortageStore(s => s.setSelectedSupplierFilter);
  const activeListId = useShortageStore(s => s.activeListId);
  const addItem = useShortageStore(s => s.addItem);
  const items = useShortageStore(s => s.items);

  const [inputVal, setInputVal] = useState(searchQuery);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  const barcodeProductMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p.barcode) {
        map.set(p.barcode.trim().toLowerCase(), p);
      }
      if (p.sku) {
        map.set(p.sku.trim().toLowerCase(), p);
      }
    }
    return map;
  }, [products]);

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of suppliers) {
      if (s.id && s.name) {
        map.set(s.id, s.name);
      }
    }
    for (const item of items) {
      if (item.supplierId && item.supplierName && !map.has(item.supplierId)) {
        map.set(item.supplierId, item.supplierName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [suppliers, items]);

  const autocompleteSuggestions = useMemo(() => {
    const query = inputVal.trim().toLowerCase();
    if (query.length < 2) return [];

    const existingProductIds = new Set(items.map(i => i.productId));

    return products
      .filter(p => {
        if (p.status === 'inactive' || p.status === 'discontinued') return false;
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBarcode = p.barcode?.toLowerCase().includes(query);
        const matchesSku = p.sku?.toLowerCase().includes(query);
        return matchesName || matchesBarcode || matchesSku;
      })
      .slice(0, 8)
      .map(p => ({
        product: p,
        alreadyInShortages: existingProductIds.has(p.id)
      }));
  }, [inputVal, products, items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProduct = async (product: Product) => {
    playScannerBeep();
    await addItem(
      {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        sku: product.sku,
        imageUrl: product.imageUrl || (product as any).image,
        stock: product.stock,
        minStock: product.minStock,
        costPrice: product.costPrice,
        supplier: product.supplier,
        unit: product.unit
      },
      {
        quantity: 1,
        costPrice: product.costPrice,
        minStock: product.minStock,
        currentStock: product.stock,
        supplierName: product.supplier,
        listId: activeListId !== 'all' ? activeListId : undefined
      }
    );
    toast.success(`"${product.name}" ajouté au cahier des manques`);
    setInputVal('');
    setSearchQuery('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const processBarcodeValue = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const lower = code.toLowerCase();
    const matched = barcodeProductMap.get(lower);

    if (matched) {
      await handleAddProduct(matched);
    } else {
      const candidate = products.find(
        p => p.barcode?.toLowerCase() === lower || p.sku?.toLowerCase() === lower
      );
      if (candidate) {
        await handleAddProduct(candidate);
      } else {
        const existingShortage = items.find(
          i => i.barcode && i.barcode.toLowerCase() === lower
        );
        if (existingShortage) {
          playScannerBeep();
          if (activeListId !== 'all' && !existingShortage.listIds.includes(activeListId)) {
            await useShortageStore.getState().assignItemToList(existingShortage.id, activeListId);
          }
          await useShortageStore.getState().updateItemQuantity(existingShortage.id, existingShortage.quantityNeeded + 1);
          toast.success(`Quantité incrémentée pour "${existingShortage.name}" (+1)`);
          setInputVal('');
          setSearchQuery('');
          return;
        }

        playScannerBeep();
        if (onOpenAddCustom) {
          toast.info(`Article inconnu. Saisie rapide hors-catalogue pour "${code}"`);
          onOpenAddCustom(code);
        } else {
          toast.error(`Aucun article trouvé pour le code : "${code}"`);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteSuggestions.length === 1) {
        handleAddProduct(autocompleteSuggestions[0].product);
      } else {
        processBarcodeValue(inputVal);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleCameraScan = (scannedData: string) => {
    setIsCameraScannerOpen(false);
    processBarcodeValue(scannedData);
  };

  return {
    inputVal,
    setInputVal,
    setSearchQuery,
    selectedSupplierFilter,
    setSelectedSupplierFilter,
    isCameraScannerOpen,
    setIsCameraScannerOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    inputRef,
    dropdownRef,
    supplierOptions,
    autocompleteSuggestions,
    handleAddProduct,
    handleKeyDown,
    handleCameraScan
  };
}
