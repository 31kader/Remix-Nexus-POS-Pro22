import React from 'react';
import { Calendar as CalendarIcon, Percent, RefreshCcw, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Product } from '../../types';

interface ExpiryListViewProps {
  analyzedProducts: any[];
  products: Product[];
  handleApplyPromo: (product: any, percent: number) => void;
  handleRestorePrice: (product: any) => void;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

export function ExpiryListView({
  analyzedProducts,
  products,
  handleApplyPromo,
  handleRestorePrice,
  onEditProduct,
  onAdjustStock
}: ExpiryListViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {analyzedProducts.map((product) => (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={product.id}
            className={cn(
              "group relative bg-white/5 border rounded-3xl p-5 hover:bg-white/[0.08] transition-all",
              product.expiryStatus === 'expired' ? "border-rose-500/30" : 
              product.expiryStatus === 'critical' ? "border-amber-500/30" : "border-white/10"
            )}
          >
            <div className="flex gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border relative group overflow-hidden",
                product.expiryStatus === 'expired' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                product.expiryStatus === 'critical' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
              )}>
                {(product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image) ? (
                  <img 
                    src={product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image} 
                    className="w-full h-full object-cover rounded-2xl" 
                    alt={product.name} 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <CalendarIcon size={24} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-white uppercase tracking-tight text-sm md:text-base break-words line-clamp-3 pr-2 leading-relaxed">{product.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <p className="text-[10px] text-white/40 font-mono font-bold tracking-wider uppercase">{product.sku || 'SANS SKU'}</p>
                      <span className="w-1 h-1 bg-white/15 rounded-full" />
                      <p className="text-[10px] text-white/50 font-black tracking-wider uppercase bg-white/5 px-1.5 py-0.5 rounded-md">Stock: {product.stock} {product.unit || 'unité'}</p>
                      {product.batchNumber && (
                        <>
                          <span className="w-1 h-1 bg-white/15 rounded-full" />
                          <span className="text-[10px] text-indigo-300 font-extrabold tracking-wider uppercase border border-indigo-500/30 px-2 py-0.5 rounded-md bg-indigo-500/10">Lot: {product.batchNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
                    product.expiryStatus === 'expired' ? "bg-rose-500/20 border-rose-500/30 text-rose-400" :
                    product.expiryStatus === 'critical' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
                    "bg-white/5 border-white/10 text-white/40"
                  )}>
                    {product.expiryStatus === 'expired' ? 'Expiré' : `${product.daysLeft} jours`}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">
                      <span>{format(product.expiryDate, 'dd MMMM yyyy', { locale: fr })}</span>
                      <span>{product.price.toLocaleString()} CFA</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, (product.daysLeft / 90) * 100))}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          product.expiryStatus === 'expired' ? "bg-rose-500" :
                          product.expiryStatus === 'critical' ? "bg-amber-500" : "bg-indigo-500"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                   <button 
                    onClick={() => handleApplyPromo(product, 20)}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Percent size={12} /> Promo -20%
                  </button>
                  <button 
                    onClick={() => handleRestorePrice(product)}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCcw size={12} /> Prix Normal
                  </button>
                  <button 
                    onClick={() => {
                      const orig = product.originalId ? products.find((p: any) => p.id === product.originalId) : product;
                      if (orig) onEditProduct(orig);
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest text-white/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={12} /> Modifier
                  </button>
                  <button 
                    onClick={() => {
                      const orig = product.originalId ? products.find((p: any) => p.id === product.originalId) : product;
                      if (orig) onAdjustStock(orig);
                    }}
                    className="bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} /> Jeter / Perte
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {analyzedProducts.length === 0 && (
        <div className="lg:col-span-2 py-20 flex flex-col items-center justify-center text-white/20">
          <CheckCircle2 size={48} className="mb-4" />
          <p className="font-black uppercase tracking-widest text-xs">Aucun produit à risque détecté</p>
        </div>
      )}
    </div>
  );
}
