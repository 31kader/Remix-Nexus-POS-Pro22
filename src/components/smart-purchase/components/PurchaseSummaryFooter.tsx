import React from 'react';
import { Button } from '../../ui';
import { Printer, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PurchaseCartItem } from '../../usePurchaseCart';
import { CompanySettings, Supplier } from '../../../types';
import { printPurchaseOrder } from '../../../services/printService';

interface PurchaseSummaryFooterProps {
  cart: PurchaseCartItem[];
  settings: CompanySettings;
  selectedSupplierId: string;
  suppliers: Supplier[];
  paidAmount: number;
  setPaidAmount: (v: number) => void;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  setPaymentMethod: (v: 'cash' | 'card' | 'transfer' | 'check') => void;
  resetForm: () => void;
  globalDiscount: number;
  setGlobalDiscount: (v: number) => void;
  globalTax: number;
  setGlobalTax: (v: number) => void;
  isProcessing: boolean;
  confirmPurchase: () => void;
  editingPurchaseId: string | null;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
}

export function PurchaseSummaryFooter({
  cart,
  settings,
  selectedSupplierId,
  suppliers,
  paidAmount,
  setPaidAmount,
  paymentMethod,
  setPaymentMethod,
  resetForm,
  globalDiscount,
  setGlobalDiscount,
  globalTax,
  setGlobalTax,
  isProcessing,
  confirmPurchase,
  editingPurchaseId,
  purchaseStatus
}: PurchaseSummaryFooterProps) {
  return (
    <div className="p-8 bg-industrial-950 border-t border-industrial-800 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-6">
        <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-3xl shadow-xl space-y-4">
          <h5 className="text-[10px] font-black text-industrial-500 uppercase tracking-widest border-b border-industrial-800 pb-2">Réglage de Paiement</h5>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-industrial-500 block mb-2 uppercase tracking-widest px-1">Montant Payé</label>
              <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} className="w-full p-3 bg-industrial-950 border border-industrial-700 rounded-2xl text-emerald-400 font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-black text-industrial-500 block mb-2 uppercase tracking-widest px-1">Mode de Règlement</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full p-3 bg-industrial-950 border border-industrial-700 rounded-2xl text-white font-black uppercase text-xs tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/50">
                <option value="cash">ESPECES</option>
                <option value="card">CARTE</option>
                <option value="transfer">VIREMENT</option>
                <option value="check">CHEQUE</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={() => printPurchaseOrder({ id: 'DRAFT', items: cart, supplierName: suppliers.find(s => s.id === selectedSupplierId)?.name || 'Inconnu', total: cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0), date: new Date().toISOString() }, settings)}
            className="flex-1 gap-3 py-4 bg-industrial-800 text-industrial-300 border border-industrial-700 rounded-2xl hover:bg-industrial-700 font-black uppercase text-[10px] tracking-widest shadow-none"
          >
            <Printer size={18}/> Imprimer PO
          </Button>
          <Button onClick={() => { resetForm(); }} className="gap-3 py-4 bg-industrial-800 text-rose-400 border border-rose-500/20 rounded-2xl hover:bg-rose-500/10 font-black uppercase text-[10px] tracking-widest shadow-none"><X size={18}/> Annuler</Button>
        </div>
      </div>

      <div className="space-y-4 bg-industrial-900 border border-industrial-800 p-8 rounded-3xl shadow-xl">
        <div className="flex justify-between text-[10px] font-black uppercase text-industrial-500 tracking-widest">
          <span>Sous-total HT</span>
          <span className="text-white font-mono">{cart.reduce((sum, item) => sum + (item.costPrice * item.quantity * (1 - (item.discount || 0) / 100)), 0).toFixed(2)} {settings.currency}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Remise Globale (%)</span>
          <input 
            type="number" 
            value={globalDiscount} 
            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} 
            className="w-24 text-right p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl font-black text-indigo-600 dark:text-indigo-400 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">TVA Globale (%)</span>
          <input 
            type="number" 
            value={globalTax} 
            onChange={(e) => setGlobalTax(parseFloat(e.target.value) || 0)} 
            className="w-24 text-right p-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl font-black text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
          />
        </div>
        <div className="pt-6 border-t border-industrial-800">
          <div className="flex justify-between mb-6">
            <span className="font-black text-industrial-500 uppercase tracking-widest text-xs">Total TTC Final</span>
            <span className="font-black text-4xl text-white tracking-tighter font-mono">
              {(cart.reduce((sum, item) => sum + ((item.costPrice||0) * (item.quantity||0) * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100)), 0) * (1 - (globalDiscount||0) / 100) * (1 + (globalTax||0) / 100)).toFixed(2)}
            </span>
          </div>
          <Button 
            className="w-full py-8 industrial-button-primary text-lg" 
            disabled={isProcessing || !selectedSupplierId}
            onClick={confirmPurchase}
          >
            {isProcessing ? <RefreshCw className="animate-spin mr-3"/> : <CheckCircle2 className="mr-3" size={24}/>}
            {editingPurchaseId 
                ? 'ENREGISTRER MODIFICATION' 
                : purchaseStatus === 'completed' ? 'CONFIRMER RÉCEPTION' : 'ENREGISTRER COMMANDE'}
          </Button>
        </div>
      </div>
    </div>
  );
}
