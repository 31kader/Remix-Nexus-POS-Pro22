import React, { useState } from 'react';
import { 
  Trash2, Package, Barcode, Plus, Minus, 
  Building2, AlertTriangle, XCircle, CheckCircle2,
  Tag, Check, X, Flame, MessageSquare 
} from 'lucide-react';
import { ShortageItem } from '../../../types/shortages';
import { useShortageStore } from '../../../store/useShortageStore';
import { SafeImage } from '../../ui/SafeImage';
import { cn } from '../../../lib/utils';

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
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [costInput, setCostInput] = useState(String(item.costPrice || 0));
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);

  const customLists = useShortageStore(s => s.customLists);
  const assignItemToList = useShortageStore(s => s.assignItemToList);
  const toggleItemPriority = useShortageStore(s => s.toggleItemPriority);

  // Calcul du statut de stock
  const isOutOfStock = item.currentStock <= 0;
  const isAlertStock = !isOutOfStock && item.currentStock <= item.minStock;

  const lineTotal = item.quantityNeeded * (item.costPrice || 0);

  const handleCostSubmit = () => {
    setIsEditingCost(false);
    const parsed = parseFloat(costInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCostPrice(item.id, parsed);
    } else {
      setCostInput(String(item.costPrice || 0));
    }
  };

  const handleStepQty = (delta: number) => {
    const next = Math.max(1, item.quantityNeeded + delta);
    onUpdateQuantity(item.id, next);
  };

  const handleQuickAdd = (amount: number) => {
    onUpdateQuantity(item.id, item.quantityNeeded + amount);
  };

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
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {Array.isArray(item.listIds) && item.listIds.map(lId => {
                const list = customLists.find(l => l.id === lId);
                if (!list) return null;
                return (
                  <span
                    key={lId}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border transition-all"
                    style={{
                      backgroundColor: `${list.color || '#6366f1'}18`,
                      borderColor: `${list.color || '#6366f1'}45`,
                      color: list.color || '#818cf8'
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: list.color || '#6366f1' }}
                    />
                    <span className="truncate max-w-[85px]">{list.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        assignItemToList(item.id, lId);
                      }}
                      className="hover:opacity-100 opacity-60 ml-0.5"
                      title={`Retirer de la liste ${list.name}`}
                      aria-label={`Retirer de la liste ${list.name}`}
                    >
                      <X size={9} />
                    </button>
                  </span>
                );
              })}

              {/* Bouton popover pour affecter à des listes */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsListMenuOpen(!isListMenuOpen);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-industrial-950 hover:bg-industrial-900 border border-industrial-800 hover:border-indigo-500/50 text-industrial-400 hover:text-indigo-300 transition-all cursor-pointer"
                  title="Affecter à des listes libres"
                  aria-label="Affecter à des listes"
                >
                  <Tag size={9} />
                  <span>+ Liste</span>
                </button>

                {isListMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsListMenuOpen(false);
                      }}
                    />
                    <div 
                      className="absolute left-0 top-full mt-1 z-50 w-52 bg-industrial-950 border border-industrial-800 rounded-xl p-2 shadow-2xl space-y-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-wider text-industrial-400 px-2 py-1 border-b border-industrial-800/80 flex items-center justify-between">
                        <span>Affecter aux listes</span>
                        <button
                          type="button"
                          onClick={() => setIsListMenuOpen(false)}
                          className="text-industrial-500 hover:text-white"
                          aria-label="Fermer le menu des listes"
                        >
                          <X size={11} />
                        </button>
                      </div>

                      {customLists.length === 0 ? (
                        <div className="p-2 text-[11px] font-mono text-industrial-500 text-center">
                          Aucune liste créée
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-0.5 py-1">
                          {customLists.map((list) => {
                            const isAssigned = Array.isArray(item.listIds) && item.listIds.includes(list.id);
                            return (
                              <button
                                key={list.id}
                                type="button"
                                onClick={() => assignItemToList(item.id, list.id)}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-all font-mono text-[11px]",
                                  isAssigned
                                    ? "bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 font-bold"
                                    : "text-industrial-300 hover:bg-industrial-900 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: list.color || '#6366f1' }}
                                  />
                                  <span className="truncate">{list.name}</span>
                                </div>
                                {isAssigned && <Check size={12} className="text-indigo-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
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
        {isEditingCost ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={costInput}
              autoFocus
              onChange={(e) => setCostInput(e.target.value)}
              onBlur={handleCostSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCostSubmit();
                if (e.key === 'Escape') {
                  setCostInput(String(item.costPrice || 0));
                  setIsEditingCost(false);
                }
              }}
              className="w-20 bg-industrial-950 border border-indigo-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
            />
            <span className="text-[10px] font-mono text-indigo-400 font-bold">DA</span>
          </div>
        ) : (
          <div
            onClick={() => {
              setCostInput(String(item.costPrice || 0));
              setIsEditingCost(true);
            }}
            title="Cliquer pour modifier le prix d'achat"
            className="cursor-pointer group/cost flex items-baseline gap-1 font-mono text-xs text-industrial-300 hover:text-white transition-colors"
          >
            <span className="font-bold underline decoration-dotted decoration-industrial-600 underline-offset-2">
              {Number(item.costPrice || 0).toLocaleString('fr-DZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
            <span className="text-[10px] text-industrial-500 group-hover/cost:text-indigo-400">DA</span>
          </div>
        )}
      </td>

      {/* 6. Stepper de Quantité & Raccourcis Rapides (+6, +12, +24) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={item.quantityNeeded <= 1}
              onClick={() => handleStepQty(-1)}
              className="w-7 h-7 rounded-lg bg-industrial-950 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Diminuer"
            >
              <Minus size={13} />
            </button>

            <input
              type="number"
              min={1}
              value={item.quantityNeeded}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) {
                  onUpdateQuantity(item.id, val);
                }
              }}
              className="w-14 text-center bg-industrial-950 border border-industrial-800 rounded-lg py-1 text-sm font-black font-mono text-white focus:outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              onClick={() => handleStepQty(1)}
              className="w-7 h-7 rounded-lg bg-industrial-950 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all"
              title="Augmenter"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Raccourcis conditionnement rapide (+6, +12, +24) */}
          <div className="flex items-center gap-1">
            {[6, 12, 24].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleQuickAdd(step)}
                className="px-1.5 py-0.5 rounded bg-industrial-950/80 hover:bg-indigo-950/60 border border-industrial-800/80 hover:border-indigo-500/40 text-[9px] font-mono font-bold text-industrial-400 hover:text-indigo-300 transition-all"
                title={`Ajouter un carton de ${step}`}
              >
                +{step}
              </button>
            ))}
          </div>
        </div>
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
