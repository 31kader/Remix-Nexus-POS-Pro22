import React from 'react';
import { motion } from 'motion/react';
import { 
  Barcode as BarcodeIcon, Tag, Sparkles, CheckCircle2, AlertCircle, Package, Search, ChevronRight, History
} from 'lucide-react';
import { Product, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { getProductPriceDetails, formatCurrencyDA } from './priceUtils';

interface ClientFoundProductCardProps {
  foundProduct: Product;
  categories: Category[];
  brands: Brand[];
  promotions: Promotion[];
  onResetScan: () => void;
}

export const ClientFoundProductCard: React.FC<ClientFoundProductCardProps> = ({
  foundProduct,
  categories,
  brands,
  promotions,
  onResetScan
}) => {
  const priceDetails = getProductPriceDetails(foundProduct, promotions);
  const categoryName = foundProduct?.categoryId 
    ? categories.find(c => c.id === foundProduct.categoryId)?.name || null 
    : null;
  const brandName = foundProduct?.brandId 
    ? brands.find(b => b.id === foundProduct.brandId)?.name || null 
    : null;

  return (
    <motion.div
      key="found-card"
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-5 my-auto"
    >
      {/* Badge Disponibilité */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
          priceDetails.isAvailable 
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        }`}>
          {priceDetails.isAvailable ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              En Rayon / Disponible
            </>
          ) : (
            <>
              <AlertCircle size={13} className="text-amber-400" />
              Rupture Temporaire
            </>
          )}
        </span>

        {priceDetails.hasDiscount && priceDetails.discountLabel && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold animate-pulse">
            <Tag size={12} /> PROMO {priceDetails.discountLabel}
          </span>
        )}
      </div>

      {/* Photo du Produit */}
      <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80 group">
        <SafeImage
          src={foundProduct.imageUrl || foundProduct.image}
          alt={foundProduct.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          fallback={
            <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
              <Package size={48} strokeWidth={1.5} />
              <span className="text-xs text-slate-500">Photo non disponible</span>
            </div>
          }
        />
      </div>

      {/* Nom & Tags */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {categoryName && (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
              {categoryName}
            </span>
          )}
          {brandName && (
            <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">
              {brandName}
            </span>
          )}
        </div>
        <h2 className="text-xl font-black text-white leading-snug">
          {foundProduct.name}
        </h2>
        {foundProduct.barcode && (
          <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <BarcodeIcon size={14} /> {foundProduct.barcode}
          </p>
        )}
      </div>

      {/* Section Prix Public */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-0.5">
            Prix Public TTC
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrencyDA(priceDetails.finalPrice)}
            </span>
            {priceDetails.hasDiscount && (
              <span className="text-base font-semibold text-slate-500 line-through">
                {formatCurrencyDA(priceDetails.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {priceDetails.hasDiscount && priceDetails.savedAmount > 0 && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Économie
            </span>
            <span className="text-sm font-extrabold text-rose-400">
              -{formatCurrencyDA(priceDetails.savedAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Remises par lots / quantités si existantes */}
      {foundProduct.quantityDiscounts && foundProduct.quantityDiscounts.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3 text-xs">
          <span className="font-bold text-indigo-300 block mb-1.5 flex items-center gap-1">
            <Sparkles size={13} /> Offre Prix Spécial par Quantité :
          </span>
          <div className="space-y-1">
            {foundProduct.quantityDiscounts.map((qd, idx) => (
              <div key={idx} className="flex justify-between text-slate-300">
                <span>Dès {qd.minQuantity} articles :</span>
                <span className="font-bold text-indigo-400">{formatCurrencyDA(qd.discountPrice)} / unité</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton Scanner un autre article */}
      <button
        type="button"
        onClick={onResetScan}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer"
      >
        <BarcodeIcon size={18} />
        Scanner un autre article
      </button>
    </motion.div>
  );
};

interface ClientNotFoundCardProps {
  notFoundBarcode: string;
  onResetScan: () => void;
}

export const ClientNotFoundCard: React.FC<ClientNotFoundCardProps> = ({
  notFoundBarcode,
  onResetScan
}) => {
  return (
    <motion.div
      key="not-found-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 text-center my-auto shadow-2xl flex flex-col items-center gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertCircle size={32} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-1">Article non trouvé</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          Le code-barres <span className="font-mono text-rose-300 bg-slate-950 px-2 py-0.5 rounded border border-rose-500/20">{notFoundBarcode}</span> n'est pas encore enregistré dans le magasin.
        </p>
      </div>
      <button
        type="button"
        onClick={onResetScan}
        className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
      >
        Réessayer le scan
      </button>
    </motion.div>
  );
};

interface ClientRecentScansTrayProps {
  recentScans: Product[];
  onSelectProduct: (p: Product) => void;
}

export const ClientRecentScansTray: React.FC<ClientRecentScansTrayProps> = ({
  recentScans,
  onSelectProduct
}) => {
  if (recentScans.length === 0) return null;

  return (
    <div className="shrink-0 pt-2 pb-1 border-t border-slate-800/80 bg-slate-950/80">
      <div className="max-w-lg mx-auto px-4">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mb-2">
          <History size={12} /> Consultations Récentes
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {recentScans.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectProduct(item)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shrink-0 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                <SafeImage
                  src={item.imageUrl || item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  fallback={<Package size={14} className="text-slate-600" />}
                />
              </div>
              <div className="max-w-[120px]">
                <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                <p className="text-[10px] font-semibold text-emerald-400 font-mono">
                  {formatCurrencyDA(item.price)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
