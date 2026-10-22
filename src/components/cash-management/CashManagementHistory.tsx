import React, { useState, useMemo } from 'react';
import { Printer, Search, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatSafe } from '../../lib/utils';
import { CashShift, CompanySettings } from '../../types';
import { Card } from '../ui';

interface CashManagementHistoryProps {
  shifts: CashShift[];
  settings: CompanySettings;
  printZReport: (shift: CashShift, settings: CompanySettings) => void;
}

export function CashManagementHistory({
  shifts,
  settings,
  printZReport
}: CashManagementHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'discrepancy' | 'exact'>('all');
  const currency = settings.currency || 'DA';

  const closedShifts = useMemo(() => {
    return shifts
      .filter(s => s.status === 'closed')
      .filter(s => {
        const diff = (Number(s.finalCash) || 0) - (Number(s.expectedCash) || 0);
        if (filterMode === 'discrepancy' && Math.abs(diff) < 0.01) return false;
        if (filterMode === 'exact' && Math.abs(diff) >= 0.01) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const cashierMatch = (s.openedBy || '').toLowerCase().includes(q);
          const dateMatch = formatSafe(s.closedAt, 'dd/MM/yyyy').includes(q);
          const noteMatch = (s.notes || '').toLowerCase().includes(q);
          return cashierMatch || dateMatch || noteMatch;
        }
        return true;
      })
      .sort((a, b) => new Date(b.closedAt || b.openedAt).getTime() - new Date(a.closedAt || a.openedAt).getTime());
  }, [shifts, searchTerm, filterMode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-black text-base text-slate-900 dark:text-white">Historique des Clôtures (Rapports Z)</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Archives des sessions fermées, contrôle des écarts et réimpression thermique</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Caissier, date (JJ/MM/AAAA)..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'exact', label: 'Caisse Exacte' },
              { id: 'discrepancy', label: 'Avec Écart' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
        {/* Vue Cartes Tactiles Mobiles (< lg) */}
        <div className="block lg:hidden space-y-3 p-3">
          {closedShifts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-zinc-400 text-sm">
              Aucune session clôturée ne correspond à votre filtre.
            </div>
          ) : (
            closedShifts.map(shift => {
              const expected = Number(shift.expectedCash || 0);
              const final = Number(shift.finalCash || 0);
              const diff = final - expected;
              return (
                <div
                  key={shift.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/80 shadow-xs space-y-3"
                >
                  {/* Header: Date, Heure, Caissier */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatSafe(shift.closedAt, 'dd/MM/yyyy')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {formatSafe(shift.openedAt, 'HH:mm')} → {formatSafe(shift.closedAt, 'HH:mm')}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold">
                      {shift.openedBy || 'Caissier'}
                    </span>
                  </div>

                  {/* Soldes: Ouverture, Attendu, Clôture */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase block">Ouverture</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        {Number(shift.initialCash || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase block">Attendu</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        {expected.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase block">Clôture</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {final.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Écart en DA et CA Total */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase block">Écart</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black mt-0.5 ${
                        diff < -0.01 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                          : diff > 0.01 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {diff < -0.01 ? <AlertTriangle size={12} /> : diff > 0.01 ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                        {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase block">CA Total</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {Number(shift.totalSales || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Bouton Rapport Z (>= 38px) */}
                  <button
                    type="button"
                    onClick={() => printZReport(shift, settings)}
                    className="w-full min-h-[38px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
                    title="Imprimer le Rapport Z"
                  >
                    <Printer size={15} />
                    <span>Imprimer Rapport Z</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Tableau Traditionnel Bureau (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800">
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Date & Horaires</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Caissier</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Fond Initial</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Attendu</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Compté (Final)</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Écart</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">CA Total</th>
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Rapport Z</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {closedShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-zinc-400 text-sm">
                    Aucune session clôturée ne correspond à votre filtre.
                  </td>
                </tr>
              ) : closedShifts.map(shift => {
                const expected = Number(shift.expectedCash || 0);
                const final = Number(shift.finalCash || 0);
                const diff = final - expected;
                return (
                  <tr key={shift.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatSafe(shift.closedAt, 'dd/MM/yyyy')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {formatSafe(shift.openedAt, 'HH:mm')} → {formatSafe(shift.closedAt, 'HH:mm')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold">
                        {shift.openedBy || 'Caissier'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-zinc-300">
                      {Number(shift.initialCash || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-zinc-300">
                      {expected.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </td>
                    <td className="p-4 text-sm font-black text-slate-900 dark:text-white">
                      {final.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                        diff < -0.01 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                          : diff > 0.01 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {diff < -0.01 ? <AlertTriangle size={12} /> : diff > 0.01 ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                        {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {Number(shift.totalSales || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => printZReport(shift, settings)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white text-xs font-bold transition-all"
                        title="Réimprimer le Rapport Z"
                      >
                        <Printer size={15} /> Imprimer Z
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
