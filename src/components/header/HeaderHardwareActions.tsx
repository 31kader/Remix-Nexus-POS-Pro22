import React from 'react';
import { Monitor, Banknote, Lock } from 'lucide-react';
import { getTerminalId, getTerminalName } from '../../services/terminalService';
import { testCashDrawer } from '../../services/hardwareService';

export interface HeaderHardwareActionsProps {
  activeTab: string;
  onLockPin: () => void;
  toast: any;
}

export const HeaderHardwareActions: React.FC<HeaderHardwareActionsProps> = ({
  activeTab,
  onLockPin,
  toast
}) => {
  return (
    <>
      {/* Badge Terminal / Poste Multi-Caisses (PC uniquement) */}
      <div 
        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider cursor-default"
        title={`Poste de caisse actif : ${getTerminalName()} (${getTerminalId()})`}
      >
        <Monitor size={14} className="text-indigo-400" />
        <span>{getTerminalId()}</span>
      </div>

      {/* Bouton Rapide Tiroir-Caisse (PC uniquement) */}
      {activeTab === 'checkout' && (
        <button 
          type="button"
          onClick={async () => {
            const res = await testCashDrawer();
            toast.success(res.message || 'Impulsion tiroir transmise');
          }}
          className="hidden md:flex p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-xs items-center gap-2 cursor-pointer"
          title="Ouvrir manuellement le tiroir-caisse"
        >
          <Banknote size={16} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Tiroir</span>
        </button>
      )}

      {/* Bouton Afficheur Client 2ème Écran (PC uniquement) */}
      <button 
        type="button"
        onClick={() => {
          const url = `${window.location.origin}${window.location.pathname}#customer-display`;
          window.open(url, 'NexusCustomerDisplay', 'width=1024,height=768,menubar=no,toolbar=no,location=no');
          toast.success("Écran Afficheur Client ouvert !");
        }}
        className="hidden md:flex p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-500 hover:border-indigo-500/30 transition-all shadow-xs items-center gap-2 cursor-pointer"
        title="Ouvrir l'afficheur client sur un 2ème écran"
      >
        <Monitor size={16} className="text-indigo-500" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Écran Client</span>
      </button>

      {/* Bouton Verrouillage Rapide PIN */}
      <button 
        type="button"
        onClick={onLockPin}
        className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        title="Verrouiller rapidement la caisse (Code PIN)"
      >
        <Lock size={16} className="text-rose-500" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Verrouiller</span>
      </button>
    </>
  );
};
