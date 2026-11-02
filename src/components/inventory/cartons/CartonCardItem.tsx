import React from 'react';
import { 
  Boxes, Eye, Barcode, History, FileText, Layers, 
  ShoppingCart, Edit2, Trash2 
} from 'lucide-react';
import { EnrichedCarton } from './useCartonManagerLogic';
import { Product } from '../../../types';

export interface CartonCardItemProps {
  carton: EnrichedCarton;
  setZoomedImage: (img: { url: string; title: string } | null) => void;
  setHistoryProduct: (p: Product) => void;
  setIsHistoryModalOpen: (o: boolean) => void;
  setEditingProductSheet: (p: Product) => void;
  setIsProductSheetModalOpen: (o: boolean) => void;
  setAdjustingTemplate: (t: EnrichedCarton) => void;
  setCartonDeltaInput: (d: number) => void;
  onAddToCartDirectly?: (item: any) => void;
  handleOpenEdit: (t: EnrichedCarton) => void;
  handleDeleteTemplate: (t: EnrichedCarton) => void;
}

export const CartonCardItem: React.FC<CartonCardItemProps> = ({
  carton,
  setZoomedImage,
  setHistoryProduct,
  setIsHistoryModalOpen,
  setEditingProductSheet,
  setIsProductSheetModalOpen,
  setAdjustingTemplate,
  setCartonDeltaInput,
  onAddToCartDirectly,
  handleOpenEdit,
  handleDeleteTemplate
}) => {
  return (
    <div 
      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {carton.cartonPhotoUrl ? (
            <button
              type="button"
              onClick={() => setZoomedImage({ url: carton.cartonPhotoUrl, title: carton.productName })}
              className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 relative group/img cursor-zoom-in"
            >
              <img
                src={carton.cartonPhotoUrl}
                alt={carton.productName}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Eye size={16} />
              </div>
            </button>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
              <Boxes size={24} />
            </div>
          )}
          {carton.dHash && (
            <span 
              className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-amber-500/90 text-slate-950 text-[9px] font-black tracking-tight"
              title="Empreinte visuelle IA active"
            >
              IA
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-400 transition-colors" title={carton.productName}>
              {carton.productName}
            </h4>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
              carton.cartonsStock > 2 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : carton.cartonsStock > 0 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {carton.cartonsStock} CT
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {carton.barcode ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                <Barcode size={11} className="text-amber-400" />
                {carton.barcode}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 italic">
                Sans code-barres
              </span>
            )}
            {carton.sku && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                {carton.sku}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="font-bold text-indigo-400">
              {carton.unitsPerCarton} pcs/carton
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Total : <strong className="text-slate-200">{carton.unitsStock} pcs</strong>
              {carton.remainingUnits > 0 && ` (+${carton.remainingUnits} vrac)`}
            </span>
          </div>
        </div>
      </div>

      {/* Prix Carton */}
      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
        <div className="space-y-0.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Achat Carton</div>
          <div className="text-xs font-black text-slate-300">
            {carton.cartonCostPrice > 0 ? `${carton.cartonCostPrice.toLocaleString()} DA` : '—'}
          </div>
        </div>

        <div className="space-y-0.5 border-x border-slate-800/80">
          <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">Prix Détail</div>
          <div className="text-xs font-black text-amber-400">
            {carton.retailPrice && carton.retailPrice > 0 ? `${carton.retailPrice.toLocaleString()} DA` : '—'}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold">Prix Gros</div>
          <div className="text-xs font-black text-indigo-400">
            {carton.wholesalePrice && carton.wholesalePrice > 0 ? `${carton.wholesalePrice.toLocaleString()} DA` : '—'}
          </div>
        </div>
      </div>

      {/* Actions Rapides */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (carton.product) {
                setHistoryProduct(carton.product);
                setIsHistoryModalOpen(true);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold cursor-pointer"
          >
            <History size={13} />
            <span>Historique</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (carton.product) {
                setEditingProductSheet(carton.product);
                setIsProductSheetModalOpen(true);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold cursor-pointer"
          >
            <FileText size={13} />
            <span>Fiche</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustingTemplate(carton);
              setCartonDeltaInput(1);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold cursor-pointer"
          >
            <Layers size={13} className="text-amber-400" />
            <span>Ajuster</span>
          </button>

          {onAddToCartDirectly && (
            <button
              type="button"
              onClick={() => {
                onAddToCartDirectly({
                  productId: carton.productId,
                  productName: `${carton.productName} (Carton ${carton.unitsPerCarton}pcs)`,
                  quantity: carton.unitsPerCarton,
                  price: carton.retailPrice ? carton.retailPrice / carton.unitsPerCarton : carton.product?.price,
                  costPrice: carton.unitCostPrice,
                  cartonCount: 1,
                  unitsPerCarton: carton.unitsPerCarton,
                  cartonCostPrice: carton.cartonCostPrice,
                  imageUrl: carton.cartonPhotoUrl || carton.product?.imageUrl
                });
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black cursor-pointer"
            >
              <ShoppingCart size={13} />
              <span>+1 CT</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenEdit(carton)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteTemplate(carton)}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
