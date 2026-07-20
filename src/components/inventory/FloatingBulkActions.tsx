import React from 'react';
import { Tag, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui';

interface FloatingBulkActionsProps {
  selectedCount: number;
  onPrintLabels: () => void;
  onOpenBulkUpdate: () => void;
  onBulkDelete: () => void;
}

export function FloatingBulkActions({
  selectedCount,
  onPrintLabels,
  onOpenBulkUpdate,
  onBulkDelete
}: FloatingBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md px-6 py-4 rounded-3xl flex items-center gap-6 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Éléments sélectionnés</span>
        <span className="text-sm font-black text-white">{selectedCount} {selectedCount === 1 ? 'produit' : 'produits'}</span>
      </div>
      
      <div className="h-8 w-px bg-white/10" />
      
      <div className="flex gap-2">
        <Button 
          variant="secondary" 
          onClick={onPrintLabels}
          className="p-3 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-xl text-xs flex items-center gap-2 border border-white/5 cursor-pointer h-10"
        >
          <Tag size={14} /> <span className="hidden sm:inline">Imprimer Étiquettes</span>
        </Button>
        <Button 
          variant="secondary" 
          onClick={onOpenBulkUpdate}
          className="p-3 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-xl text-xs flex items-center gap-2 border border-white/0 cursor-pointer h-10"
          title="Déplacer vers une catégorie ou changer la marque pour tous les articles sélectionnés"
        >
          <Edit size={14} /> <span className="hidden sm:inline">Modifier</span>
        </Button>
        <Button 
          variant="constructive" 
          onClick={onBulkDelete}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs flex items-center gap-2 border-none cursor-pointer h-10"
        >
          <Trash2 size={14} /> <span className="hidden sm:inline">Supprimer la sélection</span>
        </Button>
      </div>
    </div>
  );
}
