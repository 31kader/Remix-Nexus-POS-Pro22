import React from 'react';
import { ClipboardList } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useShortageStore } from '../../store/useShortageStore';

interface SmartPurchaseHeaderNavProps {
  activeSubTab: string;
  setActiveSubTab: (tab: any) => void;
  editingPurchaseId: string | null;
  onResetNew: () => void;
}

export const SmartPurchaseHeaderNav: React.FC<SmartPurchaseHeaderNavProps> = ({
  activeSubTab,
  setActiveSubTab,
  editingPurchaseId,
  onResetNew,
}) => {
  const shortageCount = useShortageStore(s => s.items.length);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-2xl font-black text-white tracking-tight uppercase">Approvisionnements</h3>
        <p className="text-sm text-industrial-500 uppercase tracking-widest text-[10px]">Gestion des réceptions de marchandises et factures fournisseurs.</p>
      </div>
      <div className="flex bg-industrial-900 p-1 rounded-xl border border-industrial-800 overflow-x-auto shadow-inner">
        <button 
          onClick={() => { onResetNew(); setActiveSubTab('new'); }}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest",
            activeSubTab === 'new' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
          )}
        >
          {editingPurchaseId ? "Modifier Réception" : "Nouvelle Réception"}
        </button>
        <button 
          onClick={() => setActiveSubTab('purchases')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent",
            activeSubTab === 'purchases' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
          )}
        >
          Historique & Suivi
        </button>
        <button 
          onClick={() => setActiveSubTab('debts')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent",
            activeSubTab === 'debts' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
          )}
        >
          Dettes & Versements
        </button>
        <button 
          onClick={() => setActiveSubTab('shortages')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent flex items-center gap-1.5",
            activeSubTab === 'shortages' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
          )}
        >
          <ClipboardList size={13} />
          <span>Cahier des Manques</span>
          {shortageCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-400/20 text-indigo-300 text-[9px] rounded-full font-mono font-bold">
              {shortageCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
