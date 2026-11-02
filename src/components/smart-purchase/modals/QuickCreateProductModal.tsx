import React from 'react';
import { Modal, Button } from '../../ui';
import { Category } from '../../../types';
import { PurchaseCartItem } from '../../../hooks/usePurchaseCart';

interface QuickCreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftItemToCreate: PurchaseCartItem | null;
  quickCreateForm: any;
  setQuickCreateForm: (v: any) => void;
  handleQuickCreateSubmit: (e: React.FormEvent) => void;
  categories: Category[];
}

export const QuickCreateProductModal: React.FC<QuickCreateProductModalProps> = ({
  isOpen,
  onClose,
  draftItemToCreate,
  quickCreateForm,
  setQuickCreateForm,
  handleQuickCreateSubmit,
  categories
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CRÉATION RAPIDE PRODUIT (IMAGE/OCR)">
      <form onSubmit={handleQuickCreateSubmit} className="space-y-4 p-2 text-left">
        <p className="text-xs text-industrial-400">
          Ajoutez le produit <strong className="text-amber-400">"{draftItemToCreate?.productName}"</strong> à l'inventaire en pré-remplissant ses informations d'achat :
        </p>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Nom du produit *</label>
          <input required className="industrial-input w-full uppercase" value={quickCreateForm.name} onChange={e => setQuickCreateForm({...quickCreateForm, name: e.target.value})} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Prix d'Achat (HT)</label>
            <input required type="number" step="0.01" className="industrial-input w-full font-mono text-white" value={quickCreateForm.costPrice} onChange={e => setQuickCreateForm({...quickCreateForm, costPrice: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Prix de Vente (TTC) *</label>
            <input required type="number" step="0.01" className="industrial-input w-full font-mono text-emerald-400 font-bold focus:text-emerald-300" value={quickCreateForm.price} onChange={e => setQuickCreateForm({...quickCreateForm, price: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Quantité Initiale</label>
            <input required type="number" step="any" className="industrial-input w-full font-mono text-white" value={quickCreateForm.stock} onChange={e => setQuickCreateForm({...quickCreateForm, stock: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">TVA (%)</label>
            <select className="industrial-input w-full text-white bg-industrial-950" value={quickCreateForm.taxRate} onChange={e => setQuickCreateForm({...quickCreateForm, taxRate: e.target.value})}>
              <option value="0">0% (Exonré)</option>
              <option value="9">9% (Réduit)</option>
              <option value="19">19% (Standard)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">Catégorie *</label>
            <select required className="industrial-input w-full text-white bg-industrial-950" value={quickCreateForm.categoryId} onChange={e => setQuickCreateForm({...quickCreateForm, categoryId: e.target.value})}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest px-1">SKU / Code-barres</label>
            <input className="industrial-input w-full font-mono text-white" value={quickCreateForm.sku} onChange={e => setQuickCreateForm({...quickCreateForm, sku: e.target.value})} />
          </div>
        </div>

        <Button type="submit" className="w-full industrial-button-primary mt-4">CRÉER ET CONFIRMER</Button>
      </form>
    </Modal>
  );
};
