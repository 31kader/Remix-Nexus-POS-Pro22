import React, { useMemo, useState } from 'react';
import { 
  X, Sparkles, Plus, CheckCircle2, AlertTriangle, 
  XCircle, Package, Building2, Barcode, ShoppingBag 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { Product, Purchase, Supplier } from '../../../types';
import { ShortageItem } from '../../../types/shortages';
import { SafeImage } from '../../ui/SafeImage';
import { Button } from '../../ui';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface ShortageSuggestionsDrawerProps {
  products: Product[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShortageSuggestionsDrawer: React.FC<ShortageSuggestionsDrawerProps> = ({
  products,
  purchases = [],
  suppliers = [],
  isOpen,
  onClose
}) => {
  const detectLowStockProducts = useShortageStore(s => s.detectLowStockProducts);
  const addAllSuggested = useShortageStore(s => s.addAllSuggested);
  const addItem = useShortageStore(s => s.addItem);
  const items = useShortageStore(s => s.items);

  const [drawerSearch, setDrawerSearch] = useState('');
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Calcul des suggestions dynamiques selon les stocks actuels et les bons d'achat
  const suggestions = useMemo(() => {
    if (!isOpen) return [];
    return detectLowStockProducts(products, purchases, suppliers);
  }, [isOpen, products, purchases, suppliers, items, detectLowStockProducts]);

  // Filtrage local dans le tiroir si recherche
  const filteredSuggestions = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.barcode?.toLowerCase().includes(q) ||
      s.supplierName?.toLowerCase().includes(q) ||
      s.sku?.toLowerCase().includes(q)
    );
  }, [suggestions, drawerSearch]);

  if (!isOpen) return null;

  const handleAddSingle = async (suggestion: ShortageItem) => {
    await addItem(
      {
        id: suggestion.productId,
        name: suggestion.name,
        barcode: suggestion.barcode,
        sku: suggestion.sku,
        imageUrl: suggestion.imageUrl,
        stock: suggestion.currentStock,
        minStock: suggestion.minStock,
        costPrice: suggestion.costPrice,
        supplier: suggestion.supplierName,
        unit: suggestion.unit
      },
      {
        quantity: suggestion.quantityNeeded,
        costPrice: suggestion.costPrice,
        currentStock: suggestion.currentStock,
        minStock: suggestion.minStock,
        supplierId: suggestion.supplierId,
        supplierName: suggestion.supplierName
      }
    );
    toast.success(`"${suggestion.name}" ajouté avec succès`);
  };

  const handleAddAll = async () => {
    if (suggestions.length === 0) return;
    setIsAddingAll(true);
    try {
      await addAllSuggested(suggestions);
      toast.success(`${suggestions.length} article(s) suggéré(s) ajouté(s) au Cahier des Manques`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ajout en masse des suggestions");
    } finally {
      setIsAddingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Fond sombre transparent (Backdrop) */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Tiroir coulissant latéral droit */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-industrial-950 border-l border-industrial-800 shadow-2xl flex flex-col pb-[max(env(safe-area-inset-bottom,0px),16px)]">
          {/* En-tête du Tiroir */}
          <div className="p-5 border-b border-industrial-800 flex items-center justify-between bg-industrial-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Suggestions de Réassort
                </h3>
                <p className="text-xs text-industrial-400 font-mono">
                  Articles en rupture ou sous le seuil d'alerte
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Synthèse & Action en lot */}
          <div className="p-4 bg-industrial-900/30 border-b border-industrial-800 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-industrial-400">
                Détection automatique :
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                {suggestions.length} article(s) à réapprovisionner
              </span>
            </div>

            {/* Champ de filtre rapide interne au tiroir si plusieurs articles */}
            {suggestions.length > 5 && (
              <input
                type="text"
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                placeholder="Filtrer dans les suggestions..."
                className="w-full bg-industrial-950 border border-industrial-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-industrial-500 font-mono focus:outline-none focus:border-indigo-500"
              />
            )}

            {/* Bouton Tout Ajouter */}
            <Button
              type="button"
              disabled={suggestions.length === 0 || isAddingAll}
              onClick={handleAddAll}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>
                {isAddingAll 
                  ? 'Ajout en cours...' 
                  : `Tout ajouter au Cahier (${suggestions.length})`}
              </span>
            </Button>
          </div>

          {/* Liste défilante des suggestions */}
          <div className="flex-1 overflow-y-auto divide-y divide-industrial-800/60 p-4 space-y-3">
            {filteredSuggestions.length === 0 ? (
              <div className="py-16 text-center text-industrial-500 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-industrial-900 border border-industrial-800 flex items-center justify-center mx-auto text-industrial-600">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-white">Aucune rupture détectée</p>
                <p className="text-xs font-mono text-industrial-400 max-w-xs mx-auto">
                  Tous les articles du catalogue disposent actuellement d'un stock supérieur à leur seuil minimal ou sont déjà intégrés au cahier des manques.
                </p>
              </div>
            ) : (
              filteredSuggestions.map((suggestion) => {
                const isOutOfStock = suggestion.currentStock <= 0;
                return (
                  <div
                    key={suggestion.productId}
                    className="bg-industrial-900/60 border border-industrial-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-industrial-700 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-industrial-800 bg-industrial-950 shrink-0 flex items-center justify-center">
                        <SafeImage
                          src={suggestion.imageUrl}
                          alt={suggestion.name}
                          fallback={<Package size={18} className="text-industrial-500" />}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                          optimizeWidth={64}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {suggestion.name}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono">
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <XCircle size={10} /> Rupture (0 en stock)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle size={10} /> {suggestion.currentStock} / min {suggestion.minStock}
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-industrial-400 truncate max-w-[100px]">
                            {suggestion.supplierName}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-industrial-400 mt-0.5">
                          Quantité suggérée : <strong className="text-white">+{suggestion.quantityNeeded}</strong> {suggestion.unit || 'pcs'}
                          {suggestion.costPrice > 0 && (
                            <span className="text-industrial-500"> ({Number(suggestion.costPrice).toLocaleString('fr-DZ')} DA)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSingle(suggestion)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 transition-all shrink-0"
                      title="Ajouter au Cahier des Manques"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied du tiroir */}
          <div className="p-4 border-t border-industrial-800 bg-industrial-900/60 flex items-center justify-between">
            <span className="text-xs text-industrial-400 font-mono">
              Nexus POS Pro Auto-Stock
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs px-4 py-1.5"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
