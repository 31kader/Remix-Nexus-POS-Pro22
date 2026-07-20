import React from 'react';
import { formatSafe, cn } from '../../lib/utils';
import { PurchaseOrder, CompanySettings } from '../../types';

interface Props {
  myOrders: PurchaseOrder[];
  settings: CompanySettings;
}

export const SupplierOrdersTab: React.FC<Props> = ({ myOrders, settings }) => {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Historique des Commandes</h2>
      <div className="bg-white border-t border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">N° Commande</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Articles</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 italic">Aucune commande trouvée</td>
              </tr>
            ) : (
              myOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm text-slate-600">{formatSafe(order.createdAt, 'dd/MM/yyyy HH:mm')}</td>
                  <td className="p-4 text-sm font-mono text-slate-500">{order.orderNumber}</td>
                  <td className="p-4 text-sm text-slate-600">{order.items.length} articles</td>
                  <td className="p-4 text-sm font-bold text-slate-900 text-right">{order.total.toFixed(2)} {settings.currency}</td>
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      order.status === 'received' ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {order.status === 'pending' ? 'En attente' : 
                       order.status === 'received' ? 'Reçue' : 'Validée'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
