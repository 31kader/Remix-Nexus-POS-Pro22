import React from 'react';
import { Trash2, Edit, Plus, Package } from 'lucide-react';
import { SafeImage } from '../ui';
import { Product, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';

interface PurchaseCartTableProps {
  cart: PurchaseCartItem[];
  products: Product[];
  settings: CompanySettings;
  selectedSupplierId: string;
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setEditingProduct: (v: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
}

export function PurchaseCartTable({
  cart,
  products,
  settings,
  selectedSupplierId,
  openQuickCreateModal,
  setLinkingItem,
  setIsLinkModalOpen,
  updateItemField,
  updateQuantity,
  quantityInputRefs,
  setEditingProduct,
  setIsProductModalOpen
}: PurchaseCartTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-industrial-950/50 text-industrial-500 font-black uppercase text-[10px] tracking-widest">
          <tr>
            <th className="p-6 text-left">Article</th>
            <th className="p-6 text-right">P. Achat HT</th>
            <th className="p-6 text-center">Qté</th>
            <th className="p-6 text-center">Remise (%)</th>
            <th className="p-6 text-center">TVA (%)</th>
            <th className="p-6 text-right">Total HT</th>
            <th className="p-6"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-industrial-800">
          {cart.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-32 text-center text-industrial-600 font-black uppercase tracking-widest text-sm italic">
                Panier vide.
              </td>
            </tr>
          ) : (
            cart.map((item) => (
              <tr key={item.lineId} className="hover:bg-industrial-800/30 group transition-colors">
                <td className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-industrial-950 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    {item.imageUrl ? (
                      <SafeImage 
                        src={item.imageUrl} 
                        className="w-full h-full object-cover" 
                        fallback={<Package size={20} className="text-industrial-600"/>}
                      />
                    ) : <Package size={20} className="text-industrial-600"/>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {item.productId ? (
                      <div>
                        <p className="font-black text-white uppercase tracking-tight truncate">
                          {products.find(p => p.id === item.productId)?.name || item.productName}
                        </p>
                        {item.isDraft && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider mt-1">
                            Brouillon (OCR)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-tight truncate">
                            Non reconnu : "{item.productName}"
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => openQuickCreateModal(item)}
                            className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-industrial-950 text-amber-400 font-extrabold rounded-md text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            ➕ Ajouter à l'inventaire
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLinkingItem(item); setIsLinkModalOpen(true); }}
                            className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500 hover:text-industrial-950 text-cyan-400 font-extrabold rounded-md text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            🔗 Associer à l'existant
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-6 text-right">
                  <input 
                    type="number" 
                    step="any"
                    value={item.costPrice} 
                    onChange={(e) => updateItemField(item.lineId, 'costPrice', parseFloat(e.target.value) || 0)} 
                    className="w-28 p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl text-white text-right outline-none font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                  />
                </td>
                <td className="p-6 text-center">
                  <input 
                    type="number" 
                    ref={(el) => { if (el) quantityInputRefs.current[item.lineId] = el; }}
                    value={item.quantity} 
                    onChange={(e) => updateQuantity(item.lineId, parseFloat(e.target.value) || 0)} 
                    className="w-20 p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl text-white text-center font-black font-mono focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                  />
                </td>
                <td className="p-6 text-center">
                  <input 
                    type="number" 
                    value={item.discount} 
                    onChange={(e) => updateItemField(item.lineId, 'discount', parseFloat(e.target.value) || 0)} 
                    className="w-20 p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl text-indigo-600 dark:text-indigo-400 text-center font-black font-mono focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                  />
                </td>
                <td className="p-6 text-center">
                  <input 
                    type="number" 
                    value={item.taxRate} 
                    onChange={(e) => updateItemField(item.lineId, 'taxRate', parseFloat(e.target.value) || 0)} 
                    className="w-20 p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl text-slate-500 dark:text-slate-400 text-center font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                  />
                </td>
                <td className="p-6 text-right font-black text-white font-mono text-lg">
                  {((item.costPrice * item.quantity) * (1 - (item.discount || 0) / 100)).toFixed(2)}
                </td>
                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {item.productId ? (
                      <button 
                        type="button"
                        onClick={() => {
                          const prod = products.find(p => p.id === item.productId);
                          if (prod) {
                            setEditingProduct(prod);
                            setIsProductModalOpen(true);
                          }
                        }} 
                        title="Modifier la fiche produit"
                        className="opacity-0 group-hover:opacity-100 text-amber-500 hover:scale-110 transition-all p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 cursor-pointer"
                      >
                        <Edit size={16}/>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingProduct({
                            id: '',
                            name: item.productName,
                            price: 0,
                            costPrice: item.costPrice,
                            sku: '',
                            taxRate: item.taxRate || 0,
                            stock: 0,
                            minStock: 5,
                            categoryId: '',
                            brandId: '',
                            supplier: selectedSupplierId || '',
                            description: '',
                            status: 'active',
                            unit: 'pcs',
                            updatedAt: new Date().toISOString()
                          });
                          setIsProductModalOpen(true);
                        }} 
                        title="Créer la fiche produit"
                        className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:scale-110 transition-all p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 cursor-pointer"
                      >
                        <Plus size={16}/>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => updateQuantity(item.lineId, 0)} 
                      title="Retirer du panier"
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:scale-110 transition-all p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 cursor-pointer"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
