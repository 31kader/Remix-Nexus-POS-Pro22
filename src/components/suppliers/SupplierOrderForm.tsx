import React from 'react';
import { Search, Plus, Scan, X } from 'lucide-react';
import { Button, SafeImage } from '../ui';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Product } from '../../types';

export const SupplierOrderForm = ({ 
  settings,
  orderNumber, setOrderNumber,
  items, setItems,
  selectedProduct, setSelectedProduct,
  quantity, setQuantity,
  searchQuery, setSearchQuery,
  isSearchFocused, setIsSearchFocused,
  filteredProducts,
  costPrice, setCostPrice,
  handleSelectProduct,
  handleAddItem,
  handleSubmit,
  isSubmitting,
  total,
  setIsScannerOpen
}: any) => {

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Nouveau Bon de Commande</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Numéro de commande</label>
            <input 
              type="text" 
              placeholder="Ex: BC-2024-001" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Product Search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
          </div>
          {isSearchFocused && searchQuery && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-xl rounded-xl mt-2 z-50 max-h-60 overflow-y-auto">
              {filteredProducts.map((product: Product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                >
                  <SafeImage src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <div className="text-sm font-bold text-slate-800">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.sku}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Item Form if product selected */}
        {selectedProduct && (
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="font-bold">{selectedProduct.name}</div>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-20 p-2 border border-slate-200 rounded-lg"
            />
            <input
              type="number"
              value={costPrice}
              onChange={e => setCostPrice(Number(e.target.value))}
              className="w-24 p-2 border border-slate-200 rounded-lg"
            />
            <Button onClick={handleAddItem} variant="primary">
              <Plus size={16} /> Ajouter
            </Button>
            <Button onClick={() => setSelectedProduct(null)} variant="danger">
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Items List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase">Produit</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Qté</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Prix Unitaire</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="p-3 text-sm font-bold text-slate-800">{item.productName}</td>
                  <td className="p-3 text-right text-sm">{item.quantity}</td>
                  <td className="p-3 text-right text-sm">{item.price.toFixed(2)}</td>
                  <td className="p-3 text-right text-sm font-bold">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="p-3 text-right font-bold">Total</td>
                <td className="p-3 text-right font-bold">{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0} className="w-full">
          {isSubmitting ? 'Enregistrement...' : 'Valider la Commande'}
        </Button>
      </div>
    </div>
  );
};
