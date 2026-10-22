import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Camera, X, Plus, Package, 
  Building2, Barcode, CheckCircle2, PackagePlus 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { Product, Supplier } from '../../../types';
import { BarcodeScanner } from '../../BarcodeScanner';
import { Button } from '../../ui';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface ShortagesFiltersBarProps {
  products: Product[];
  suppliers: Supplier[];
  onOpenAddCustom?: (barcode?: string) => void;
}

/**
 * Bip sonore Web Audio API pour confirmation immédiate de la douchette USB ou de la caméra.
 * 100% hors-ligne, zéro fichier externe.
 */
function playScannerBeep() {
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

export const ShortagesFiltersBar: React.FC<ShortagesFiltersBarProps> = ({
  products,
  suppliers,
  onOpenAddCustom
}) => {
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

  // Synchronisation avec l'état global si modifié de l'extérieur
  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Indexation O(1) des produits par code-barres et SKU
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

  // Liste des fournisseurs uniques ayant des articles ou existant dans le catalogue
  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    // Fournisseurs officiels
    for (const s of suppliers) {
      if (s.id && s.name) {
        map.set(s.id, s.name);
      }
    }
    // Fournisseurs mentionnés dans les articles du cahier des manques
    for (const item of items) {
      if (item.supplierId && item.supplierName && !map.has(item.supplierId)) {
        map.set(item.supplierId, item.supplierName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [suppliers, items]);

  // Suggestions d'autocomplétion (catalogue)
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

  // Fermeture du dropdown lors d'un clic en dehors
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

  // Handler d'ajout d'un produit
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

  // Traitement d'un scan ou code entré (douchette USB)
  const processBarcodeValue = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const lower = code.toLowerCase();
    const matched = barcodeProductMap.get(lower);

    if (matched) {
      await handleAddProduct(matched);
    } else {
      // Tentative de recherche partielle
      const candidate = products.find(
        p => p.barcode?.toLowerCase() === lower || p.sku?.toLowerCase() === lower
      );
      if (candidate) {
        await handleAddProduct(candidate);
      } else {
        // Vérifier si un article hors-catalogue existe déjà dans le cahier des manques
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

        // Si le code n'est pas dans le catalogue, ouvrir l'invite d'ajout hors-catalogue
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

  // Écouteur clavier pour la douchette USB
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Si une suggestion unique est affichée, la sélectionner
      if (autocompleteSuggestions.length === 1) {
        handleAddProduct(autocompleteSuggestions[0].product);
      } else {
        processBarcodeValue(inputVal);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Gestion du scan caméra
  const handleCameraScan = (scannedData: string) => {
    setIsCameraScannerOpen(false);
    processBarcodeValue(scannedData);
  };

  return (
    <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-industrial-900/60 p-3.5 rounded-2xl border border-industrial-800 shadow-md">
      {/* 1. Champ de Recherche Textuelle & Douchette USB */}
      <div className="relative flex-1">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-industrial-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              const val = e.target.value;
              setInputVal(val);
              setSearchQuery(val);
              setIsDropdownOpen(val.trim().length >= 2);
            }}
            onFocus={() => {
              if (inputVal.trim().length >= 2) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher ou scanner code-barres (douchette USB)..."
            className="w-full bg-industrial-950 border border-industrial-700/80 rounded-xl pl-10 pr-24 py-2.5 text-sm text-white placeholder-industrial-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />

          {/* Boutons d'action dans l'input (Effacer + Caméra) */}
          <div className="absolute right-2 flex items-center gap-1">
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchQuery('');
                  setIsDropdownOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
                title="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1 text-xs font-bold"
              title="Scanner via la caméra"
            >
              <Camera size={15} />
            </button>
          </div>
        </div>

        {/* Panneau déroulant d'autocomplétion (Suggestions du catalogue) */}
        {isDropdownOpen && autocompleteSuggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2 bg-industrial-950 border border-industrial-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="px-3 py-2 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between text-[11px] font-mono text-industrial-400">
              <span>Articles du catalogue correspondants ({autocompleteSuggestions.length})</span>
              <span className="text-[10px] text-industrial-500">Appuyez sur Entrée ou cliquez pour ajouter</span>
            </div>

            <div className="divide-y divide-industrial-800/60">
              {autocompleteSuggestions.map(({ product, alreadyInShortages }) => (
                <div
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-industrial-900/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-industrial-900 border border-industrial-800 flex items-center justify-center shrink-0 text-industrial-400">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-industrial-400">
                        {product.barcode && (
                          <span className="flex items-center gap-1">
                            <Barcode size={10} /> {product.barcode}
                          </span>
                        )}
                        <span>•</span>
                        <span>Stock: {product.stock || 0}</span>
                        <span>•</span>
                        <span>Coût: {Number(product.costPrice || 0).toLocaleString('fr-DZ')} DA</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alreadyInShortages ? (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold">
                        Déjà présent (+1)
                      </span>
                    ) : (
                      <span className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Plus size={14} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Filtre par Fournisseur */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center">
          <Building2 size={15} className="absolute left-3 text-industrial-400 pointer-events-none" />
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tous les fournisseurs</option>
            {supplierOptions.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
          <Filter size={12} className="absolute right-3 text-industrial-500 pointer-events-none" />
        </div>

        {selectedSupplierFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedSupplierFilter('all')}
            className="p-2 rounded-xl bg-industrial-950 border border-industrial-700 text-industrial-400 hover:text-white hover:border-industrial-600 transition-all text-xs"
            title="Réinitialiser le filtre fournisseur"
          >
            <X size={14} />
          </button>
        )}

        {/* 3. Bouton "+ Produit Hors-Catalogue" */}
        {onOpenAddCustom && (
          <Button
            type="button"
            onClick={() => onOpenAddCustom()}
            className="shrink-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Noter un produit manquant qui n'existe pas dans le catalogue"
          >
            <PackagePlus size={15} className="text-amber-400" />
            <span className="hidden md:inline">Hors-Catalogue</span>
            <span className="md:hidden">+ Libre</span>
          </Button>
        )}
      </div>

      {/* 3. Modal Scanner Caméra */}
      {isCameraScannerOpen && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setIsCameraScannerOpen(false)}
        />
      )}
    </div>
  );
};
