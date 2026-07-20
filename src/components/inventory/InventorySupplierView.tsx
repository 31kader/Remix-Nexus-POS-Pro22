import React from 'react';
import { Truck, Package, Clock, History, RefreshCw, Printer, Edit, Trash2, Check } from 'lucide-react';
import { Card } from '../ui';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { supabase } from '../../supabase';

interface InventorySupplierViewProps {
  productsBySupplier: Record<string, Product[]>;
  settings: CompanySettings;
  isDeletingId: string | null;
  onViewHistory: (product: Product) => void;
  onOpenAdjustment: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function InventorySupplierView({
  productsBySupplier,
  settings,
  isDeletingId,
  onViewHistory,
  onOpenAdjustment,
  onPrintLabel,
  onEdit,
  onDelete
}: InventorySupplierViewProps) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {(Object.entries(productsBySupplier) as [string, Product[]][]).map(([supplier, supplierProducts]) => {
        const totalStock = supplierProducts.reduce((sum, p) => sum + p.stock, 0);
        const totalValue = supplierProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
        const lowStockCount = supplierProducts.filter(p => p.stock <= (p.minStock || 5)).length;

        return (
          <div key={supplier} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">{supplier}</h4>
                  <p className="text-xs text-white/40">{supplierProducts.length} produits référencés</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Articles Totaux</p>
                  <p className="text-sm font-bold text-white">{totalStock}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Valeur Stock</p>
                  <p className="text-sm font-bold text-emerald-400">{totalValue.toFixed(2)} {settings.currency}</p>
                </div>
                {lowStockCount > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider">Alertes</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{lowStockCount}</p>
                  </div>
                )}
              </div>
            </div>
            
            <Card className="overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/5 border-bottom border-white/5">
                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider">Produit</th>
                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider">Stock</th>
                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider">Prix Unitaire</th>
                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider">Valeur Totale</th>
                    <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {supplierProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-black/20 flex items-center justify-center overflow-hidden border border-white/10">
                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={p.name} /> : <Package size={16} className="text-white/20" />}
                          </div>
                          <span className="text-sm font-medium text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn("text-sm font-bold", p.stock <= (p.minStock || 5) ? "text-rose-400" : "text-white/60")}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-white/40">{p.price.toFixed(2)} {settings.currency}</td>
                      <td className="p-4 text-sm font-bold text-white">{(p.stock * p.price).toFixed(2)} {settings.currency}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onViewHistory(p)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            title="Historique du produit"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => onOpenAdjustment(p)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Ajuster le stock"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={() => onPrintLabel(p)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Impression Rapide"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => onEdit(p)} 
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            disabled={isDeletingId === p.id}
                            onClick={() => onDelete(p.id)} 
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            {isDeletingId === p.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
