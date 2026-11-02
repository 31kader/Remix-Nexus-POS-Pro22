import React from 'react';
import { Plus } from 'lucide-react';
import { Supplier } from '../../../types';

interface PurchaseHeaderSectionProps {
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  suppliers: Supplier[];
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  setPurchaseStatus: (s: 'draft' | 'ordered' | 'completed') => void;
}

export const PurchaseHeaderSection: React.FC<PurchaseHeaderSectionProps> = ({
  selectedSupplierId,
  setSelectedSupplierId,
  suppliers,
  setIsQuickSupplierModalOpen,
  purchaseStatus,
  setPurchaseStatus
}) => {
  return (
    <>
      <div>
        <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">
          Fournisseur
        </label>
        <div className="flex items-center gap-2">
          <select 
            value={selectedSupplierId} 
            onChange={(e) => setSelectedSupplierId(e.target.value)} 
            className="w-full flex-1 p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner"
          >
            <option value="">SÉLECTIONNER...</option>
            {(suppliers || []).filter(Boolean).map(s => (
              <option key={s.id} value={s.id}>
                {String(s.name || (s as any).company || (s as any).supplier_name || 'FOURNISSEUR').toUpperCase()}
              </option>
            ))}
          </select>
          <button 
            type="button"
            onClick={() => setIsQuickSupplierModalOpen(true)} 
            className="p-3 bg-industrial-800 text-indigo-400 rounded-xl hover:bg-industrial-700 hover:text-indigo-300 transition-all border border-industrial-800 active:scale-95 cursor-pointer"
            title="Créer un nouveau fournisseur"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">
          Statut Initial
        </label>
        <select 
          value={purchaseStatus} 
          onChange={(e) => setPurchaseStatus(e.target.value as any)} 
          className="w-full p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner"
        >
          <option value="draft">BROUILLON</option>
          <option value="ordered">COMMANDÉ</option>
          <option value="completed">REÇU (MISE EN STOCK)</option>
        </select>
      </div>
    </>
  );
};
