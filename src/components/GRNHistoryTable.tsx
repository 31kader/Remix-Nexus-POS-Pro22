import React from 'react';
import { Search, RefreshCw, Check, Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoodsReceiptNote, CompanySettings, Product } from '../types';
import { printPurchaseVoucher } from '../services/documentPrintService';

interface GRNHistoryTableProps {
  filteredGRNs: GoodsReceiptNote[];
  suppliers: any[];
  handleValidate: (grn: GoodsReceiptNote) => void;
  isProcessing: boolean;
  grnSearch: string;
  setGrnSearch: (s: string) => void;
  settings: CompanySettings;
  products: Product[];
}

export function GRNHistoryTable({
  filteredGRNs,
  suppliers,
  handleValidate,
  isProcessing,
  grnSearch,
  setGrnSearch,
  settings,
  products
}: GRNHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Historique des Bons</h4>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Rechercher par bon, fournisseur ou produit..."
            value={grnSearch}
            onChange={(e) => setGrnSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
          />
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <th className="p-4">Date de Réception</th>
              <th className="p-4">Fournisseur</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredGRNs.map(grn => {
              const isDraft = grn.status === 'draft';
              return (
                <tr key={grn.id} className={cn(
                  "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                  isDraft && "bg-amber-50/50 dark:bg-amber-900/10"
                )}>
                  <td className="p-4">
                     <p className="font-bold text-slate-700 dark:text-slate-300">{new Date(grn.date).toLocaleDateString()}</p>
                     <p className="text-[10px] text-slate-400">{new Date(grn.date).toLocaleTimeString()}</p>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                     {suppliers.find(s => s.id === grn.supplierId)?.name || 'Inconnu'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit",
                        grn.status === 'validated' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {grn.status === 'draft' ? 'Brouillon' : 'Validé'}
                      </span>
                      {isDraft && <p className="text-[9px] text-amber-600 font-bold uppercase animate-pulse">Action Requise: Valider</p>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      <button
                        onClick={() => {
                          const total = grn.items.reduce((sum, item) => {
                            const subtotal = item.quantity * item.newCostPrice;
                            const discounted = subtotal * (1 - item.discount / 100);
                            const totalWithVat = discounted * (1 + item.vatRate / 100);
                            return sum + totalWithVat;
                          }, 0) * (1 - (grn.globalDiscount || 0) / 100) * (1 + (grn.globalVat || 0) / 100);

                          printPurchaseVoucher({
                            id: grn.id,
                            items: grn.items.map(item => ({
                              name: products.find(p => p.id === item.productId)?.name || 'Article',
                              quantity: item.quantity,
                              costPrice: item.newCostPrice
                            })),
                            total: total
                          }, settings);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Imprimer le Bon de Réception"
                      >
                        <Printer size={16} />
                      </button>
                      {grn.status === 'draft' && (
                        <button 
                          onClick={() => handleValidate(grn)} 
                          disabled={isProcessing}
                          className={cn(
                            "px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20",
                            isProcessing && "opacity-50 cursor-not-allowed bg-slate-400 shadow-none"
                          )}
                        >
                          {isProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Valider & Mettre à jour Stock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredGRNs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">Aucun bon de réception trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
