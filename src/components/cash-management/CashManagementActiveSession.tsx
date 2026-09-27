import React from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Banknote, CreditCard, Calculator, Lock } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { formatSafe } from '../../lib/utils';
import { CashShift, CompanySettings } from '../../types';
import { Button, Card } from '../ui';

interface CashManagementActiveSessionProps {
  activeShift: CashShift;
  currentShiftStats: any;
  settings: CompanySettings;
  setIsClosingModalOpen: (val: boolean) => void;
}

export function CashManagementActiveSession({
  activeShift,
  currentShiftStats,
  settings,
  setIsClosingModalOpen
}: CashManagementActiveSessionProps) {
  const currency = settings.currency || 'DA';
  const initialCash = Number(activeShift.initialCash || 0);
  const cashSales = Number(currentShiftStats?.totalCashSales || 0);
  const cardSales = Number(currentShiftStats?.totalCardSales || 0);
  const totalSales = Number(currentShiftStats?.totalSales || 0);
  const expenses = Number(currentShiftStats?.totalExpenses || 0);
  const expectedCash = Number(currentShiftStats?.expectedCash || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Drawer Breakdown */}
      <Card className="lg:col-span-2 p-6 space-y-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-base text-slate-900 dark:text-white">Tiroir-Caisse Actif</h4>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
                  En cours
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Ouvert le <span className="font-semibold text-slate-700 dark:text-zinc-300">{formatSafe(activeShift.openedAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}</span> par <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeShift.openedBy || 'Caissier'}</span>
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setIsClosingModalOpen(true)} 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 text-xs"
          >
            <Lock size={14} /> Clôturer & Imprimer Rapport Z
          </Button>
        </div>

        {/* 4 Drawer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/70 rounded-xl border border-slate-200 dark:border-zinc-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Fond Initial</p>
              <Banknote size={15} className="text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {initialCash.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">{currency}</span>
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Entrées Espèces</p>
              <ArrowUpRight size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              +{cashSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold">{currency}</span>
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/70 dark:border-rose-800/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Sorties / Dépenses</p>
              <ArrowDownRight size={15} className="text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400">
              -{expenses.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold">{currency}</span>
            </p>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Attendu en Caisse</p>
              <Calculator size={15} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
              {expectedCash.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold">{currency}</span>
            </p>
          </div>
        </div>

        {/* Formula Explanation Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-zinc-300">
          <span className="font-semibold">Calcul théorique du tiroir :</span>
          <span className="font-mono font-bold">
            {initialCash.toFixed(2)} (Fond) + {cashSales.toFixed(2)} (Ventes Espèces) - {expenses.toFixed(2)} (Dépenses) = <strong className="text-indigo-600 dark:text-indigo-400">{expectedCash.toFixed(2)} {currency}</strong>
          </span>
        </div>
      </Card>

      {/* Right Column: Session Performance */}
      <Card className="p-6 space-y-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between">
        <div className="space-y-4">
          <h4 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
            <TrendingUp size={18} className="text-emerald-500" />
            Répartition du Chiffre d'Affaires
          </h4>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Banknote size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Paiements Espèces</span>
              </div>
              <span className="font-black text-sm text-slate-900 dark:text-white">
                {cashSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-indigo-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Paiements Carte / CIB</span>
              </div>
              <span className="font-black text-sm text-slate-900 dark:text-white">
                {cardSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Total Ventes Session</span>
              <span className="font-black text-base text-indigo-600 dark:text-indigo-400">
                {totalSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
          Astuce : Utilisez le calculateur de billets algériens lors de la clôture pour compter rapidement vos coupures de 2000 DA, 1000 DA, 500 DA et 200 DA.
        </p>
      </Card>
    </div>
  );
}
