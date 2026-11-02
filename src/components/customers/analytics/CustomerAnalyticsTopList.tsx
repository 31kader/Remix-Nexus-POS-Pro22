import React from 'react';
import { Award, Phone, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface CustomerAnalyticsTopItem {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
  calculatedSpent: number;
  avgBasket: number;
  lastVisitDate: Date | null;
}

export interface CustomerAnalyticsTopListProps {
  topCustomers: CustomerAnalyticsTopItem[];
  currency: string;
  onSendWinbackWhatsApp: (c: CustomerAnalyticsTopItem) => void;
}

export const CustomerAnalyticsTopList: React.FC<CustomerAnalyticsTopListProps> = ({
  topCustomers,
  currency,
  onSendWinbackWhatsApp
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            Classement des Meilleurs Clients ({topCustomers.length})
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Les clients qui génèrent le plus de chiffre d'affaires pour votre commerce</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {topCustomers.slice(0, 30).map((customer, idx) => {
          const isTop3 = idx < 3;
          return (
            <div 
              key={customer.id}
              className={cn(
                "p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 group relative overflow-hidden",
                isTop3 
                  ? "bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-950 border-amber-500/30 hover:border-amber-500/60 shadow-lg" 
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              )}
            >
              {/* Top Rank Badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                    idx === 0 ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20" :
                    idx === 1 ? "bg-slate-300 text-slate-950" :
                    idx === 2 ? "bg-amber-700 text-white" :
                    "bg-slate-800 text-slate-400"
                  )}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-black text-white uppercase text-sm group-hover:text-indigo-400 transition-colors truncate max-w-[180px]">
                      {customer.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone size={10} /> {customer.phone || 'Non renseigné'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Award size={12} /> {customer.loyaltyPoints || 0} pts
                  </span>
                </div>
              </div>

              {/* Financial Stats Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800/60 text-xs">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">CA Total</p>
                  <p className="text-sm font-black font-mono text-emerald-400 mt-0.5">
                    {customer.calculatedSpent.toFixed(0)} <span className="text-[10px]">{currency}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Panier Moyen</p>
                  <p className="text-sm font-black font-mono text-indigo-300 mt-0.5">
                    {customer.avgBasket.toFixed(0)} <span className="text-[10px]">{currency}</span>
                  </p>
                </div>
              </div>

              {/* Footer info & WhatsApp Action */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> 
                  {customer.lastVisitDate ? customer.lastVisitDate.toLocaleDateString('fr-FR') : 'Date inconnue'}
                </span>

                {customer.phone && (
                  <button
                    onClick={() => onSendWinbackWhatsApp(customer)}
                    className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all"
                    title="Envoyer un message de remerciement / promotion"
                  >
                    <MessageSquare size={12} />
                    WhatsApp
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
