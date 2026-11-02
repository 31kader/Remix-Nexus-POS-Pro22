import React from 'react';
import { Monitor, Save } from 'lucide-react';

interface LanTerminalIdentifierProps {
  terminalId: string;
  onTerminalIdChange: (val: string) => void;
  terminalName: string;
  onTerminalNameChange: (val: string) => void;
  onSave: () => void;
}

export const LanTerminalIdentifier: React.FC<LanTerminalIdentifierProps> = ({
  terminalId,
  onTerminalIdChange,
  terminalName,
  onTerminalNameChange,
  onSave
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Monitor size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Identification du Poste Physique
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Chaque poste de caisse possède son identifiant unique pour isoler les sessions et clôtures
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Save size={14} />
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-widest ml-1">
            Code Caisse (Terminal ID)
          </label>
          <input
            type="text"
            value={terminalId}
            onChange={e => onTerminalIdChange(e.target.value.toUpperCase())}
            placeholder="Ex: POS-01, CAISSE-2"
            className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-widest ml-1">
            Nom Convivial de l'Appareil
          </label>
          <input
            type="text"
            value={terminalName}
            onChange={e => onTerminalNameChange(e.target.value)}
            placeholder="Ex: Caisse Principale, Comptoir Entrée"
            className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 text-slate-900 dark:text-white font-medium text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
};
