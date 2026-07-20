import React, { useState, memo } from 'react';
import { 
  X, Package, History, Wallet, AlertTriangle, FileText, Calendar, 
  Clock, CheckCircle2, Sparkles, Phone, Mail, Trash2, Edit, AlertCircle 
} from 'lucide-react';
import { supabase } from '../../supabase';
import { 
  Supplier, Product, CompanySettings, Category, DamagedRecord, SupplierPayment 
} from '../../types';
import { Button, Modal } from '../ui';
import { cn, formatSafe } from '../../lib/utils';
import { fr } from 'date-fns/locale';
import { SupplierDamagedTab } from './SupplierDamagedTab';
import { SupplierProductsTab } from './SupplierProductsTab';


interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingDetailsSupplier: Supplier | null;
  settings: CompanySettings;
  products: Product[];
  categories: Category[];
  purchases: any[];
  damagedItems: DamagedRecord[];
  supplierPayments: any[];
  activeDetailsTab: 'products' | 'purchases' | 'payments' | 'damaged';
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setViewingPurchaseVoucher: (p: any) => void;
  setIsPaymentModalOpen: (v: boolean) => void;
  setIsDamageModalOpen: (v: boolean) => void;
  paymentData: { amount: number, method: 'cash' | 'card' | 'transfer' | 'check', note: string, date: string };
  setPaymentData: (v: any) => void;
  poDraftItems: { productId: string; productName: string; quantity: number; price: number }[];
  setPoDraftItems: React.Dispatch<React.SetStateAction<{ productId: string; productName: string; quantity: number; price: number }[]>>;
  isPODraftOpen: boolean;
  setIsPODraftOpen: (v: boolean) => void;
  isSavingPurchaseOrder: boolean;
  handleSavePurchaseOrderDraft: () => Promise<void>;
  selectedProductForDamage: Product | null;
  setSelectedProductForDamage: (p: Product | null) => void;
  damageData: { quantity: number; reason: string };
  setDamageData: (v: any) => void;
  handleUpdateClaimStatus: (recordId: string, status: string) => Promise<void>;
  setEditingPayment: (p: SupplierPayment | null) => void;
  handlePaymentDelete: (payment: SupplierPayment) => Promise<void>;
  togglePoDraftItem: (product: Product, supplierName: string) => void;
}

export const SupplierDetailsModal = memo(function SupplierDetailsModal({
  isOpen,
  onClose,
  viewingDetailsSupplier,
  settings,
  products,
  categories,
  purchases,
  damagedItems,
  supplierPayments,
  activeDetailsTab,
  setActiveDetailsTab,
  setViewingPurchaseVoucher,
  setIsPaymentModalOpen,
  setIsDamageModalOpen,
  paymentData,
  setPaymentData,
  poDraftItems,
  setPoDraftItems,
  isPODraftOpen,
  setIsPODraftOpen,
  isSavingPurchaseOrder,
  handleSavePurchaseOrderDraft,
  selectedProductForDamage,
  setSelectedProductForDamage,
  damageData,
  setDamageData,
  handleUpdateClaimStatus,
  setEditingPayment,
  handlePaymentDelete,
  togglePoDraftItem
}: SupplierDetailsModalProps) {
  if (!viewingDetailsSupplier) return null;

  const lowStockProducts = products.filter(p => p.supplier === viewingDetailsSupplier.name && p.stock <= (p.minStock || 5));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={null}
      maxWidth="max-w-[96vw]"
      maxHeight="max-h-[96vh]"
      padding="p-0"
    >
      <div className="flex flex-col bg-[#0a0a0f] h-[96vh] max-h-[96vh] overflow-hidden text-white text-left">
        {/* Header */}
        <header className="bg-white/5 px-10 pt-10 pb-8 border-b border-white/10 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white z-10 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <X size={24} />
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6 text-left">
              <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl relative group overflow-hidden">
                <span className="relative z-10">{viewingDetailsSupplier.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2 uppercase font-sans">{viewingDetailsSupplier.name}</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-emerald-500/20">Actif</span>
                  {viewingDetailsSupplier.hasFullInventoryAccess && (
                    <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-indigo-500/20">Accès Total</span>
                  )}
                  <div className="h-4 w-px bg-white/10"></div>
                  <span className="text-sm font-bold text-white/40 flex items-center gap-2">
                    <Phone size={14} className="text-white/20" /> {viewingDetailsSupplier.phone || 'N/A'}
                  </span>
                  <span className="text-sm font-bold text-white/40 flex items-center gap-2">
                    <Mail size={14} className="text-white/20" /> {viewingDetailsSupplier.email || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/5 p-5 px-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col justify-center min-w-[200px]">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Dette Globale</p>
                <p className="text-3xl font-black text-rose-500 leading-none font-mono">
                  {Number(viewingDetailsSupplier.balance || 0).toFixed(2)} <span className="text-sm font-medium">{settings.currency}</span>
                </p>
              </div>
              <Button 
                onClick={() => { setPaymentData({...paymentData, amount: viewingDetailsSupplier.balance || 0}); setIsPaymentModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-20 rounded-[2rem] flex flex-col items-center justify-center shadow-2xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:translate-y-0 text-left"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Effectuer</span>
                <span className="text-lg font-black whitespace-nowrap">VERSEMENT</span>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl w-fit border border-white/10">
            {[
              { id: 'products', label: 'Catalogue', icon: Package },
              { id: 'damaged', label: 'Dommages', icon: AlertTriangle },
              { id: 'purchases', label: 'Réceptions', icon: History },
              { id: 'payments', label: 'Finances', icon: Wallet }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDetailsTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-4 sm:px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 cursor-pointer",
                  activeDetailsTab === tab.id 
                    ? "bg-white text-black shadow-lg" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </header>        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-[#0a0a0f]">
          {activeDetailsTab === 'products' && (
            <SupplierProductsTab
              products={products}
              supplier={viewingDetailsSupplier}
              settings={settings}
              categories={categories}
              isPODraftOpen={isPODraftOpen}
              setIsPODraftOpen={setIsPODraftOpen}
              poDraftItems={poDraftItems}
              setPoDraftItems={setPoDraftItems}
              togglePoDraftItem={togglePoDraftItem}
              isSavingPurchaseOrder={isSavingPurchaseOrder}
              handleSavePurchaseOrderDraft={handleSavePurchaseOrderDraft}
              setSelectedProductForDamage={setSelectedProductForDamage}
              setDamageData={setDamageData}
              setIsDamageModalOpen={setIsDamageModalOpen}
            />
          )}

          {activeDetailsTab === 'purchases' && (
            <div className="space-y-6 text-left">
              <div className="grid grid-cols-1 gap-4">
                {purchases
                  .filter(p => p.supplierId === viewingDetailsSupplier.id)
                  .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(p => {
                    const remaining = Number(p.total || 0) - Number(p.paidAmount || 0);
                    return (
                      <div key={p.id} className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group text-left">
                        <div className="flex items-center gap-4 sm:gap-8">
                          <div className="w-12 h-12 sm:w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                            <FileText size={32} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none font-sans">BR-{p.id.slice(-6).toUpperCase()}</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                p.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                              )}>
                                {p.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-6">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Calendar size={14} className="opacity-40" /> {formatSafe(p.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Clock size={14} className="opacity-40" /> {formatSafe(p.date, 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 sm:gap-12 self-end md:self-auto text-left">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total</p>
                            <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">{Number(p.total || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right pr-4 sm:pr-6 border-r border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Reste</p>
                            <p className={cn("text-lg sm:text-xl font-black tracking-tight font-mono", remaining > 0 ? "text-rose-600" : "text-emerald-500")}>
                              {Number(remaining || 0).toFixed(2)}
                            </p>
                          </div>
                          <Button 
                            onClick={() => { onClose(); setViewingPurchaseVoucher(p); }}
                            className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900 font-black rounded-2xl h-12 sm:h-14 px-4 sm:px-8 shadow-sm text-xs sm:text-sm cursor-pointer"
                          >
                            VOIR
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeDetailsTab === 'damaged' && (
            <SupplierDamagedTab
              damagedItems={damagedItems}
              products={products}
              viewingDetailsSupplier={viewingDetailsSupplier}
              settings={settings}
              setSelectedProductForDamage={setSelectedProductForDamage}
              setDamageData={setDamageData}
              setIsDamageModalOpen={setIsDamageModalOpen}
              handleUpdateClaimStatus={handleUpdateClaimStatus}
            />
          )}

          {activeDetailsTab === 'payments' && (
            <div className="space-y-10 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-emerald-600 p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group text-left">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-4">Total Versement</p>
                    <p className="text-4xl sm:text-6xl font-black mb-1 tracking-tighter font-mono">
                      {Number(supplierPayments
                        .filter(pm => pm.supplierId === viewingDetailsSupplier.id)
                        .reduce((sum, pm) => sum + Number(pm.amount || 0), 0) || 0)
                        .toFixed(2)} <span className="text-xl sm:text-2xl font-medium opacity-50">{settings.currency}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-xl flex flex-col justify-between text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Actions Financières</p>
                  <Button 
                    onClick={() => { setPaymentData({...paymentData, amount: 0, date: new Date().toISOString()}); setIsPaymentModalOpen(true); }}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-3xl shadow-2xl transition-all cursor-pointer text-center"
                  >
                    NOUVEAU VERSEMENT
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-[1.5rem] sm:rounded-[3rem] border border-slate-200 shadow-sm text-left">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 sm:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                      <th className="px-6 sm:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-sans">Montant</th>
                      <th className="px-6 sm:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-800">
                    {supplierPayments
                      .filter(pm => pm.supplierId === viewingDetailsSupplier.id)
                      .map(payment => (
                        <tr key={payment.id}>
                          <td className="px-6 sm:px-10 py-6">
                            <p className="text-sm font-black">{formatSafe(payment.date, 'dd/MM/yyyy')}</p>
                          </td>
                          <td className="px-6 sm:px-10 py-6 font-mono font-bold text-lg text-emerald-600">
                            {Number(payment.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 sm:px-10 py-6">
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingPayment(payment); setIsPaymentModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-55 rounded-lg cursor-pointer">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handlePaymentDelete(payment)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});
