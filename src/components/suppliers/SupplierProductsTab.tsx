import React from 'react';
import { Search, Scan, Edit } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Product, Category, CompanySettings, Supplier } from '../../types';
import { SafeImage } from '../ui';

interface Props {
  supplier: Supplier;
  products: Product[];
  settings: CompanySettings;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  setIsScannerOpen?: (v: boolean) => void;
  setEditingProduct?: (p: Product | null) => void;
  setIsProductModalOpen?: (v: boolean) => void;
  categories?: Category[];
  isPODraftOpen?: boolean;
  setIsPODraftOpen?: (v: boolean) => void;
  poDraftItems?: any[];
  setPoDraftItems?: (v: any[]) => void;
  isSavingPurchaseOrder?: boolean;
  handleSavePurchaseOrderDraft?: () => void;
  [key: string]: any;
}

export const SupplierProductsTab: React.FC<Props> = ({
  supplier,
  products,
  settings,
  searchQuery: passedSearchQuery,
  setSearchQuery: passedSetSearchQuery,
  setIsScannerOpen,
  setEditingProduct,
  setIsProductModalOpen,
  categories,
  isPODraftOpen,
  setIsPODraftOpen,
  poDraftItems,
  setPoDraftItems,
  isSavingPurchaseOrder
}) => {
  const [localSearch, setLocalSearch] = React.useState('');
  const [localScannerOpen, setLocalScannerOpen] = React.useState(false);

  const searchQuery = passedSearchQuery !== undefined ? passedSearchQuery : localSearch;
  const setSearchQuery = passedSetSearchQuery || setLocalSearch;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
          {supplier.hasFullInventoryAccess ? "Catalogue / Inventaire Complet" : "Mes Produits Référencés"}
        </h2>
        <div className="relative w-full max-w-sm flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsScannerOpen ? setIsScannerOpen(true) : setLocalScannerOpen(true)}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
            title="Scanner"
          >
            <Scan size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Produit</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Prix d'achat</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Prix de vente</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(supplier.hasFullInventoryAccess ? products : products.filter(p => {
                const pSupp = (p.supplier || '').toLowerCase().trim();
                const sName = (supplier.name || '').toLowerCase().trim();
                const sId = (supplier.id || '').toLowerCase().trim();
                return pSupp === sName || pSupp === sId;
              }))
              .filter(p => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
              })
              .map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {setEditingProduct && setIsProductModalOpen && (
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setIsProductModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Modifier la fiche produit"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-500 font-mono">{p.sku || '-'}</td>
                <td className="p-4 text-right font-bold text-slate-700">{p.costPrice?.toFixed(2)} {settings.currency}</td>
                <td className="p-4 text-right font-bold text-indigo-600">{p.price.toFixed(2)} {settings.currency}</td>
                <td className="p-4 text-center">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-xs font-bold",
                    p.stock <= (p.minStock || 5) ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {p.stock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
