import React, { useState, useMemo } from 'react';
import { Search, Tag } from 'lucide-react';
import { Card } from '../ui';
import { Product, Category, CompanySettings } from '../../types';

interface StockValueReportProps {
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
}

export const StockValueReport = React.memo(function StockValueReport({
  products,
  categories,
  settings,
}: StockValueReportProps) {
  const [stockFilterCategory, setStockFilterCategory] = useState<string>('all');
  const [stockFilterStatus, setStockFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [stockFilterSearch, setStockFilterSearch] = useState<string>('');

  const filteredStockProducts = useMemo(() => {
    return products.filter(p => {
      // Category Filter
      if (stockFilterCategory !== 'all' && p.categoryId !== stockFilterCategory) return false;
      
      // Status Filter
      if (stockFilterStatus === 'in_stock' && (p.stock || 0) <= 0) return false;
      if (stockFilterStatus === 'low_stock' && ((p.stock || 0) <= 0 || (p.stock || 0) > (p.minStock || 5))) return false;
      if (stockFilterStatus === 'out_of_stock' && (p.stock || 0) > 0) return false;
      
      // Search Filter
      if (stockFilterSearch) {
        const query = stockFilterSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) || 
          p.sku?.toLowerCase().includes(query) || 
          p.barcode?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [products, stockFilterCategory, stockFilterStatus, stockFilterSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stock Valuation Filters */}
      <Card id="card-stock-filters" className="p-4 border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un produit..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={stockFilterSearch}
              onChange={(e) => setStockFilterSearch(e.target.value)}
            />
          </div>

          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={stockFilterCategory}
            onChange={(e) => setStockFilterCategory(e.target.value)}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={stockFilterStatus}
            onChange={(e) => setStockFilterStatus(e.target.value as any)}
          >
            <option value="all">Tous les statuts de stock</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock faible</option>
            <option value="out_of_stock">Rupture de stock</option>
          </select>

          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <Tag size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{filteredStockProducts.length} Produits</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card id="card-stock-total-sale-val" className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Valeur de Vente Totale (Public)</p>
          <h4 className="text-3xl font-black text-indigo-600">
            {filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.price || 0)), 0).toLocaleString()} {settings.currency}
          </h4>
          <p className="text-xs text-indigo-400 mt-2 font-medium">Potentiel de chiffre d'affaires en stock</p>
        </Card>
        <Card id="card-stock-total-cost-val" className="p-6 bg-gradient-to-br from-slate-50 to-white border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valeur d'Achat Totale (Gros/Coût)</p>
          <h4 className="text-3xl font-black text-slate-800">
            {filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0).toLocaleString()} {settings.currency}
          </h4>
          <p className="text-xs text-slate-400 mt-2 font-medium">Capital immobilisé dans le stock</p>
        </Card>
        <Card id="card-stock-total-profit-val" className="p-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Marge Brute Potentielle</p>
          <h4 className="text-3xl font-black text-emerald-600">
            {filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * ((p.price || 0) - (p.costPrice || 0))), 0).toLocaleString()} {settings.currency}
          </h4>
          <p className="text-xs text-emerald-400 mt-2 font-medium">Bénéfice estimé après vente totale</p>
        </Card>
      </div>

      <Card id="card-stock-category-table" className="p-0 overflow-hidden border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Valorisation par Catégorie</h4>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Note: Les stocks négatifs sont traités à 0€</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
              {filteredStockProducts.length} Articles Filtrés
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantité Totale</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valeur Achat</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valeur Gros</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valeur Détail</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Bénéfice Potentiel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(cat => {
                const catProducts = filteredStockProducts.filter(p => p.categoryId === cat.id);
                if (catProducts.length === 0) return null;
                
                const totalQty = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0);
                const totalCost = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0);
                const totalWholesale = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.wholesalePrice || p.price)), 0);
                const totalRetail = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.price || 0)), 0);
                const potentialProfit = totalRetail - totalCost;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 text-sm">{cat.name}</td>
                    <td className="p-4 text-center text-sm font-medium text-slate-600">{totalQty}</td>
                    <td className="p-4 text-right text-sm font-mono text-slate-500">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-bold text-indigo-400">{totalWholesale.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-black text-indigo-600">{totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-bold text-emerald-600">+{potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                  </tr>
                );
              })}
              {/* Uncategorized */}
              {(() => {
                const catProducts = filteredStockProducts.filter(p => !p.categoryId || p.categoryId === 'none');
                if (catProducts.length === 0) return null;
                const totalQty = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0);
                const totalCost = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0);
                const totalWholesale = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.wholesalePrice || p.price)), 0);
                const totalRetail = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.price || 0)), 0);
                const potentialProfit = totalRetail - totalCost;
                return (
                  <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
                    <td className="p-4 font-bold text-slate-400 text-sm italic">Sans Catégorie</td>
                    <td className="p-4 text-center text-sm font-medium text-slate-600">{totalQty}</td>
                    <td className="p-4 text-right text-sm font-mono text-slate-500">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-bold text-indigo-400">{totalWholesale.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-black text-indigo-600">{totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                    <td className="p-4 text-right text-sm font-bold text-emerald-600">+{potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                  </tr>
                );
              })()}
              {filteredStockProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">Aucun produit ne correspond à vos filtres.</p>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td className="p-4 font-black uppercase tracking-widest text-xs">Total Général</td>
                <td className="p-4 text-center font-black text-sm">{filteredStockProducts.reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0)}</td>
                <td className="p-4 text-right font-black text-sm">{filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                <td className="p-4 text-right font-black text-sm text-indigo-300">{filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.wholesalePrice || p.price)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                <td className="p-4 text-right font-black text-sm text-indigo-400">{filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
                <td className="p-4 text-right font-black text-sm text-emerald-400">+{filteredStockProducts.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * ((p.price || 0) - (p.costPrice || 0))), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {settings.currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
});
