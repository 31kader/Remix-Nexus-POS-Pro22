import React from 'react';
import { 
  ClipboardList, Sparkles, ShoppingCart, Printer, 
  Trash2, CheckSquare, RefreshCw, MessageSquare, PackagePlus 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';

interface ShortagesHeaderProps {
  onOpenSuggestions: () => void;
  onConvertToPurchase?: () => void;
  onPrintExport?: () => void;
  onOpenAddCustom?: () => void;
  onOpenWhatsApp?: () => void;
  suggestedCount?: number;
}

export const ShortagesHeader: React.FC<ShortagesHeaderProps> = ({
  onOpenSuggestions,
  onConvertToPurchase,
  onPrintExport,
  onOpenAddCustom,
  onOpenWhatsApp,
  suggestedCount = 0
}) => {
  const items = useShortageStore(s => s.items);
  const activeListId = useShortageStore(s => s.activeListId);
  const selectedSupplierFilter = useShortageStore(s => s.selectedSupplierFilter);
  const searchQuery = useShortageStore(s => s.searchQuery);
  const getSummary = useShortageStore(s => s.getSummary);
  const clearCheckedItems = useShortageStore(s => s.clearCheckedItems);

  const summary = React.useMemo(() => getSummary(), [items, activeListId, selectedSupplierFilter, searchQuery, getSummary]);

  const formatDA = (val: number) => {
    return Number(val || 0).toLocaleString('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleClearChecked = async () => {
    if (summary.checkedCount === 0) return;
    if (window.confirm(`Confirmez-vous le retrait de ${summary.checkedCount} article(s) coché(s) du cahier des manques ?`)) {
      await clearCheckedItems();
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-industrial-900/80 p-5 rounded-2xl border border-industrial-800 shadow-xl backdrop-blur-sm">
      {/* Ligne 1 : Titre principal & Badges récapitulatifs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/5">
            <ClipboardList size={26} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Cahier des Manques
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
                {summary.totalItems} réf.
              </span>
            </div>
            <p className="text-xs text-industrial-400 font-mono mt-0.5">
              Gestion des ruptures, réapprovisionnement rapide & devis fournisseurs
            </p>
          </div>
        </div>

        {/* Cartes de synthèse chiffrée */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Valorisation Globale */}
          <div className="bg-industrial-950/70 border border-industrial-800 px-4 py-2 rounded-xl flex flex-col items-end">
            <span className="text-[10px] text-industrial-400 font-mono uppercase tracking-wider">
              Total Besoin Estimé
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black font-mono text-white">
                {formatDA(summary.totalEstimatedCost)}
              </span>
              <span className="text-[11px] font-bold text-indigo-400">DA</span>
            </div>
            <span className="text-[10px] text-industrial-500 font-mono">
              {summary.totalQuantity} unité{summary.totalQuantity > 1 ? 's' : ''} au total
            </span>
          </div>

          {/* Sélection Active si cochée */}
          {summary.checkedCount > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-xl flex flex-col items-end animate-in fade-in duration-200">
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <CheckSquare size={10} /> Sélection ({summary.checkedCount})
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black font-mono text-emerald-300">
                  {formatDA(summary.checkedEstimatedCost)}
                </span>
                <span className="text-[11px] font-bold text-emerald-400">DA</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">
                Prêt pour commande
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ligne 2 : Barre des Actions Rapides */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-industrial-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Suggestions automatiques */}
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenSuggestions}
            className="flex items-center gap-2 bg-industrial-950 border-industrial-700 hover:border-amber-500/50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Sparkles size={15} className="text-amber-400 animate-pulse" />
            <span>Suggestions de réassort</span>
            {suggestedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/30">
                {suggestedCount}
              </span>
            )}
          </Button>

          {/* Noter un article hors-catalogue */}
          {onOpenAddCustom && (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenAddCustom}
              className="flex items-center gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-white font-mono text-xs px-3 py-2 rounded-xl transition-all shadow-sm"
              title="Noter un produit manquant hors-catalogue"
            >
              <PackagePlus size={14} className="text-amber-400" />
              <span>+ Hors-Catalogue</span>
            </Button>
          )}

          {/* Nettoyer les éléments cochés */}
          {summary.checkedCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearChecked}
              className="flex items-center gap-1.5 bg-industrial-950/60 border-rose-900/50 text-rose-400 hover:bg-rose-950/30 hover:border-rose-600 font-mono text-xs px-3 py-2 rounded-xl transition-all"
            >
              <Trash2 size={14} />
              <span>Retirer cochés ({summary.checkedCount})</span>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Partage direct WhatsApp */}
          {onOpenWhatsApp && (
            <Button
              type="button"
              variant="secondary"
              disabled={items.length === 0}
              onClick={onOpenWhatsApp}
              className="flex items-center gap-1.5 bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/70 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Partager directement la commande par WhatsApp"
            >
              <MessageSquare size={14} className="text-emerald-400" />
              <span>WhatsApp</span>
            </Button>
          )}

          {/* Imprimer / Exporter */}
          {onPrintExport && (
            <Button
              type="button"
              variant="secondary"
              disabled={items.length === 0}
              onClick={onPrintExport}
              className="flex items-center gap-2 bg-industrial-950 border-industrial-700 hover:border-indigo-500/50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Printer size={15} className="text-industrial-400" />
              <span>Imprimer / Exporter</span>
            </Button>
          )}

          {/* Convertir en Bon d'Achat */}
          {onConvertToPurchase && (
            <Button
              type="button"
              disabled={items.length === 0}
              onClick={onConvertToPurchase}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={15} />
              <span>
                {summary.checkedCount > 0 
                  ? `Commander les ${summary.checkedCount} cochés` 
                  : 'Convertir en Bon d\'Achat'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
