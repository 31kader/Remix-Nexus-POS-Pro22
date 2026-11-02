import React from 'react';
import { Card } from '../../ui';

interface AccountingKPICardsProps {
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
  netProfit: number;
  currency: string;
}

export const AccountingKPICards: React.FC<AccountingKPICardsProps> = ({
  totalRevenue,
  totalCost,
  totalExpenses,
  netProfit,
  currency,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
      <Card id="card-charts-revenue" className="p-6 border-l-4 border-l-indigo-500 bg-white/5">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
        <h4 className="text-2xl font-black text-white">{Number(totalRevenue || 0).toFixed(2)} {currency}</h4>
      </Card>
      <Card id="card-charts-cost" className="p-6 border-l-4 border-l-rose-500 bg-white/5">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Coût des Ventes</p>
        <h4 className="text-2xl font-black text-white">{Number(totalCost || 0).toFixed(2)} {currency}</h4>
      </Card>
      <Card id="card-charts-expenses" className="p-6 border-l-4 border-l-amber-500 bg-white/5">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Dépenses Opérationnelles</p>
        <h4 className="text-2xl font-black text-white">{Number(totalExpenses || 0).toFixed(2)} {currency}</h4>
      </Card>
      <Card id="card-charts-profit" className="p-6 border-l-4 border-l-emerald-500 bg-white/5">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Bénéfice Net</p>
        <h4 className="text-2xl font-black text-emerald-400">{Number(netProfit || 0).toFixed(2)} {currency}</h4>
      </Card>
    </div>
  );
};
