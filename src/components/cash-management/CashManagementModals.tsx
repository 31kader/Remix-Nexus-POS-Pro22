import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Calculator, RotateCcw } from 'lucide-react';
import { Modal, Button } from '../ui';
import { CompanySettings } from '../../types';

interface CashManagementModalsProps {
  isOpeningModalOpen: boolean;
  setIsOpeningModalOpen: (val: boolean) => void;
  isClosingModalOpen: boolean;
  setIsClosingModalOpen: (val: boolean) => void;
  initialCash: string;
  setInitialCash: (val: string) => void;
  finalCash: string;
  setFinalCash: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  isProcessing: boolean;
  currentShiftStats: any;
  settings: CompanySettings;
  handleOpenShift: () => void;
  handleCloseShift: () => void;
}

const ALGERIAN_DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10];

export function CashManagementModals({
  isOpeningModalOpen,
  setIsOpeningModalOpen,
  isClosingModalOpen,
  setIsClosingModalOpen,
  initialCash,
  setInitialCash,
  finalCash,
  setFinalCash,
  notes,
  setNotes,
  isProcessing,
  currentShiftStats,
  settings,
  handleOpenShift,
  handleCloseShift
}: CashManagementModalsProps) {
  const currency = settings.currency || 'DA';
  const [showBillCounter, setShowBillCounter] = useState(true);
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});

  const updateBillCount = (denom: number, countStr: string, targetSetter: (val: string) => void) => {
    const count = Math.max(0, parseInt(countStr || '0', 10) || 0);
    const next = { ...billCounts, [denom]: count };
    setBillCounts(next);
    const sum = Object.entries(next).reduce((acc, [d, c]) => acc + Number(d) * Number(c), 0);
    targetSetter(sum > 0 ? String(sum) : '');
  };

  const resetBills = (targetSetter: (val: string) => void) => {
    setBillCounts({});
    targetSetter('');
  };

  const expectedCash = Number(currentShiftStats?.expectedCash || 0);
  const countedFinal = Number(finalCash || 0);
  const liveDiff = countedFinal - expectedCash;

  return (
    <>
      {/* Modal Ouverture de Caisse */}
      <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)} title="Ouverture de Session de Caisse">
        <div className="space-y-4 text-left">
          <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center gap-3">
            <AlertCircle className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">
              Saisissez votre fond de caisse initial ou utilisez le calculateur de billets ci-dessous.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-600 dark:text-zinc-300 uppercase tracking-wider">
                Fond de caisse initial ({currency})
              </label>
              <button
                type="button"
                onClick={() => setShowBillCounter(v => !v)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <Calculator size={13} /> {showBillCounter ? 'Masquer billetage' : 'Aide au billetage'}
              </button>
            </div>
            <input 
              type="number"
              autoFocus
              className="w-full p-3.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl"
              placeholder="0.00"
              value={initialCash}
              onChange={e => setInitialCash(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && initialCash && handleOpenShift()}
            />
          </div>

          {showBillCounter && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Billetage Rapide (Coupures {currency})
                </span>
                <button
                  type="button"
                  onClick={() => resetBills(setInitialCash)}
                  className="text-[11px] font-bold text-rose-500 flex items-center gap-1 hover:underline"
                >
                  <RotateCcw size={11} /> Réinitialiser
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALGERIAN_DENOMINATIONS.map(denom => (
                  <div key={denom} className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700">
                    <span className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400">{denom} {currency}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Qté"
                      value={billCounts[denom] || ''}
                      onChange={e => updateBillCount(denom, e.target.value, setInitialCash)}
                      className="w-full mt-1 text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-none border-b border-slate-200 dark:border-zinc-700 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={handleOpenShift} 
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl" 
            disabled={initialCash === '' || isProcessing}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : "Confirmer l'ouverture de caisse"}
          </Button>
        </div>
      </Modal>

      {/* Modal Clôture de Caisse (Rapport Z) */}
      <Modal isOpen={isClosingModalOpen} onClose={() => setIsClosingModalOpen(false)} title="Clôture de Caisse (Rapport Z)">
        <div className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
              <p className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase mb-1">Attendu en Espèces</p>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {expectedCash.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </p>
            </div>
            <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">Total Ventes Session</p>
              <p className="text-base font-black text-indigo-700 dark:text-indigo-300">
                {Number(currentShiftStats?.totalSales || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-600 dark:text-zinc-300 uppercase">
                Montant réel compté dans le tiroir ({currency})
              </label>
              <button
                type="button"
                onClick={() => setFinalCash(String(expectedCash.toFixed(2)))}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                = Montant exact ({expectedCash.toFixed(0)} {currency})
              </button>
            </div>
            <input 
              type="number"
              autoFocus
              className="w-full p-3.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl"
              placeholder="0.00"
              value={finalCash}
              onChange={e => setFinalCash(e.target.value)}
            />
          </div>

          {/* Live Discrepancy Preview */}
          {finalCash !== '' && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
              Math.abs(liveDiff) < 0.01
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : liveDiff < 0
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}>
              <span>Écart de caisse constaté :</span>
              <span className="font-black text-sm">
                {liveDiff > 0 ? '+' : ''}{liveDiff.toFixed(2)} {currency} ({Math.abs(liveDiff) < 0.01 ? 'Caisse Exacte' : liveDiff < 0 ? 'Manquant' : 'Excédent'})
              </span>
            </div>
          )}

          {/* Algerian Bill Counter */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Compteur de Coupures ({currency})
              </span>
              <button
                type="button"
                onClick={() => resetBills(setFinalCash)}
                className="text-[11px] font-bold text-rose-500 flex items-center gap-1 hover:underline"
              >
                <RotateCcw size={11} /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALGERIAN_DENOMINATIONS.map(denom => (
                <div key={denom} className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700">
                  <span className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400">{denom} {currency}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Qté"
                    value={billCounts[denom] || ''}
                    onChange={e => updateBillCount(denom, e.target.value, setFinalCash)}
                    className="w-full mt-1 text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-none border-b border-slate-200 dark:border-zinc-700 focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-600 dark:text-zinc-300 uppercase">Notes de clôture (Optionnel)</label>
            <textarea 
              className="w-full p-3 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[75px] text-sm"
              placeholder="Justification d'un écart, dépôt coffre, remarques..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleCloseShift} 
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl" 
            disabled={finalCash === '' || isProcessing}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : "Confirmer la Clôture & Imprimer le Rapport Z"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
