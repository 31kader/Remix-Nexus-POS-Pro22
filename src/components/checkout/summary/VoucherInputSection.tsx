import React from 'react';
import { X } from 'lucide-react';
import { Voucher } from '../../../types';

export interface VoucherInputSectionProps {
  voucherCode: string;
  setVoucherCode: (s: string) => void;
  appliedVoucher: Voucher | null;
  setAppliedVoucher: (v: Voucher | null) => void;
  applyVoucher: () => void;
  currency: string;
}

export const VoucherInputSection: React.FC<VoucherInputSectionProps> = ({
  voucherCode,
  setVoucherCode,
  appliedVoucher,
  setAppliedVoucher,
  applyVoucher,
  currency
}) => {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="CODE COUPON / CADEAU..."
          value={voucherCode}
          onChange={(e) => setVoucherCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyVoucher();
            }
          }}
          className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all"
        />
        <button
          type="button"
          onClick={applyVoucher}
          className="px-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-black text-xs uppercase tracking-normal text-slate-700 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          APPLIQUER
        </button>
      </div>
      {appliedVoucher && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-black">
          <span>{appliedVoucher.code} ({appliedVoucher.type === 'percent' ? `${appliedVoucher.value}%` : `${appliedVoucher.currentBalance ?? appliedVoucher.value} ${currency}`})</span>
          <button onClick={() => setAppliedVoucher(null)} className="hover:text-rose-500 transition-colors p-1 cursor-pointer"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};
