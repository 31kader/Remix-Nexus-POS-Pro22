import React from 'react';
import { Printer } from 'lucide-react';
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
  return (
    <div className="space-y-4">
      <h4 className="font-bold text-slate-800">Historique des clôtures</h4>
      <Card className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ouvert par</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Initial</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Final</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Écart</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">CA Total</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.filter(s => s.status === 'closed').length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  Aucune session clôturée pour le moment.
                </td>
              </tr>
            ) : shifts.filter(s => s.status === 'closed').map(shift => {
              const diff = (shift.finalCash || 0) - (shift.expectedCash || 0);
              return (
                <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-medium text-slate-800">
                      {formatSafe(shift.closedAt, 'dd/MM/yyyy')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatSafe(shift.openedAt, 'HH:mm')} - {formatSafe(shift.closedAt, 'HH:mm')}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{shift.openedBy}</td>
                  <td className="p-4 text-sm text-slate-600">{shift.initialCash.toFixed(2)} {settings.currency}</td>
                  <td className="p-4 text-sm font-bold text-slate-800">{shift.finalCash?.toFixed(2)} {settings.currency}</td>
                  <td className="p-4">
                    <span className={`text-xs font-bold ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} {settings.currency}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-indigo-600">{shift.totalSales?.toFixed(2)} {settings.currency}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => printZReport(shift, settings)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Réimprimer le rapport"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
