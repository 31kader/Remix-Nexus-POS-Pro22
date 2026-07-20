import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Session Active</h4>
              <p className="text-xs text-slate-500">Ouverte le {formatSafe(activeShift.openedAt, 'dd MMMM à HH:mm', { locale: fr })}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">En cours</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fonds de départ</p>
            <p className="text-lg font-bold text-slate-800">{activeShift.initialCash.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ventes Espèces</p>
            <p className="text-lg font-bold text-emerald-600">+{currentShiftStats?.totalCashSales.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dépenses</p>
            <p className="text-lg font-bold text-rose-600">-{currentShiftStats?.totalExpenses.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Attendu en caisse</p>
            <p className="text-lg font-bold text-indigo-700">{currentShiftStats?.expectedCash.toFixed(2)} {settings.currency}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button onClick={() => setIsClosingModalOpen(true)} variant="secondary" className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100">
            Fermer la caisse (Rapport Z)
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-500" />
          Performance Session
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Total Ventes</span>
            <span className="font-bold text-slate-800">{currentShiftStats?.totalSales.toFixed(2)} {settings.currency}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Paiements Carte</span>
            <span className="font-bold text-slate-800">{currentShiftStats?.totalCardSales.toFixed(2)} {settings.currency}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Paiements Espèces</span>
            <span className="font-bold text-slate-800">{currentShiftStats?.totalCashSales.toFixed(2)} {settings.currency}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
