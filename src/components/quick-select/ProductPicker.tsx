import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Product } from '../../types';
import { Package, Search, X, Check, Loader2, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../ui/SafeImage';

interface ProductPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  toggleFavorite: (p: Product) => void;
  isFav: (p: Product) => boolean;
}

const PAGE_SIZE = 50;

export const ProductPicker: React.FC<ProductPickerProps> = ({ 
  isOpen, onClose, currency, toggleFavorite, isFav 
}) => {
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerResults, setPickerResults] = useState<Product[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPage, setPickerPage] = useState(0);
  const [hasMorePicker, setHasMorePicker] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchPickerResults = async (page: number, append = false, currentSearch = pickerSearch) => {
    if (currentSearch.length < 2 && currentSearch.length !== 0 && !append) {
      setPickerResults([]);
      return;
    }
    if (append) setIsLoadingMore(true);
    else setPickerLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('products')
        .select('id, name, price, cost_price, stock, min_stock, unit, image_url, category_id, sku, status, tax_rate, show_in_pos, is_quick_select, updated_at')
        .order('name', { ascending: true })
        .range(from, to);
      if (currentSearch) query = query.ilike('name', `%${currentSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      const mappedResults: Product[] = (data || []).map((p: any) => ({
        id: p.id, name: p.name, price: p.price, costPrice: p.cost_price, stock: p.stock,
        minStock: p.min_stock || 0, unit: p.unit, imageUrl: p.image_url, categoryId: p.category_id,
        sku: p.sku, status: p.status, taxRate: p.tax_rate, showInPos: p.show_in_pos,
        isQuickSelect: p.is_quick_select, updatedAt: p.updated_at
      }));
      setPickerResults(prev => append ? [...prev, ...mappedResults] : mappedResults);
      setHasMorePicker(mappedResults.length === PAGE_SIZE);
      setPickerPage(page);
    } catch (err) { console.error('Picker search error:', err); }
    finally { setPickerLoading(false); setIsLoadingMore(false); }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = setTimeout(() => fetchPickerResults(0, false, pickerSearch), 300);
    return () => clearTimeout(timeoutId);
  }, [pickerSearch, isOpen]);

  const loadMorePicker = () => { if (!isLoadingMore && hasMorePicker) fetchPickerResults(pickerPage + 1, true); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Selection Rapide</h3>
              <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mt-0.5">Optimisé pour la vitesse</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-rose-500 hover:text-white flex items-center justify-center border border-white/5 transition-all shadow-lg">
              <X size={20} />
            </button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <input
              autoFocus
              type="text"
              placeholder="Scanner ou rechercher (50 par 50)..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] pl-16 pr-8 py-5 text-sm text-white placeholder:text-white/20 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all outline-none shadow-2xl"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 pb-10">
            {pickerLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-5">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : pickerResults.length > 0 ? (
              <>
                {pickerResults.map(p => (
                  <button key={p.id} onClick={() => toggleFavorite(p)} className={cn("w-full flex items-center gap-4 p-4 rounded-3xl transition-all border group", isFav(p) ? "bg-amber-500/20 border-amber-500/40 text-white" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/[0.08] hover:border-amber-500/20 h-20")}>
                    <div className={cn("w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border transition-all overflow-hidden", isFav(p) ? "bg-amber-500 border-amber-400" : "bg-black/40 border-white/5")}>
                      {isFav(p) ? <Check size={24} className="text-white" /> : <SafeImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" fallback={<Package size={24} />} />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-black uppercase truncate group-hover:text-white transition-colors">{p.name}</div>
                      <div className="text-[10px] font-mono opacity-40 mt-0.5 tracking-tighter">{p.sku || 'SANS SKU'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className="text-sm font-black text-white italic whitespace-nowrap">{p.price.toLocaleString()} {currency}</div>
                      <div className={cn("text-[9px] font-black mt-1 uppercase tracking-widest transition-colors", isFav(p) ? "text-amber-500" : "text-white/30 group-hover:text-amber-500")}>
                        {isFav(p) ? 'FAVORI ✓' : 'AJOUTER +'}
                      </div>
                    </div>
                  </button>
                ))}
                {hasMorePicker && (
                  <div className="h-20 flex items-center justify-center" ref={(el) => { if (el) { const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !isLoadingMore) loadMorePicker(); }, { threshold: 1.0 }); observer.observe(el); return () => observer.disconnect(); } }}>
                    {isLoadingMore ? <Loader2 className="w-8 h-8 animate-spin text-amber-500" /> : <div className="h-1 w-1" />}
                  </div>
                )}
              </>
            ) : pickerSearch ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-20 transform scale-75">
                <Search size={64} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.4em]">Pas d'articles trouvés</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 opacity-20 text-center px-12">
                <Star size={80} className="mb-6 animate-pulse text-amber-500" />
                <p className="text-xs font-black uppercase tracking-[0.3em] leading-relaxed">Saisissez le nom d'un article pour l'ajouter aux favoris.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
