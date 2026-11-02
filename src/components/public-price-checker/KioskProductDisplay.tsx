import React from 'react';
import { motion } from 'motion/react';
import { 
  Barcode as BarcodeIcon, Sparkles, CheckCircle2, AlertCircle, Package, Camera
} from 'lucide-react';
import { Product, CompanySettings, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { getProductPriceDetails, formatCurrencyDA } from './priceUtils';

interface KioskProductDisplayProps {
  foundProduct: Product | null;
  notFoundCode: string | null;
  settings: CompanySettings;
  categories?: Category[];
  brands?: Brand[];
  promotions?: Promotion[];
  countdown: number;
  isCameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const KioskProductDisplay: React.FC<KioskProductDisplayProps> = ({
  foundProduct,
  notFoundCode,
  settings,
  categories = [],
  brands = [],
  promotions = [],
  countdown,
  isCameraActive,
  videoRef
}) => {
  if (foundProduct) {
    const priceDetails = getProductPriceDetails(foundProduct, promotions);
    const categoryName = foundProduct?.categoryId 
      ? categories.find(c => c.id === foundProduct.categoryId)?.name || null 
      : null;
    const brandName = foundProduct?.brandId 
      ? brands.find(b => b.id === foundProduct.brandId)?.name || null 
      : null;

    return (
      <motion.div
        key="kiosk-product"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-4xl bg-slate-900/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col md:flex-row gap-8 items-center relative overflow-hidden backdrop-blur-xl"
      >
        {/* Barre de Compte à Rebours en haut de la carte */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
          />
        </div>

        {/* Photo Haute Résolution */}
        <div className="w-full md:w-80 h-72 md:h-88 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
          <SafeImage
            src={foundProduct.imageUrl || foundProduct.image}
            alt={foundProduct.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            fallback={
              <div className="flex flex-col items-center justify-center text-slate-600 gap-3">
                <Package size={64} strokeWidth={1.5} />
                <span className="text-xs text-slate-500">Image non disponible</span>
              </div>
            }
          />
        </div>

        {/* Informations & Prix */}
        <div className="flex-1 w-full flex flex-col justify-between h-full space-y-6">
          <div>
            {/* Badges Disponibilité & Catégorie */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                priceDetails.isAvailable 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {priceDetails.isAvailable ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {priceDetails.isAvailable ? 'Disponible en rayon' : 'Rupture temporaire'}
              </span>

              {categoryName && (
                <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                  {categoryName}
                </span>
              )}
              {brandName && (
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full">
                  {brandName}
                </span>
              )}
            </div>

            {/* Nom du produit */}
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {foundProduct.name}
            </h2>

            {/* Code-barres / Référence */}
            <p className="text-xs font-mono text-slate-400 mt-2 flex items-center gap-2">
              <BarcodeIcon size={14} className="text-slate-500" />
              <span>{foundProduct.barcode || foundProduct.sku || foundProduct.id}</span>
            </p>
          </div>

          {/* Bloc Prix Géant */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80">
            {priceDetails.hasDiscount && (
              <div className="flex items-center gap-3 mb-1">
                <span className="text-lg md:text-xl font-bold text-slate-500 line-through">
                  {formatCurrencyDA(priceDetails.originalPrice)}
                </span>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={12} />
                  Économisez {formatCurrencyDA(priceDetails.savedAmount)}
                </span>
              </div>
            )}

            <div className="flex items-baseline gap-2">
              <span className={`text-4xl md:text-5xl font-black tracking-tight ${
                priceDetails.hasDiscount ? 'text-amber-400' : 'text-cyan-400'
              }`}>
                {formatCurrencyDA(priceDetails.finalPrice)}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Prix TTC • TVA {(foundProduct as any)?.vatRate || (settings as any)?.taxRate || 19}% incluse
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Présentez un nouvel article pour scanner</span>
            <span className="font-mono text-cyan-400">Retour veille dans {countdown}s</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (notFoundCode) {
    return (
      <motion.div
        key="kiosk-not-found"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg bg-rose-950/40 border-2 border-rose-500/40 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-500/30">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">Article non référencé</h3>
        <p className="text-sm text-slate-300 mb-4">
          Le code scanné <code className="bg-slate-900 px-2 py-0.5 rounded text-rose-300 font-mono font-bold">{notFoundCode}</code> n'est pas encore enregistré dans le catalogue.
        </p>
        <p className="text-xs text-slate-400 font-medium">
          Veuillez vous adresser à un conseiller en caisse.
        </p>
      </motion.div>
    );
  }

  // Écran d'attente / Standby
  return (
    <motion.div
      key="kiosk-idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center text-center max-w-xl px-4"
    >
      {/* Viseur caméra ou Cercle radar animé */}
      {isCameraActive ? (
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 rounded-3xl overflow-hidden bg-slate-950 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.2)] mb-8">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
          />
          {/* Ligne laser animée */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-48 h-48 border-2 border-dashed border-cyan-400/60 rounded-2xl relative">
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-48 h-48 rounded-full bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center mb-8 shadow-inner">
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
          />
          <BarcodeIcon size={72} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
        Présentez un code-barres
      </h2>
      <p className="text-sm sm:text-base text-slate-400 max-w-md">
        Placez le code-barres de votre article devant la caméra ou utilisez la douchette du rayon pour afficher son prix instantanément.
      </p>
    </motion.div>
  );
};
