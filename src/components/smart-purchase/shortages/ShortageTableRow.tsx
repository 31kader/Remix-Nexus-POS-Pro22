import React from 'react';
import { 
  Trash2, Package, Barcode, Building2, AlertTriangle, XCircle, CheckCircle2
} from 'lucide-react';
import { ShortageItem } from '../../../types/shortages';
import { useShortageStore } from '../../../store/useShortageStore';
import { SafeImage } from '../../ui/SafeImage';
import { cn } from '../../../lib/utils';
import { ShortageItemListsBadge } from './ShortageItemListsBadge';
import { ShortageQuantityStepper } from './ShortageQuantityStepper';
import { ShortageCostPriceCell } from './ShortageCostPriceCell';

interface ShortageTableRowProps {
  item: ShortageItem;
  onToggleCheck: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateCostPrice: (id: string, costPrice: number) => void;
  onRemove: (id: string) => void;
}

export const ShortageTableRow: React.FC<ShortageTableRowProps> = ({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onUpdateCostPrice,
  onRemove
}) => {
  const toggleItemPriority = useShortageStore(s => s.toggleItemPriority);

  // Calcul du statut de stock
  const isOutOfStock = item.currentStock <= 0;
  const isAlertStock = !isOutOfStock && item.currentStock <= item.minStock;
  const lineTotal = item.quantityNeeded * (item.costPrice || 0);

  return (
    <tr 
      className={cn(
        "border-b border-industrial-800/60 transition-colors group",
        item.isChecked 
          ? "bg-indigo-950/20 hover:bg-indigo-950/30" 
          : "hover:bg-industrial-900/40"
      )}
    >
      {/* 1. Case à cocher */}
      <td className="px-3 py-3 w-10 text-center">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={() => onToggleCheck(item.id)}
          aria-label={`Sélectionner ${item.name}`}
          className="w-4 h-4 rounded border-industrial-700 bg-industrial-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-industrial-950 cursor-pointer transition-all"
        />
      </td>

      {/* 2. Article (Miniature SafeImage, Nom, Code-Barres, SKU & Listes) */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-industrial-800 bg-industrial-950 shrink-0 flex items-center justify-center">
            <SafeImage
              src={item.imageUrl}
              alt={item.name}
              fallback={<Package size={18} className="text-industrial-500" />}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
              optimizeWidth={64}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {item.name}
              </p>
              {item.isCustomProduct && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold shrink-0">
                  Hors-catalogue
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleItemPriority(item.id)}
                className={cn(
                  "px-1.5 py-0.2 rounded-full font-mono text-[9px] font-bold shrink-0 flex items-center gap-0.5 transition-all",
                  item.priority === 'urgent'
                    ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-sm"
                    : "bg-industrial-950 border border-industrial-800 text-industrial-500 hover:text-industrial-300"
                )}
                title="Bascule priorité urgente"
              >
                <span>🔥</span>
                <span>{item.priority === 'urgent' ? 'Urgent' : 'Normal'}</span>
              </button>
            </div>

            {item.notes && (
              <p className="text-[10px] font-mono text-amber-300/80 italic mt-0.5 truncate">
                📝 {item.notes}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-mono text-industrial-400">
              {item.barcode && (
                <span className="flex items-center gap-1">
                  <Barcode size={10} className="text-industrial-500" />
                  <span>{item.barcode}</span>
                </span>
              )}
              {item.sku && (
                <span className="text-industrial-500">
                  Ref: {item.sku}
                </span>
              )}
              {item.unit && (
                <span className="text-industrial-500 px-1 py-0.2 bg-industrial-900 rounded border border-industrial-800">
                  {item.unit}
                </span>
              )}
            </div>

            {/* Listes personnalisées associées & Sélecteur d'affectation */}
            <ShortageItemListsBadge itemId={item.id} listIds={item.listIds} />
          </div>
        </div>
      </td>

      {/* 3. Stock Actuel vs Seuil Min & Badge */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-black tracking-wider uppercase">
              <XCircle size={10} />
              RUPTURE
            </span>
          ) : isAlertStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-black tracking-wider uppercase">
              <AlertTriangle size={10} />
              ALERTE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
              <CheckCircle2 size={10} />
              NORMAL
            </span>
          )}

          <div className="text-[11px] font-mono text-industrial-400">
            <span className={cn(
              "font-bold",
              isOutOfStock ? "text-rose-400" : isAlertStock ? "text-amber-400" : "text-white"
            )}>
              {item.currentStock}
            </span>
            <span className="text-industrial-500"> / min {item.minStock}</span>
          </div>
        </div>
      </td>

      {/* 4. Fournisseur d'origine */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-industrial-300 font-mono">
          <Building2 size={13} className="text-industrial-500 shrink-0" />
          <span className="truncate max-w-[130px]" title={item.supplierName || 'Sans fournisseur'}>
            {item.supplierName || 'Sans fournisseur'}
          </span>
        </div>
      </td>

      {/* 5. Prix d'Achat Unitaire (DA) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <ShortageCostPriceCell
          costPrice={item.costPrice}
          onUpdateCostPrice={(cost) => onUpdateCostPrice(item.id, cost)}
        />
      </td>

      {/* 6. Stepper de Quantité & Raccourcis Rapides (+6, +12, +24) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <ShortageQuantityStepper
          quantityNeeded={item.quantityNeeded}
          onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
        />
      </td>

      {/* 7. Total Valorisé Ligne (DA) */}
      <td className="px-3 py-3 whitespace-nowrap text-right">
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-black text-sm text-indigo-300">
              {Number(lineTotal).toLocaleString('fr-DZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
            <span className="text-[10px] font-bold text-indigo-400">DA</span>
          </div>
          <span className="text-[10px] text-industrial-500 font-mono">
            {item.quantityNeeded} × {Number(item.costPrice || 0).toLocaleString('fr-DZ')}
          </span>
        </div>
      </td>

      {/* 8. Bouton Supprimer */}
      <td className="px-3 py-3 whitespace-nowrap text-center w-12">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-industrial-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          title="Retirer cet article du cahier des manques"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
};
