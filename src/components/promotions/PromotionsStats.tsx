import React from 'react';
import { Tag, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { Card } from '../ui';
import { CompanySettings } from '../../types';

interface PromotionsStatsProps {
  stats: {
    total: number;
    active: number;
    ongoing: number;
    totalDiscount: number;
  };
  settings: CompanySettings;
}

export function PromotionsStats({ stats, settings }: PromotionsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <Tag size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Offres</p>
          <p className="text-lg font-bold text-slate-800">{stats.total}</p>
        </div>
      </Card>
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actives</p>
          <p className="text-lg font-bold text-slate-800">{stats.active}</p>
        </div>
      </Card>
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Cours</p>
          <p className="text-lg font-bold text-slate-800">{stats.ongoing}</p>
        </div>
      </Card>
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
          <TrendingDown size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Remises</p>
          <p className="text-lg font-bold text-rose-600">{stats.totalDiscount.toFixed(2)} {settings.currency}</p>
        </div>
      </Card>
    </div>
  );
}
