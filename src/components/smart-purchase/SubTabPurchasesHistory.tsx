import React from 'react';
import { Search, Printer, FileText, Edit, Trash2 } from 'lucide-react';
import { Card, Button } from '../ui';
import { Purchase } from '../../types';
import { formatSafe } from '../../lib/utils';
import { printHistory } from '../../services/printService';
import { useCoreStore } from '../../store/useCoreStore';

export function SubTabPurchasesHistory({
  filteredPurchases,
  historySearch,
  setHistorySearch,
  historyStartDate,
  setHistoryStartDate,
  historyEndDate,
  setHistoryEndDate,
  setViewingPurchaseVoucher,
  handleEditPurchaseRequest,
  setPurchaseToDelete,
}: {
  filteredPurchases: Purchase[];
  historySearch: string;
  setHistorySearch: (s: string) => void;
  historyStartDate: string;
  setHistoryStartDate: (s: string) => void;
  historyEndDate: string;
  setHistoryEndDate: (s: string) => void;
  setViewingPurchaseVoucher: (p: Purchase) => void;
  handleEditPurchaseRequest: (p: Purchase) => void;
  setPurchaseToDelete: (id: string) => void;
}) {
  const settings = useCoreStore(s => s.settings);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-end industrial-card p-8">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-industrial-500 uppercase px-1 tracking-widest">
            Recherche Fournisseur / N° Facture
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" />
            <input 
              type="text" 
              placeholder="FILTRER L'HISTORIQUE..."
              className="industrial-input w-full pl-12 py-3"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" className="industrial-input p-3" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
          <input type="date" className="industrial-input p-3" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
        </div>
        <Button onClick={() => printHistory(filteredPurchases, settings)} className="industrial-button-primary bg-industrial-800 text-industrial-300 border border-industrial-700 py-3 px-6 shadow-none flex gap-2">
          <Printer size={18}/> Rapport
        </Button>
      </div>

      <Card className="industrial-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-950 border-b border-industrial-800">
                <th className="p-4">Date</th>
                <th className="p-4">Fournisseur</th>
                <th className="p-4">N° Facture</th>
                <th className="p-4">Total TTC</th>
                <th className="p-4">Payé</th>
                <th className="p-4">Reste</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800">
              {filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-industrial-800/30 transition-colors cursor-pointer" onClick={() => setViewingPurchaseVoucher(p)}>
                  <td className="p-4 text-xs font-mono text-industrial-400">{formatSafe(p.date, 'dd/MM/yyyy HH:mm')}</td>
                  <td className="p-4 text-sm font-black text-white uppercase tracking-tight">{p.supplierName}</td>
                  <td className="p-4 text-xs font-mono text-indigo-400">{p.invoiceNumber}</td>
                  <td className="p-4 text-md font-black text-white font-mono">{(p.total ?? (p as any).totalAmount ?? 0).toFixed(2)}</td>
                  <td className="p-4 text-sm text-emerald-400 font-black font-mono">{p.paidAmount?.toFixed(2) || '0.00'}</td>
                  <td className="p-4 text-sm text-rose-500 font-black font-mono">{((p.total ?? (p as any).totalAmount ?? 0) - (p.paidAmount || 0)).toFixed(2)}</td>
                  <td className="p-4 text-right flex gap-3 justify-end items-center">
                    <button onClick={(e) => { e.stopPropagation(); setViewingPurchaseVoucher(p); }} className="p-2 text-industrial-500 hover:text-indigo-400 hover:bg-industrial-800 transition-all rounded-xl"><FileText size={18}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleEditPurchaseRequest(p); }} title="Modifier" className="p-2 text-amber-500 hover:bg-amber-500/10 transition-all rounded-xl border border-amber-500/20"><Edit size={18}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setPurchaseToDelete(p.id); }} className="p-2 text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl border border-rose-500/20"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-24 text-center text-industrial-600 italic font-mono uppercase tracking-widest text-sm">Aucun achat trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
