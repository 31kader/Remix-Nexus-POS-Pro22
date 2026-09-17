import React from 'react';
import { Gift } from 'lucide-react';
import { CompanySettings } from '../../types';

interface Props {
  loyaltyPoints: number;
  settings: CompanySettings;
}

export const RewardLogicCard: React.FC<Props> = ({ loyaltyPoints, settings }) => {
  return (
    <div className="bg-amber-500/5 rounded-[2.5rem] border border-amber-500/20 p-8 shadow-inner relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <Gift size={24} />
          </div>
          <h3 className="font-black text-amber-400 uppercase italic tracking-wider text-sm">Reward Logic</h3>
        </div>
        <p className="text-[11px] font-bold text-amber-200/60 mb-6 leading-relaxed uppercase tracking-widest">
          Générez de la valeur sur chaque achat. 100 points = 1.00 {settings.currency} de remise Nexus.
        </p>
        <div className="p-6 bg-slate-950/40 rounded-3xl border border-amber-500/10 shadow-inner">
          <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-[0.2em] mb-2">Nexus Balance</p>
          <p className="text-3xl font-black text-amber-400 tracking-tighter leading-none">{loyaltyPoints} <span className="text-xs">PTS</span></p>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-16 -mt-16"></div>
    </div>
  );
};
