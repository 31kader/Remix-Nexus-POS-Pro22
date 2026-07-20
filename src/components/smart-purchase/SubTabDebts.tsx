import React from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '../ui';
import { Supplier, SupplierPayment, CompanySettings } from '../../types';
import { formatSafe } from '../../lib/utils';
import { format } from 'date-fns';

export function SubTabDebts({
  suppliers,
  supplierPayments,
  settings,
  setPaymentData,
  setIsPaymentModalOpen,
}: {
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  settings: CompanySettings;
  setPaymentData: (data: any) => void;
  setIsPaymentModalOpen: (b: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 bg-indigo-500/5 industrial-card border-indigo-500/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10"><Wallet size={32}/></div>
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Dette Totale Fournisseurs</p>
              <p className="text-4xl font-black text-white font-mono">{suppliers.reduce((sum, s) => sum + (s.balance || 0), 0).toFixed(2)} {settings.currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-8 bg-emerald-500/5 industrial-card border-emerald-500/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10"><CheckCircle2 size={32}/></div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Fournisseurs à jour</p>
              <p className="text-4xl font-black text-white font-mono">{suppliers.filter(s => (s.balance || 0) <= 0).length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="industrial-card p-0 overflow-hidden">
          <div className="p-6 bg-industrial-800/50 border-b border-industrial-800 font-black text-white uppercase tracking-widest text-xs">Détail des soldes</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-industrial-950 border-b border-industrial-800 text-[10px] font-black uppercase text-industrial-500 tracking-widest">
                  <th className="p-4">Fournisseur</th>
                  <th className="p-4 text-right">Dette</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {suppliers.filter(s => (s.balance || 0) > 0).map(s => (
                  <tr key={s.id} className="hover:bg-industrial-800/20 transition-colors">
                    <td className="p-4 font-black text-white uppercase tracking-tight">{s.name}</td>
                    <td className="p-4 text-right font-black text-rose-500 font-mono">{(s.balance || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Button 
                        className="industrial-button-primary py-2 px-4 text-[10px] shadow-none bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        onClick={() => {
                          setPaymentData({ 
                            supplierId: s.id, 
                            amount: s.balance || 0,
                            method: 'cash',
                            note: 'Règlement solde',
                            date: format(new Date(), 'yyyy-MM-dd')
                          });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Régler
                      </Button>
                    </td>
                  </tr>
                ))}
                {suppliers.filter(s => (s.balance || 0) > 0).length === 0 && (
                  <tr><td colSpan={3} className="p-12 text-center text-industrial-600 font-mono italic uppercase text-xs">Aucune dette fournisseur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="industrial-card p-0 overflow-hidden">
          <div className="p-6 bg-industrial-800/50 border-b border-industrial-800 font-black text-white uppercase tracking-widest text-xs">Derniers Versements</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-industrial-950 border-b border-industrial-800 text-[10px] font-black uppercase text-industrial-500 tracking-widest">
                  <th className="p-4">Date</th>
                  <th className="p-4">Fournisseur</th>
                  <th className="p-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {supplierPayments.slice(0, 10).map(p => (
                  <tr key={p.id} className="hover:bg-industrial-800/20 transition-colors">
                    <td className="p-4 font-mono text-industrial-400">{formatSafe(p.date, 'dd/MM/yyyy')}</td>
                    <td className="p-4 font-black text-white uppercase tracking-tight">{p.supplierName}</td>
                    <td className="p-4 text-right font-black text-emerald-400 font-mono">{p.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {supplierPayments.length === 0 && (
                  <tr><td colSpan={3} className="p-12 text-center text-industrial-600 font-mono italic uppercase text-xs">Aucun versement enregistré.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
