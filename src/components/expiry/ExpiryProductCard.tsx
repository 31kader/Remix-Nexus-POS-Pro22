import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Percent, 
  Edit2, 
  Trash2, 
  ZoomIn, 
  CalendarPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Product } from '../../types';
import { SafeImage } from '../ui';

interface ExpiryProductCardProps {
  product: any;
  allProducts: Product[];
  setPreviewImage: (img: { url: string; title: string; sku?: string } | null) => void;
  setQuickDateProduct: (p: any | null) => void;
  setModalDate: (d: string) => void;
  setModalBatch: (b: string) => void;
  handleApplyPromo: (product: any, percent: number) => void;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

export function ExpiryProductCard({
  product,
  allProducts,
  setPreviewImage,
  setQuickDateProduct,
  setModalDate,
  setModalBatch,
  handleApplyPromo,
  onEditProduct,
  onAdjustStock
}: ExpiryProductCardProps) {
  const productImg = product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={product.id}
      className={cn(
        "group relative bg-white/5 border rounded-xl p-5 hover:bg-white/[0.08] transition-all",
        product.expiryStatus === 'expired' ? "border-rose-500/40 bg-rose-500/[0.03]" : 
        product.expiryStatus === 'critical' ? "border-amber-500/40 bg-amber-500/[0.03]" : 
        product.expiryStatus === 'warning' ? "border-indigo-500/30" :
        !product.hasExpiryDate ? "border-dashed border-white/20" : "border-white/10"
      )}
    >
      <div className="flex gap-4">
        {/* Miniature Produit avec Clic pour Agrandir */}
        <div 
          onClick={() => {
            if (productImg) {
              setPreviewImage({ url: productImg, title: product.name, sku: product.sku });
            }
          }}
          className={cn(
            "w-20 h-20 rounded-xl flex items-center justify-center shrink-0 border relative group/img overflow-hidden cursor-pointer shadow-lg transition-transform hover:scale-105",
            product.expiryStatus === 'expired' ? "bg-rose-500/10 border-rose-500/30 text-rose-500" :
            product.expiryStatus === 'critical' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : 
            "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
          )}
          title={productImg ? "Cliquer pour agrandir l'image" : "Aucune image"}
        >
          {productImg ? (
            <>
              <SafeImage 
                src={productImg} 
                className="w-full h-full object-cover rounded-xl transition-all group-hover/img:scale-110" 
                alt={product.name} 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <ZoomIn size={20} className="text-white drop-shadow-md" />
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">Agrandir</span>
              </div>
            </>
          ) : (
            <CalendarIcon size={28} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-white uppercase tracking-tight text-sm md:text-base break-words line-clamp-2 pr-2 leading-relaxed">
                {product.name}
              </h4>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <p className="text-[10px] text-white/40 font-mono font-bold tracking-wider uppercase">{product.sku || 'SANS SKU'}</p>
                <span className="w-1 h-1 bg-white/15 rounded-full" />
                <p className="text-[10px] text-white/60 font-black tracking-wider uppercase bg-white/5 px-2 py-0.5 rounded-md">
                  Stock: {product.stock} {product.unit || 'unité'}
                </p>
                {product.batchNumber && (
                  <>
                    <span className="w-1 h-1 bg-white/15 rounded-full" />
                    <span className="text-[10px] text-indigo-300 font-extrabold tracking-wider uppercase border border-indigo-500/30 px-2 py-0.5 rounded-md bg-indigo-500/10">
                      Lot: {product.batchNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Badge Statut */}
            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border shrink-0",
              product.expiryStatus === 'expired' ? "bg-rose-500/20 border-rose-500/40 text-rose-400 font-extrabold" :
              product.expiryStatus === 'critical' ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-extrabold animate-pulse" :
              product.expiryStatus === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-300/80" :
              product.hasExpiryDate ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              "bg-white/5 border-white/10 text-white/40"
            )}>
              {product.expiryStatus === 'expired' ? 'Expiré' : 
               product.expiryStatus === 'critical' ? `${product.daysLeft} jours (Urgent)` :
               product.expiryStatus === 'warning' ? `${product.daysLeft} jours` :
               product.hasExpiryDate ? `${product.daysLeft} jours` :
               'Sans Date'}
            </div>
          </div>

          {/* Ligne Date et Prix */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">
                <span>
                  {product.hasExpiryDate && product.expiryDate 
                    ? format(product.expiryDate, 'dd MMMM yyyy', { locale: fr })
                    : 'Date non définie'}
                </span>
                <span className="text-white font-extrabold">{Number(product.price || 0).toLocaleString()} DA</span>
              </div>
              {product.hasExpiryDate && (
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
              )}
            </div>
          </div>

          {/* Actions Rapides */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button 
              type="button"
              onClick={() => {
                setQuickDateProduct(product);
                setModalDate(product.expirationDate ? format(product.expiryDate || new Date(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                setModalBatch(product.batchNumber || '');
              }}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CalendarPlus size={12} /> {product.hasExpiryDate ? 'Changer Date' : '+ Définir Date'}
            </button>

            <button 
              type="button"
              onClick={() => handleApplyPromo(product, 20)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Percent size={12} /> Promo -20%
            </button>
            
            <button 
              type="button"
              onClick={() => {
                const orig = product.originalId ? allProducts.find((p: any) => p.id === product.originalId) : product;
                if (orig) onEditProduct(orig);
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider text-white/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit2 size={12} /> Modifier
            </button>

            <button 
              type="button"
              onClick={() => {
                const orig = product.originalId ? allProducts.find((p: any) => p.id === product.originalId) : product;
                if (orig) onAdjustStock(orig);
              }}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={12} /> Jeter / Perte
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
