import React from 'react';
import { Banknote, AlertCircle } from 'lucide-react';
import { Customer } from '../../../types';

export interface CashReceivedTerminalProps {
  total: number;
  currency: string;
  receivedAmount: string;
  setReceivedAmount: (v: string) => void;
  selectedCustomer: Customer | null;
  keepExcessInBalance: boolean;
  setKeepExcessInBalance?: (v: boolean) => void;
}

export const CashReceivedTerminal: React.FC<CashReceivedTerminalProps> = ({
  total,
  currency,
  receivedAmount,
  setReceivedAmount,
  selectedCustomer,
  keepExcessInBalance,
  setKeepExcessInBalance
}) => {
  return (
    <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Banknote size={14} className="text-emerald-500" />
          Règlement Espèces (DA)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReceivedAmount(total.toFixed(2))}
            className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase rounded-md border border-emerald-300 dark:border-emerald-700 transition-all active:scale-95 cursor-pointer"
            title="Remplir le montant exact reçu"
          >
            Compte Juste
          </button>
          {receivedAmount !== '' && (
            <button
              type="button"
              onClick={() => setReceivedAmount('')}
              className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 tracking-wider cursor-pointer"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <div className="relative">
          <input
            type="number"
            step="any"
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value)}
            placeholder={total.toFixed(2)}
            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-base font-black font-mono rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 font-mono">
            {currency}
          </span>
        </div>

        {/* Rendu Dynamique Monnaie à rendre / Reste dû */}
        <div className="flex flex-col justify-center text-right font-mono bg-white dark:bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 shadow-sm min-h-[44px]">
          {(() => {
            const typed = parseFloat(receivedAmount || '');
            if (isNaN(typed) || receivedAmount === '') {
              return <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">EN ATTENTE</span>;
            }
            if (typed > total) {
              return (
                <>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight">
                    +{(typed - total).toFixed(2)} {currency}
                  </span>
                  <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.5 rounded w-fit ml-auto mt-0.5">À RENDRE</span>
                </>
              );
            } else if (typed < total) {
              return (
                <>
                  <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight">
                    -{(total - typed).toFixed(2)} {currency}
                  </span>
                  <span className="text-[8px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded w-fit ml-auto mt-0.5">RESTE DÛ</span>
                </>
              );
            } else {
              return (
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/80 px-2 py-1 rounded text-center">
                  COMPTE JUSTE
                </span>
              );
            }
          })()}
        </div>
      </div>

      {/* Options & alertes de crédit/solde pour le client sélectionné */}
      {selectedCustomer && (() => {
        const typed = parseFloat(receivedAmount || '');
        if (!isNaN(typed) && receivedAmount !== '') {
          if (typed < total) {
            const diff = total - typed;
            return (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-[11px] animate-in fade-in duration-200">
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <div className="leading-tight">
                  <span className="font-bold">Crédit client (+{diff.toFixed(2)} {currency}) : </span>
                  <span>Sera imputé à la dette de {selectedCustomer.name}.</span>
                </div>
              </div>
            );
          } else if (typed > total && setKeepExcessInBalance) {
            const diff = typed - total;
            return (
              <label className="flex items-center gap-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-pointer hover:bg-emerald-500/15 transition-all text-[11px] select-none text-emerald-800 dark:text-emerald-300">
                <input
                  type="checkbox"
                  checked={keepExcessInBalance}
                  onChange={(e) => setKeepExcessInBalance(e.target.checked)}
                  className="accent-emerald-600 rounded cursor-pointer w-4 h-4 shrink-0"
                />
                <div className="leading-tight flex-1">
                  <span className="font-bold uppercase tracking-wider text-[10px]">Abonder le solde (+{diff.toFixed(2)} {currency})</span>
                  <div className="text-[9px] opacity-75 font-mono">
                    Nouveau solde : {((selectedCustomer.balance || 0) + diff).toFixed(2)} {currency}
                  </div>
                </div>
              </label>
            );
          }
        }
        return null;
      })()}
    </div>
  );
};
