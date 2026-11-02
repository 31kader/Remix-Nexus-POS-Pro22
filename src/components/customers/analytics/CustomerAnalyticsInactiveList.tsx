import React from 'react';
import { Clock, UserCheck, Phone, MessageSquare } from 'lucide-react';

export interface CustomerAnalyticsInactiveItem {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
  calculatedSpent: number;
  daysInactive: number;
  lastVisitDate: Date | null;
}

export interface CustomerAnalyticsInactiveListProps {
  inactiveCustomers: CustomerAnalyticsInactiveItem[];
  inactivityDaysThreshold: number;
  currency: string;
  onSendWinbackWhatsApp: (c: CustomerAnalyticsInactiveItem) => void;
}

export const CustomerAnalyticsInactiveList: React.FC<CustomerAnalyticsInactiveListProps> = ({
  inactiveCustomers,
  inactivityDaysThreshold,
  currency,
  onSendWinbackWhatsApp
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Clock className="text-amber-400" size={20} />
            Clients Inactifs depuis +{inactivityDaysThreshold} jours ({inactiveCustomers.length})
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Relancez vos anciens clients réguliers pour stimuler vos ventes</p>
        </div>
      </div>

      {inactiveCustomers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/40">
          <UserCheck className="mx-auto text-emerald-400 mb-3" size={40} />
          <p className="font-bold text-sm text-white uppercase">Excellente nouvelle !</p>
          <p className="text-xs text-slate-400 mt-1">Tous vos clients enregistrés sont venus récemment dans les {inactivityDaysThreshold} derniers jours.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {inactiveCustomers.map(customer => (
            <div 
              key={customer.id}
              className="p-5 rounded-xl bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-white uppercase text-sm group-hover:text-amber-400 transition-colors">
                    {customer.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <Phone size={10} /> {customer.phone || 'Pas de téléphone'}
                  </p>
                </div>

                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase rounded-lg">
                  +{customer.daysInactive >= 900 ? '90' : customer.daysInactive} jours
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Dépense cumulée</span>
                  <span className="font-black text-white font-mono">{customer.calculatedSpent.toFixed(0)} {currency}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Dernier passage</span>
                  <span className="font-bold text-slate-300">
                    {customer.lastVisitDate ? customer.lastVisitDate.toLocaleDateString('fr-FR') : 'Inconnu'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Points fidélité : <strong className="text-purple-400">{customer.loyaltyPoints || 0}</strong>
                </span>

                {customer.phone ? (
                  <button
                    onClick={() => onSendWinbackWhatsApp(customer)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    Relancer
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500">Pas de numéro</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
