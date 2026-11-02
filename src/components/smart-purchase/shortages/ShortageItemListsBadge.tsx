import React, { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { cn } from '../../../lib/utils';

interface ShortageItemListsBadgeProps {
  itemId: string;
  listIds?: string[];
}

export const ShortageItemListsBadge: React.FC<ShortageItemListsBadgeProps> = ({
  itemId,
  listIds = [],
}) => {
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const customLists = useShortageStore(s => s.customLists);
  const assignItemToList = useShortageStore(s => s.assignItemToList);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {Array.isArray(listIds) && listIds.map(lId => {
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
                assignItemToList(itemId, lId);
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
                    const isAssigned = Array.isArray(listIds) && listIds.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => assignItemToList(itemId, list.id)}
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
  );
};
