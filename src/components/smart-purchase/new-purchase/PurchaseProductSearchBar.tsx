import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Camera, Package } from 'lucide-react';
import { SafeImage } from '../../ui';
import { Product, CompanySettings } from '../../../types';
import { CartonTemplate } from '../../../services/cartonIntakeService';
import { toast } from 'sonner';

interface PurchaseProductSearchBarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (s: string) => void;
  filteredProducts: Product[];
  effectiveCartonTemplates: CartonTemplate[];
  handleExecuteScan: (code: string) => boolean;
  addToCart: (p: any) => void;
  setIsPurchaseScannerOpen: (v: boolean) => void;
  setEditingProduct: (p: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
  settings: CompanySettings;
}

export const PurchaseProductSearchBar: React.FC<PurchaseProductSearchBarProps> = ({
  searchInputRef,
  search,
  setSearch,
  filteredProducts,
  effectiveCartonTemplates,
  handleExecuteScan,
  addToCart,
  setIsPurchaseScannerOpen,
  setEditingProduct,
  setIsProductModalOpen,
  settings
}) => {
  return (
    <div className="relative">
      <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">
        Recherche Rapide (Nom, SKU, Code-Barres, Carton)
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" size={18} />
        <input 
          ref={searchInputRef}
          type="text" 
          placeholder="SCANNER OU RECHERCHER UN PRODUIT..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = search;
              e.preventDefault();
              e.stopPropagation();
              if (val.trim() !== '') {
                const handled = handleExecuteScan(val);
                if (!handled) {
                  if (filteredProducts.length > 0) {
                    addToCart(filteredProducts[0]);
                    setSearch('');
                  } else {
                    toast.error(`Aucun produit ni carton trouvé pour : ${val}`);
                  }
                }
                
                setTimeout(() => {
                  setSearch('');
                }, 50);
              }
            }
          }}
          className="w-full pl-12 pr-12 py-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
        />
        <button 
          type="button" 
          onClick={() => setIsPurchaseScannerOpen(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-indigo-400 transition-colors"
        >
          <Camera size={20} />
        </button>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {search && filteredProducts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-[100] left-0 right-0 mt-2 bg-industrial-950 border border-industrial-700 rounded-xl shadow-md overflow-hidden max-h-80 overflow-y-auto"
            >
              {filteredProducts.map(p => {
                const cartonTpl = effectiveCartonTemplates.find(t => t.productId === p.id);
                return (
                  <div
                    key={p.id}
                    className="w-full flex items-center gap-4 p-3.5 hover:bg-industrial-800 transition-colors border-b border-industrial-800 last:border-0 text-left group"
                  >
                    <div 
                      className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        addToCart(p);
                        setSearch('');
                      }}
                    >
                      <div className="w-12 h-12 rounded-lg bg-industrial-900 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                        {(() => {
                          const imgSource = (cartonTpl && cartonTpl.cartonPhotoUrl) || p.imageUrl || (p.imageUrls && p.imageUrls[0]) || p.image || '';
                          return imgSource ? (
                            <SafeImage 
                              src={imgSource} 
                              className="w-full h-full object-cover" 
                              fallback={<Package size={20} className="text-industrial-600"/>}
                            />
                          ) : <Package size={20} className="text-industrial-600"/>;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-white uppercase truncate tracking-tight group-hover:text-indigo-400 transition-colors">{p.name}</p>
                          {cartonTpl && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              📦 Carton ({cartonTpl.unitsPerCarton} pcs)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-industrial-500 uppercase tracking-widest">
                          {p.sku || p.id} {cartonTpl?.barcode ? `• Code-barres Carton: ${cartonTpl.barcode}` : (p.barcode ? `• ${p.barcode}` : '')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-indigo-400 font-mono text-xs">{Number(p.costPrice ?? p.price ?? 0).toFixed(2)} {settings?.currency || 'DA'}</p>
                        <p className="text-[10px] font-black text-industrial-600 uppercase">Stock: {p.stock ?? 0}</p>
                      </div>
                    </div>

                    {cartonTpl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            productId: p.id,
                            productName: p.name,
                            cartonCount: 1,
                            unitsPerCarton: cartonTpl.unitsPerCarton,
                            costPrice: cartonTpl.unitCostPrice || p.costPrice || p.price,
                            cartonCostPrice: cartonTpl.cartonCostPrice,
                            cartonPhotoUrl: cartonTpl.cartonPhotoUrl,
                            imageUrl: cartonTpl.cartonPhotoUrl || p.imageUrl
                          });
                          setSearch('');
                          toast.success(`📦 Carton de ${p.name} (${cartonTpl.unitsPerCarton} pcs) ajouté au panier !`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
                      >
                        + 1 Carton ({cartonTpl.unitsPerCarton}u)
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {search && filteredProducts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-[100] left-0 right-0 mt-2 bg-industrial-950 border border-industrial-800 rounded-xl p-6 text-center shadow-md"
            >
              <Package size={32} className="mx-auto text-industrial-600 mb-2" />
              <p className="text-sm font-bold text-industrial-400">Aucun produit trouvé</p>
              <button 
                type="button"
                onClick={() => {
                  setEditingProduct({ name: search, price: 0, costPrice: 0, stock: 0 });
                  setIsProductModalOpen(true);
                  setSearch('');
                }}
                className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                + Créer ce produit
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
