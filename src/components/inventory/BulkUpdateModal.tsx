import React from 'react';
import { Category, Brand } from '../../types';
import { Modal, Button } from '../ui';
import { cn } from '../../lib/utils';

export interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  categories: Category[];
  brands: Brand[];
  bulkUpdateCategory: boolean;
  setBulkUpdateCategory: (val: boolean) => void;
  bulkUpdateBrand: boolean;
  setBulkUpdateBrand: (val: boolean) => void;
  bulkParentCatId: string;
  setBulkParentCatId: (val: string) => void;
  bulkSubCatId: string;
  setBulkSubCatId: (val: string) => void;
  bulkBrandId: string;
  setBulkBrandId: (val: string) => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function BulkUpdateModal({
  isOpen,
  onClose,
  selectedCount,
  categories,
  brands,
  bulkUpdateCategory,
  setBulkUpdateCategory,
  bulkUpdateBrand,
  setBulkUpdateBrand,
  bulkParentCatId,
  setBulkParentCatId,
  bulkSubCatId,
  setBulkSubCatId,
  bulkBrandId,
  setBulkBrandId,
  onConfirm,
  isProcessing
}: BulkUpdateModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Mise à jour groupée" 
      maxWidth="max-w-md"
    >
      <div className="space-y-6 text-left">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-2xl text-xs font-bold leading-relaxed uppercase">
          Vous allez modifier la catégorie ou la marque de {selectedCount} articles sélectionnés.
        </div>

        {/* Section Catégorie */}
        <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={bulkUpdateCategory}
              onChange={(e) => setBulkUpdateCategory(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-white/5 border-white/10 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Changer la Catégorie</span>
          </label>

          {bulkUpdateCategory && (
            <div className="space-y-3 pt-2 text-slate-800">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Catégorie Parente</span>
                <select 
                  value={bulkParentCatId} 
                  onChange={e => { setBulkParentCatId(e.target.value); setBulkSubCatId(''); }}
                  className="w-full px-4 py-2.5 bg-black/45 hover:bg-black/60 text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs border border-white/10 cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">Aucune (Non classé)</option>
                  {categories.filter(c => !c.parentId).map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sous-Catégorie</span>
                <select 
                  value={bulkSubCatId} 
                  disabled={!bulkParentCatId}
                  onChange={e => setBulkSubCatId(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 bg-black/45 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs border cursor-pointer text-white",
                    bulkParentCatId ? "border-white/10" : "border-transparent opacity-40 cursor-not-allowed"
                  )}
                >
                  <option value="" className="bg-slate-900 text-white">Aucune sous-catégorie</option>
                  {categories.filter(c => c.parentId === bulkParentCatId).map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Section Marque */}
        <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={bulkUpdateBrand}
              onChange={(e) => setBulkUpdateBrand(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-white/5 border-white/10 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Changer la Marque</span>
          </label>

          {bulkUpdateBrand && (
            <div className="space-y-1 pt-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Marque de l'article</span>
              <select 
                value={bulkBrandId} 
                onChange={e => setBulkBrandId(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/45 hover:bg-black/60 text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs border border-white/10 cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-white">Aucune marque</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-3">
          <Button 
            variant="secondary" 
            className="flex-1 cursor-pointer" 
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button 
            className="flex-1 cursor-pointer" 
            onClick={onConfirm}
            disabled={isProcessing || (!bulkUpdateCategory && !bulkUpdateBrand)}
          >
            {isProcessing ? 'En cours...' : 'Appliquer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
