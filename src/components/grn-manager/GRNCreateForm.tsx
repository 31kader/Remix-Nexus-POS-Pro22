import React from 'react';
import { Plus, Save, Search, Package, Check, Edit, Camera, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';

interface GRNCreateFormProps {
  suppliers: any[];
  products: any[];
  
  supplierId: string;
  setSupplierId: (id: string) => void;
  isAddingSupplier: boolean;
  setIsAddingSupplier: (val: boolean) => void;
  newSupplierName: string;
  setNewSupplierName: (name: string) => void;
  handleAddSupplier: () => void;
  
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setIsScannerOpen: (val: boolean) => void;
  filteredProducts: any[];
  addItem: (p: any) => void;
  
  items: any[];
  setItems: (items: any[]) => void;
  updateItem: (index: number, field: any, val: any) => void;
  quantityInputRefs: React.MutableRefObject<any>;
  setEditingProduct: (product: any | null) => void;
  setIsProductModalOpen: (val: boolean) => void;
  
  globalDiscount: number;
  setGlobalDiscount: (val: number) => void;
  globalVat: number;
  setGlobalVat: (val: number) => void;
  validateImmediately: boolean;
  setValidateImmediately: (val: boolean) => void;
  isProcessing: boolean;
  handleCreate: () => void;
}

export function GRNCreateForm({
  suppliers, products,
  supplierId, setSupplierId,
  isAddingSupplier, setIsAddingSupplier,
  newSupplierName, setNewSupplierName,
  handleAddSupplier,
  search, setSearch, searchRef, handleKeyDown, setIsScannerOpen,
  filteredProducts, addItem,
  items, setItems, updateItem, quantityInputRefs,
  setEditingProduct, setIsProductModalOpen,
  globalDiscount, setGlobalDiscount, globalVat, setGlobalVat,
  validateImmediately, setValidateImmediately, isProcessing, handleCreate
}: GRNCreateFormProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fournisseur</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold">
            <option value="">Sélectionner un fournisseur</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={() => setIsAddingSupplier(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors">
          <Plus size={20} />
        </button>
      </div>

      {isAddingSupplier && (
        <div className="flex gap-2 items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-950">
          <input 
            type="text" 
            placeholder="Nom du nouveau fournisseur..." 
            value={newSupplierName} 
            onChange={(e) => setNewSupplierName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold"
          />
          <button onClick={handleAddSupplier} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">
            Ajouter
          </button>
          <button onClick={() => setIsAddingSupplier(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
            Annuler
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Ajouter des Produits</label>
            <button 
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} 
              className="text-indigo-600 hover:text-indigo-800 p-1 bg-white border border-indigo-100 rounded-lg shadow-sm"
              title="Nouvel article"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              ref={searchRef}
              type="text" 
              placeholder="Rechercher par nom ou SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              type="button" 
              onClick={() => setIsScannerOpen(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
              title="Scanner code-barres"
            >
              <Camera size={18} />
            </button>
          </div>

          {search.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="max-h-60 overflow-y-auto">
                {filteredProducts.map((p) => {
                  const isInItems = items.some(it => it.productId === p.id);
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => addItem(p)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {p.imageUrl ? (
                          <SafeImage 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-full h-full object-cover" 
                            fallback={<Package size={18} className="text-slate-300" />}
                          />
                        ) : <Package size={18} className="text-slate-300" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Stock: {p.stock} • {p.sku}</p>
                      </div>
                      {isInItems ? <Check size={16} className="text-emerald-500" /> : <Plus size={16} className="text-slate-400" />}
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && search.trim() !== "" && (
                  <div className="p-4 text-center text-sm text-slate-500">Aucun produit trouvé</div>
                )}
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
            <div className="col-span-3 text-left">Article</div>
            <div className="col-span-1 text-center">Quantité</div>
            <div className="col-span-2 text-center text-slate-300">Ancien Prix</div>
            <div className="col-span-1 text-center font-bold text-indigo-600">Nouv. Prix</div>
            <div className="col-span-1 text-center">TVA %</div>
            <div className="col-span-1 text-center">Remise %</div>
            <div className="col-span-2 text-right">Sous-total</div>
            <div className="col-span-1"></div>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            const subtotal = item.quantity * item.newCostPrice;
            const discounted = subtotal * (1 - item.discount / 100);
            const totalWithVat = discounted * (1 + item.vatRate / 100);

            return (
              <div key={item.lineId} className="grid grid-cols-12 gap-2 items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      {product?.imageUrl ? (
                        <SafeImage 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                          fallback={<Package size={14} className="text-slate-300" />}
                        />
                      ) : <Package size={14} className="text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{product?.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product) {
                            setEditingProduct(product);
                            setIsProductModalOpen(true);
                          } else {
                            alert('Produit non trouvé. Il ne peut être modifié.');
                          }
                        }}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all p-1.5 rounded-lg"
                        title="Modifier la fiche produit"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate">SKU: {product?.sku || 'N/A'}</p>
                  </div>
                </div>
                <div className="col-span-1">
                  <input 
                    type="number" 
                    ref={(el) => { if (el) quantityInputRefs.current[item.lineId] = el; }}
                    value={item.quantity} 
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} 
                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border-0 rounded text-center text-sm font-bold" 
                  />
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-slate-400 line-through">{(item.oldCostPrice || 0).toFixed(2)}</p>
                </div>
                <div className="col-span-1">
                  <input 
                    type="number" 
                    value={item.newCostPrice} 
                    onChange={(e) => updateItem(index, 'newCostPrice', parseFloat(e.target.value) || 0)} 
                    className="w-full px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border-0 rounded text-center text-sm font-black text-indigo-600" 
                  />
                </div>
                <div className="col-span-1">
                  <input 
                    type="number" 
                    value={item.vatRate} 
                    onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)} 
                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border-0 rounded text-center text-xs" 
                  />
                </div>
                <div className="col-span-1">
                  <input 
                    type="number" 
                    value={item.discount} 
                    onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)} 
                    className="w-full px-2 py-1 bg-amber-50 dark:bg-amber-900/30 border-0 rounded text-center text-xs font-bold text-amber-600" 
                  />
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-xs font-black text-slate-900 dark:text-white">{totalWithVat.toFixed(2)}</p>
                  <p className="text-[9px] text-slate-400 font-medium">Net HT: {discounted.toFixed(2)}</p>
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="col-span-12 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Suivi Expiration (DLC / Lot) :</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">Date de Péremption (DLC)</span>
                    <input 
                      type="date"
                      value={item.expirationDate || ''}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { ...newItems[index], expirationDate: e.target.value };
                        setItems(newItems);
                      }}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">Numéro de Lot</span>
                    <input 
                      type="text"
                      placeholder="Ex: LOT-2026A"
                      value={item.batchNumber || ''}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { ...newItems[index], batchNumber: e.target.value };
                        setItems(newItems);
                      }}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 items-center pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex-1 flex gap-4">
           <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Remise Globale (%)</label>
            <input type="number" value={globalDiscount} onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">TVA Globale (%)</label>
            <input type="number" value={globalVat} onChange={(e) => setGlobalVat(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={validateImmediately} 
              onChange={(e) => setValidateImmediately(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">Valider et mettre à jour le stock immédiatement</span>
          </label>
          <button 
            onClick={handleCreate} 
            disabled={isProcessing || items.length === 0}
            className={cn(
              "px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all self-end h-[42px]",
              (isProcessing || items.length === 0) && "opacity-50 cursor-not-allowed bg-slate-400 shadow-none"
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Save size={18} /> Créer le Bon
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
