import React from 'react';
import { Sparkles, RefreshCw, Trash2 } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { BundleItemSearchSelect } from './BundleItemSearchSelect';

interface ProductAdvancedOptionsProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  products: Product[];
  settings: CompanySettings;
  editingProduct: Product | null;
}

export function ProductAdvancedOptions({
  formData,
  setFormData,
  products,
  settings,
  editingProduct
}: ProductAdvancedOptionsProps) {
  return (
    <div className="border-t border-white/5 pt-8 space-y-6">
      <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Options Avancées & Frais</h4>
      
      <div className="space-y-4">
        <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="w-4 h-px bg-white/10"></span>
          Frais Opérationnels Spécifiques (Marge Net)
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Emballage</label>
            <input 
              type="number" step="0.01" 
              placeholder={settings?.operationalCosts?.basePackaging?.toString() || '0.00'}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold placeholder:text-white/10 shadow-inner"
              value={formData.operationalCosts.packaging}
              onChange={e => setFormData({...formData, operationalCosts: {...formData.operationalCosts, packaging: e.target.value}})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Transport</label>
            <input 
              type="number" step="0.01" 
              placeholder={settings?.operationalCosts?.baseShipping?.toString() || '0.00'}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold placeholder:text-white/10 shadow-inner"
              value={formData.operationalCosts.shipping}
              onChange={e => setFormData({...formData, operationalCosts: {...formData.operationalCosts, shipping: e.target.value}})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Autre</label>
            <input 
              type="number" step="0.01" 
              placeholder="0.00"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold placeholder:text-white/10 shadow-inner"
              value={formData.operationalCosts.other}
              onChange={e => setFormData({...formData, operationalCosts: {...formData.operationalCosts, other: e.target.value}})}
            />
          </div>
        </div>
        <p className="text-[9px] text-white/30 italic pl-2 tracking-wide font-medium">Si vide, les frais généraux définis dans les paramètres seront utilisés.</p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={formData.isBundle} onChange={e => setFormData({...formData, isBundle: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded-lg bg-industrial-800 border-industrial-700 focus:ring-indigo-500" />
          <span className="text-xs font-black text-white uppercase tracking-widest">C'est un Lot / Composition</span>
        </label>
      </div>

      {formData.isBundle && (
        <div className="bg-indigo-600/5 p-6 rounded-3xl border border-indigo-500/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-indigo-400" />
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Composants du lot</p>
          </div>
          {formData.bundleItems.map((item: any, idx: number) => (
            <div key={`bundle-item-${idx}`} className="flex gap-3 items-center">
              <BundleItemSearchSelect
                value={item.productId}
                products={products}
                filterFn={p => !p.isBundle}
                onChange={val => {
                  const newItems = [...formData.bundleItems];
                  newItems[idx].productId = val;
                  setFormData({...formData, bundleItems: newItems});
                }}
              />
              <div className="w-24">
                <input type="number" placeholder="Qté" className="w-full p-3.5 bg-industrial-800 border border-indigo-500/30 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 font-black" value={item.quantity} onChange={e => { const newItems = [...formData.bundleItems]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setFormData({...formData, bundleItems: newItems}); }} />
              </div>
              <button type="button" onClick={() => { const newItems = formData.bundleItems.filter((_: any, i: number) => i !== idx); setFormData({...formData, bundleItems: newItems}); }} className="p-3.5 text-rose-400 hover:bg-rose-500 hover:text-white transition-all rounded-2xl border border-rose-500/20 active:scale-90"><Trash2 size={18} /></button>
            </div>
          ))}
          <button type="button" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest pl-2" onClick={() => setFormData({...formData, bundleItems: [...formData.bundleItems, { productId: '', quantity: 1 }]})}>+ Ajouter un composant</button>
        </div>
      )}

      <div className="space-y-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="text-indigo-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Lien Mère-Fils (Désemballage Automatique)</h3>
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed font-medium">Configurez ce produit comme une "unité" d'un "carton" parent. Pratique pour les ventes à l'unité de produits reçus en gros.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Produit Parent (ex: Carton)</label>
            <BundleItemSearchSelect
              value={formData.parentId}
              products={products}
              filterFn={p => !p.parentId && p.id !== editingProduct?.id}
              onChange={val => setFormData({...formData, parentId: val})}
            />
          </div>
          {formData.parentId && (
            <div className="space-y-2 animate-in slide-in-from-right duration-300">
              <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Unités par Parent</label>
              <input 
                type="number" 
                min="1"
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-black" 
                value={formData.unitsPerParent} 
                onChange={e => setFormData({...formData, unitsPerParent: e.target.value})}
                placeholder="Ex: 24"
              />
            </div>
          )}
        </div>
        
        {formData.parentId && (
          <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group">
            <input type="checkbox" checked={formData.autoUnpack} onChange={e => setFormData({...formData, autoUnpack: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded-lg bg-industrial-800 border-industrial-700 focus:ring-indigo-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-normal">Désemballage automatique lors d'une vente si le stock est épuisé</span>
          </label>
        )}
      </div>

      <div className="space-y-6 pt-6 border-t border-white/5">
        <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Tarification Spéciale</p>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Prix de gros ({settings?.currency})</label>
          <input type="number" step="0.01" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-black shadow-inner" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: e.target.value})} />
        </div>
        
        <div className="space-y-4">
          <p className="text-[10px] font-black text-white uppercase tracking-widest pl-2">Remises par quantité</p>
          {formData.quantityDiscounts.map((discount: any, idx: number) => (
            <div key={`discount-${idx}`} className="flex gap-3 items-center group">
              <div className="flex-1">
                <input type="number" placeholder="Qté min" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 font-bold" value={discount.minQuantity} onChange={e => { const newDiscounts = [...formData.quantityDiscounts]; newDiscounts[idx].minQuantity = parseFloat(e.target.value) || 0; setFormData({...formData, quantityDiscounts: newDiscounts}); }} />
              </div>
              <div className="flex-1">
                <input type="number" step="0.01" placeholder="Prix remisé" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 font-black text-indigo-400" value={discount.discountPrice} onChange={e => { const newDiscounts = [...formData.quantityDiscounts]; newDiscounts[idx].discountPrice = parseFloat(e.target.value) || 0; setFormData({...formData, quantityDiscounts: newDiscounts}); }} />
              </div>
              <button type="button" onClick={() => { const newDiscounts = formData.quantityDiscounts.filter((_: any, i: number) => i !== idx); setFormData({...formData, quantityDiscounts: newDiscounts}); }} className="p-4 text-rose-400 hover:bg-rose-500 hover:text-white transition-all rounded-2xl border border-rose-500/20 active:scale-90"><Trash2 size={18} /></button>
            </div>
          ))}
          <button type="button" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest pl-2" onClick={() => setFormData({...formData, quantityDiscounts: [...formData.quantityDiscounts, { minQuantity: 0, discountPrice: 0 }]})}>+ Ajouter une remise par quantité</button>
        </div>
      </div>
    </div>
  );
}
