import React from 'react';
import { Modal, Button } from '../ui';
import { Category, Product, CompanySettings, Promotion } from '../../types';
import { getHierarchicalCategories } from '../../lib/utils';

interface PromotionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPromotion: Promotion | null;
  handleSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    type: 'percentage' | 'fixed' | 'buy_x_get_y';
    value: string;
    minPurchase: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    applicableCategories: string[];
    applicableProducts: string[];
    code: string;
    buyQuantity: string;
    getQuantity: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    type: 'percentage' | 'fixed' | 'buy_x_get_y';
    value: string;
    minPurchase: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    applicableCategories: string[];
    applicableProducts: string[];
    code: string;
    buyQuantity: string;
    getQuantity: string;
  }>>;
  categories: Category[];
  products: Product[];
  settings: CompanySettings;
}

export function PromotionEditModal({
  isOpen,
  onClose,
  editingPromotion,
  handleSubmit,
  formData,
  setFormData,
  categories,
  products,
  settings
}: PromotionEditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingPromotion ? "Modifier la promotion" : "Nouvelle promotion"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="text-xs font-bold text-slate-500 uppercase">Nom de l'offre *</label>
          <input 
            required
            className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Type de remise</label>
            <select 
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="percentage">Pourcentage (%)</option>
              <option value="fixed">Montant fixe ({settings.currency})</option>
              <option value="buy_x_get_y">Achetez X, recevez Y</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              {formData.type === 'buy_x_get_y' ? 'Remise sur Y (%)' : 'Valeur *'}
            </label>
            <input 
              required
              type="number"
              step="0.01"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              value={formData.value}
              onChange={e => setFormData({...formData, value: e.target.value})}
            />
          </div>
        </div>

        {formData.type === 'buy_x_get_y' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Quantité à acheter (X)</label>
              <input 
                required
                type="number"
                className="w-full p-2 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                value={formData.buyQuantity}
                onChange={e => setFormData({...formData, buyQuantity: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Quantité offerte/remisée (Y)</label>
              <input 
                required
                type="number"
                className="w-full p-2 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                value={formData.getQuantity}
                onChange={e => setFormData({...formData, getQuantity: e.target.value})}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Achat Minimum ({settings.currency})</label>
            <input 
              type="number"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              value={formData.minPurchase}
              onChange={e => setFormData({...formData, minPurchase: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Code Promo (Optionnel)</label>
            <input 
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 dark:text-white"
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Date de début</label>
            <input 
              type="date"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              value={formData.startDate}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Date de fin</label>
            <input 
              type="date"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              value={formData.endDate}
              onChange={e => setFormData({...formData, endDate: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs font-bold text-slate-500 uppercase">Catégories applicables</label>
          <div className="flex flex-col gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg max-h-[200px] overflow-y-auto">
            {getHierarchicalCategories(categories).map((cat: Category & { level: number }) => (
              <label key={`cat-filter-${cat.id}`} className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-md text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200" style={{ marginLeft: `${cat.level * 1.5}rem` }}>
                <input 
                  type="checkbox"
                  checked={formData.applicableCategories.includes(cat.id)}
                  onChange={e => {
                    const newCats = e.target.checked 
                      ? [...formData.applicableCategories, cat.id]
                      : formData.applicableCategories.filter(c => c !== cat.id);
                    setFormData({...formData, applicableCategories: newCats});
                  }}
                  className="w-3 h-3 text-indigo-600 rounded"
                />
                {cat.name}
              </label>
            ))}
            {categories.length === 0 && <p className="text-[10px] text-slate-400 italic">Aucune catégorie définie dans l'inventaire</p>}
          </div>
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs font-bold text-slate-500 uppercase">Produits spécifiques (Optionnel)</label>
          <div className="max-h-[150px] overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1">
            {products.map((prod: Product) => (
              <label key={`prod-filter-${prod.id}`} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-xs cursor-pointer text-slate-800 dark:text-slate-200">
                <input 
                  type="checkbox"
                  checked={formData.applicableProducts.includes(prod.id)}
                  onChange={e => {
                    const newProds = e.target.checked 
                      ? [...formData.applicableProducts, prod.id]
                      : formData.applicableProducts.filter(id => id !== prod.id);
                    setFormData({...formData, applicableProducts: newProds});
                  }}
                  className="w-3 h-3 text-indigo-600 rounded"
                />
                <span className="flex-1 truncate text-left">{prod.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">{prod.sku || prod.id.slice(-4)}</span>
              </label>
            ))}
            {products.length === 0 && <p className="text-[10px] text-slate-400 italic">Aucun produit dans l'inventaire</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 text-left">
          <input 
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={e => setFormData({...formData, isActive: e.target.checked})}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">Promotion active immédiatement</label>
        </div>

        <div className="pt-4 text-left">
          <Button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest text-[10px]">
            {editingPromotion ? "Enregistrer les modifications" : "Créer la promotion"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
