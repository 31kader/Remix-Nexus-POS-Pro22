import React, { useMemo, useState } from 'react';
import { Layers, Plus, Settings, Check, X, Tag, Edit3 } from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface CustomListsTabsProps {
  onOpenManageModal: () => void;
}

const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

export const CustomListsTabs: React.FC<CustomListsTabsProps> = ({
  onOpenManageModal
}) => {
  const items = useShortageStore(s => s.items);
  const customLists = useShortageStore(s => s.customLists);
  const activeListId = useShortageStore(s => s.activeListId);
  const setActiveListId = useShortageStore(s => s.setActiveListId);
  const quickCreateList = useShortageStore(s => s.quickCreateList);

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickColor, setQuickColor] = useState(PRESET_COLORS[0]);

  // Décompte et valorisation des articles par liste
  const { listCounts, listValuations } = useMemo(() => {
    const counts: Record<string, number> = {};
    const valuations: Record<string, number> = {};
    for (const item of items) {
      if (Array.isArray(item.listIds)) {
        const itemVal = (item.quantityNeeded || 0) * (item.costPrice || 0);
        for (const lId of item.listIds) {
          counts[lId] = (counts[lId] || 0) + 1;
          valuations[lId] = (valuations[lId] || 0) + itemVal;
        }
      }
    }
    return { listCounts: counts, listValuations: valuations };
  }, [items]);

  const activeList = useMemo(() => {
    if (activeListId === 'all') return null;
    return customLists.find(l => l.id === activeListId);
  }, [activeListId, customLists]);

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      const created = await quickCreateList(quickTitle.trim(), quickColor);
      toast.success(`Liste "${created.name}" créée`);
      setQuickTitle('');
      setIsQuickCreateOpen(false);
    } catch (err: any) {
      toast.error('Erreur lors de la création de la liste');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Barre des Onglets-Pills */}
      <div className="flex items-center justify-between gap-3 bg-industrial-900/60 p-2.5 rounded-2xl border border-industrial-800 shadow-md backdrop-blur-sm">
        {/* Conteneur défilant des onglets-pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {/* Onglet "Toutes les listes" */}
          <button
            type="button"
            onClick={() => setActiveListId('all')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all whitespace-nowrap shrink-0 border",
              activeListId === 'all'
                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                : "bg-industrial-950/70 border-industrial-800 text-industrial-400 hover:text-white hover:border-industrial-700"
            )}
          >
            <Layers size={13} className={activeListId === 'all' ? "text-white" : "text-industrial-500"} />
            <span>Toutes les listes</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeListId === 'all'
                  ? "bg-white/20 text-white"
                  : "bg-industrial-900 text-industrial-400 border border-industrial-800"
              )}
            >
              {items.length}
            </span>
          </button>

          {/* Onglets dynamiques des listes créées */}
          {customLists.map((list) => {
            const isActive = activeListId === list.id;
            const count = listCounts[list.id] || 0;
            const colorDot = list.color || '#6366f1';

            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all whitespace-nowrap shrink-0 border group",
                  isActive
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    : "bg-industrial-950/70 border-industrial-800 text-industrial-400 hover:text-white hover:border-industrial-700"
                )}
              >
                {/* Pastille de couleur */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: colorDot }}
                />

                <span className="truncate max-w-[140px]" title={list.name}>
                  {list.name}
                </span>

                {/* Badge compteur */}
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-industrial-900 text-industrial-400 border border-industrial-800"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Boutons d'action (Nouvelle Liste Rapide + Gérer) */}
        <div className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-industrial-800/80">
          <button
            type="button"
            onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-300 text-xs font-bold transition-all shadow-sm"
            title="Créer rapidement une nouvelle liste avec un titre"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Nouvelle liste</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-700 hover:border-indigo-500 text-industrial-300 hover:text-white text-xs font-bold transition-all shadow-sm group"
            title="Gérer les listes personnalisées (Créer, renommer, supprimer)"
          >
            <Settings size={13} className="text-industrial-500 group-hover:text-indigo-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* 2. Popover de création rapide de liste */}
      {isQuickCreateOpen && (
        <form
          onSubmit={handleQuickCreateSubmit}
          className="bg-industrial-900 border border-indigo-500/50 p-3.5 rounded-2xl flex flex-wrap items-center gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Tag size={15} className="text-indigo-400 shrink-0" />
            <input
              type="text"
              autoFocus
              required
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Titre de la nouvelle liste (ex: Tournée Boissons, Laitiers...)"
              className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-industrial-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Palette de couleurs */}
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setQuickColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full transition-all border",
                  quickColor === c ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100 border-transparent"
                )}
                style={{ backgroundColor: c }}
                title={`Couleur ${c}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsQuickCreateOpen(false);
                setQuickTitle('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-800 text-industrial-400 hover:text-white text-xs font-mono"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer la liste
            </button>
          </div>
        </form>
      )}

      {/* 3. Bannière Titre de la Liste Active si une liste est sélectionnée */}
      {activeList && (
        <div className="bg-industrial-950/70 border border-industrial-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full shrink-0 shadow-md ring-2 ring-white/20"
              style={{ backgroundColor: activeList.color || '#6366f1' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {activeList.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                  {listCounts[activeList.id] || 0} article(s)
                </span>
              </div>
              {activeList.description ? (
                <p className="text-xs text-industrial-400 font-mono mt-0.5">
                  {activeList.description}
                </p>
              ) : (
                <p className="text-[11px] text-industrial-500 font-mono mt-0.5">
                  Tournée d'achats personnalisée
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-industrial-900 px-3 py-1.5 rounded-xl border border-industrial-800 text-right">
              <span className="text-[9px] font-mono uppercase text-industrial-400 block">Total Liste</span>
              <span className="text-xs font-bold font-mono text-indigo-300">
                {Number(listValuations[activeList.id] || 0).toLocaleString('fr-DZ', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} DA
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenManageModal}
              className="p-2 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-400 hover:text-white hover:border-industrial-600 transition-all text-xs"
              title="Modifier cette liste"
            >
              <Edit3 size={14} />
            </button>

            <button
              type="button"
              onClick={() => setActiveListId('all')}
              className="p-2 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-400 hover:text-white hover:border-industrial-600 transition-all text-xs"
              title="Fermer cette liste et voir tout"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
