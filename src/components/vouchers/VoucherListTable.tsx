import React from 'react';
import { Search, History, CheckCircle2, X } from 'lucide-react';
import { Voucher } from '../../types';
import { cn } from '../../lib/utils';

interface VoucherListTableProps {
  vouchers: Voucher[];
  filterCode: string;
  setFilterCode: (val: string) => void;
  onViewLogs: (voucher: Voucher) => void;
  onToggleStatus: (voucher: Voucher) => void;
}

export function VoucherListTable({
  vouchers,
  filterCode,
  setFilterCode,
  onViewLogs,
  onToggleStatus
}: VoucherListTableProps) {
  const filteredVouchers = (Array.isArray(vouchers) ? vouchers : []).filter(v => 
    (v?.code || '').toLowerCase().includes((filterCode || '').toLowerCase()) ||
    (v?.customerName || '').toLowerCase().includes((filterCode || '').toLowerCase())
  );


  return (
    <div className="lg:col-span-2 space-y-4 text-left">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black text-white/20 uppercase tracking-widest">Liste des Bons</h4>
        <div className="relative w-48">
          <input 
            type="text" 
            placeholder="Rechercher code..." 
            className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold outline-none ring-0 placeholder-white/20 focus:border-indigo-500 transition-all font-sans"
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
          />
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-3 text-[10px] font-black text-white/20 uppercase tracking-widest font-sans">Code &amp; Type</th>
              <th className="p-3 text-[10px] font-black text-white/20 uppercase tracking-widest font-sans">Valeur / Solde</th>
              <th className="p-3 text-[10px] font-black text-white/20 uppercase tracking-widest font-sans">Client / Exp.</th>
              <th className="p-3 text-[10px] font-black text-white/20 uppercase tracking-widest text-center font-sans">Statut</th>
              <th className="p-3 text-[10px] font-black text-white/20 uppercase tracking-widest text-right font-sans">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-white/[0.01]">
            {filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-white/20 italic text-xs uppercase tracking-widest">
                  Aucun bon trouvé
                </td>
              </tr>
            ) : (
              filteredVouchers.map(v => {
                const isExpired = v.expiryDate && new Date(v.expiryDate) < new Date();
                return (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-white font-mono tracking-tighter uppercase">{v.code}</p>
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest inline-block",
                          v.type === 'percent' ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                        )}>
                          {v.type === 'percent' ? 'Pourcentage' : 'Fixe'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5 font-mono">
                        <p className="text-sm font-black text-white">
                          {v.type === 'percent' ? `${v.value}%` : `${Number(v.value || 0).toFixed(2)} FCFA`}
                        </p>
                        {v.type === 'fixed' && v.currentBalance !== undefined && Number(v.currentBalance || 0) < Number(v.value || 0) && (
                          <p className="text-[10px] text-emerald-400 font-bold">Reste: {Number(v.currentBalance || 0).toFixed(2)}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white truncate max-w-[120px] uppercase tracking-tight">{v.customerName || 'Tout public'}</p>
                        <p className={cn("text-[9px] font-bold", isExpired ? "text-rose-400" : "text-white/20")}>
                          Exp: {v.expiryDate || 'Jamais'}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        v.status === 'active' && !isExpired ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" :
                        v.status === 'used' ? "bg-white/10 text-white/40 border-white/5" :
                        v.status === 'revoked' ? "bg-rose-500 text-white border-rose-600" :
                        "bg-rose-500/20 text-rose-400 border-rose-500/20"
                      )}>
                        {isExpired && v.status === 'active' ? 'Expiré' : v.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          type="button"
                          onClick={() => onViewLogs(v)}
                          className="p-1.5 text-white/20 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all"
                          title="Historique d'utilisation"
                        >
                          <History size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => onToggleStatus(v)}
                          className="p-1.5 text-white/20 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all"
                          title={v.status === 'revoked' ? 'Réactiver' : 'Désactiver'}
                        >
                          {v.status === 'revoked' ? <CheckCircle2 size={14} /> : <X size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
