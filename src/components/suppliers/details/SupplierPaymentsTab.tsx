import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Supplier, CompanySettings, SupplierPayment } from '../../../types';
import { Button } from '../../ui';
import { formatSafe } from '../../../lib/utils';

interface SupplierPaymentsTabProps {
  viewingDetailsSupplier: Supplier;
  supplierPayments: any[];
  settings: CompanySettings;
  paymentData: any;
  setPaymentData: (d: any) => void;
  setIsPaymentModalOpen: (open: boolean) => void;
  setEditingPayment: (p: SupplierPayment | null) => void;
  handlePaymentDelete: (payment: SupplierPayment) => Promise<void>;
}

export function SupplierPaymentsTab({
  viewingDetailsSupplier,
  supplierPayments,
  settings,
  paymentData,
  setPaymentData,
  setIsPaymentModalOpen,
  setEditingPayment,
  handlePaymentDelete
}: SupplierPaymentsTabProps) {
  const currentPayments = supplierPayments.filter(pm => pm.supplierId === viewingDetailsSupplier.id);
  const totalPaid = currentPayments.reduce((sum, pm) => sum + Number(pm.amount || 0), 0);

  return (
    <div className="space-y-10 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-emerald-600 p-5 sm:p-5 rounded-xl sm:rounded-xl text-white shadow-md flex flex-col justify-between relative overflow-hidden group text-left">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-normal opacity-70 mb-4">Total Versement</p>
            <p className="text-4xl sm:text-6xl font-black mb-1 tracking-tighter font-mono">
              {totalPaid.toFixed(2)} <span className="text-xl sm:text-2xl font-medium opacity-50">{settings.currency}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-5 rounded-xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col justify-between text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-4">Actions Financières</p>
          <Button 
            onClick={() => { setPaymentData({ ...paymentData, amount: 0, date: new Date().toISOString() }); setIsPaymentModalOpen(true); }}
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-xl shadow-md transition-all cursor-pointer text-center"
          >
            NOUVEAU VERSEMENT
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-left">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal">Date</th>
              <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal font-sans">Montant</th>
              <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-800">
            {currentPayments.map(payment => (
              <tr key={payment.id}>
                <td className="px-6 sm:px-6 py-6">
                  <p className="text-sm font-black">{formatSafe(payment.date, 'dd/MM/yyyy')}</p>
                </td>
                <td className="px-6 sm:px-6 py-6 font-mono font-bold text-lg text-emerald-600">
                  {Number(payment.amount || 0).toFixed(2)}
                </td>
                <td className="px-6 sm:px-6 py-6">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingPayment(payment); setIsPaymentModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-55 rounded-lg cursor-pointer">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handlePaymentDelete(payment)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
