import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Percent, 
  RefreshCcw, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  ZoomIn, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  CalendarPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Product } from '../../types';
import { SafeImage } from '../ui';

interface ExpiryListViewProps {
  paginatedProducts: any[];
  allProducts: Product[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleApplyPromo: (product: any, percent: number) => void;
  handleRestorePrice: (product: any) => void;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  handleSaveQuickDate: (product: any, date: string, batchNumber?: string) => Promise<void>;
  previewImage: { url: string; title: string; sku?: string } | null;
  setPreviewImage: (img: { url: string; title: string; sku?: string } | null) => void;
  quickDateProduct: any | null;
  setQuickDateProduct: (p: any | null) => void;
}

export function ExpiryListView({
  paginatedProducts,
  allProducts,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  setPageSize,
  handleApplyPromo,
  handleRestorePrice,
  onEditProduct,
  onAdjustStock,
  handleSaveQuickDate,
  previewImage,
  setPreviewImage,
  quickDateProduct,
  setQuickDateProduct
}: ExpiryListViewProps) {
  const [modalDate, setModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalBatch, setModalBatch] = useState('');

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      {/* 📦 Grille des 10 Produits par Page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {paginatedProducts.map((product) => {
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
                        onClick={() => {
                          setQuickDateProduct(product);
                          setModalDate(product.expirationDate ? format(product.expiryDate || new Date(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                          setModalBatch(product.batchNumber || '');
                        }}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <CalendarPlus size={12} /> {product.hasExpiryDate ? 'Changer Date' : '+ Définir Date'}
                      </button>

                      <button 
                        onClick={() => handleApplyPromo(product, 20)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Percent size={12} /> Promo -20%
                      </button>
                      
                      <button 
                        onClick={() => {
                          const orig = product.originalId ? allProducts.find((p: any) => p.id === product.originalId) : product;
                          if (orig) onEditProduct(orig);
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider text-white/50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={12} /> Modifier
                      </button>

                      <button 
                        onClick={() => {
                          const orig = product.originalId ? allProducts.find((p: any) => p.id === product.originalId) : product;
                          if (orig) onAdjustStock(orig);
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={12} /> Jeter / Perte
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {paginatedProducts.length === 0 && (
          <div className="lg:col-span-2 py-20 flex flex-col items-center justify-center text-white/30 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" />
            <p className="font-black uppercase tracking-widest text-sm text-white/60">Aucun produit ne correspond aux filtres</p>
            <p className="text-xs text-white/30 mt-1">Modifiez vos critères de recherche ou sélectionnez un autre statut.</p>
          </div>
        )}
      </div>

      {/* 📄 Barre de Pagination Complète */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Affichage <span className="text-white font-black">{startIndex} - {endIndex}</span> sur <span className="text-indigo-400 font-black">{totalCount}</span> articles
            </span>

            <div className="h-4 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Par page :</span>
              {[10, 20, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all",
                    pageSize === size 
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                      : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Première page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Précédent
            </button>

            <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black tracking-wider">
              Page {currentPage} / {totalPages}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
            >
              Suivant <ChevronRight size={14} />
            </button>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Dernière page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 🔍 LIGHTBOX MODAL : Image Agrandie Plein Écran */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 "
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-slate-900 border border-white/15 rounded-xl overflow-hidden shadow-md shadow-black p-6 flex flex-col items-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-lg"
              >
                <X size={20} />
              </button>

              <div className="w-full max-h-[65vh] flex items-center justify-center rounded-xl overflow-hidden bg-black/50 p-2 border border-white/5">
                <SafeImage 
                  src={previewImage.url} 
                  alt={previewImage.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md" 
                />
              </div>

              <div className="w-full mt-4 text-center">
                <h3 className="text-lg font-extrabold text-white uppercase tracking-tight">{previewImage.title}</h3>
                {previewImage.sku && (
                  <p className="text-xs font-mono font-bold text-indigo-400 mt-1 uppercase tracking-widest">
                    SKU / Réf : {previewImage.sku}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📅 MODAL RAPIDE : Définir / Modifier Date de Péremption */}
      <AnimatePresence>
        {quickDateProduct && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 "
            onClick={() => setQuickDateProduct(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative max-w-md w-full bg-slate-900 border border-white/20 rounded-xl shadow-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                  <CalendarPlus className="text-indigo-400" size={20} /> Définir la Date
                </h3>
                <button 
                  onClick={() => setQuickDateProduct(null)}
                  className="p-1 text-white/40 hover:text-white rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Article :</p>
                  <p className="text-sm font-extrabold text-white uppercase">{quickDateProduct.name}</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">
                    Date de Péremption (JJ/MM/AAAA)
                  </label>
                  <input 
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">
                    Numéro de Lot / Batch (Optionnel)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: LOT-2026-A1"
                    value={modalBatch}
                    onChange={(e) => setModalBatch(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setQuickDateProduct(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white/60 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (modalDate) {
                      handleSaveQuickDate(quickDateProduct, modalDate, modalBatch.trim() || undefined);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
