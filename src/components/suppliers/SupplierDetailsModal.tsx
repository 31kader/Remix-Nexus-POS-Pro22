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
import { handleDeletePurchaseDb } from '../smart-purchase/purchaseDbOperations';


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
  togglePoDraftItem?: (product: Product, supplierName: string) => void;
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
  togglePoDraftItem = () => {}
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
        <header className="bg-white/5 px-6 pt-10 pb-8 border-b border-white/10 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white z-10 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <X size={24} />
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
            <div className="flex items-center gap-6 text-left">
              <div className="w-20 h-20 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-3xl font-black shadow-md relative group overflow-hidden">
                <span className="relative z-10">{String(viewingDetailsSupplier?.name || 'F').charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2 uppercase font-sans">{viewingDetailsSupplier?.name || 'Fournisseur'}</h2>
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
              <div className="bg-white/5 p-5 px-5 rounded-xl border border-white/10 shadow-md flex flex-col justify-center min-w-[200px]">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Dette Globale</p>
                <p className="text-3xl font-black text-rose-500 leading-none font-mono">
                  {Number(viewingDetailsSupplier.balance || 0).toFixed(2)} <span className="text-sm font-medium">{settings.currency}</span>
                </p>
              </div>
              <Button 
                onClick={() => { setPaymentData({...paymentData, amount: viewingDetailsSupplier.balance || 0}); setIsPaymentModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-20 rounded-xl flex flex-col items-center justify-center shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-1 active:translate-y-0 text-left"
              >
                <span className="text-[10px] font-black uppercase tracking-normal mb-1 opacity-70">Effectuer</span>
                <span className="text-lg font-black whitespace-nowrap">VERSEMENT</span>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-white/5  rounded-xl w-fit border border-white/10">
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
                  "flex items-center gap-3 px-4 sm:px-5 py-3 rounded-xl text-sm font-black transition-all duration-300 cursor-pointer",
                  activeDetailsTab === tab.id 
                    ? "bg-white dark:bg-zinc-900 text-black shadow-lg" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </header>        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0a0a0f]">
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

          {activeDetailsTab === 'purchases' && (() => {
            const supplierNameNorm = (viewingDetailsSupplier.name || '').trim().toLowerCase();
            const matchedPurchases = (purchases || [])
              .filter(p => {
                const sId = p.supplierId || p.supplier_id || '';
                const sName = (p.supplierName || p.supplier_name || '').trim().toLowerCase();
                return sId === viewingDetailsSupplier.id || (supplierNameNorm && sName === supplierNameNorm);
              })
              .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            const totalPurchasesAmount = matchedPurchases.reduce((acc, p) => acc + Number(p.total ?? p.totalAmount ?? p.total_amount ?? 0), 0);
            const totalPurchasesPaid = matchedPurchases.reduce((acc, p) => acc + Number(p.paidAmount ?? p.paid_amount ?? 0), 0);
            const totalPurchasesRemaining = Math.max(0, totalPurchasesAmount - totalPurchasesPaid);
            const currentSupplierBalance = Math.max(0, Number(viewingDetailsSupplier.balance || 0));
            const unlinkedBalance = Math.max(0, currentSupplierBalance - totalPurchasesRemaining);

            return (
              <div className="space-y-5 text-left">
                {/* Bandeau KPI Réceptions du Fournisseur */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase text-white/40">Bons Enregistrés</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{matchedPurchases.length}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase text-white/40">Volume Total Acheté</p>
                    <p className="text-2xl font-black text-indigo-400 mt-1 font-mono">{totalPurchasesAmount.toFixed(2)} {settings.currency}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase text-white/40">Total Déjà Réglé</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{totalPurchasesPaid.toFixed(2)} {settings.currency}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase text-rose-300">Dette Actuelle Fournisseur</p>
                    <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{currentSupplierBalance.toFixed(2)} {settings.currency}</p>
                  </div>
                </div>

                {/* Carte Solde Antérieur / Dette hors-bon si le solde dépasse les bons listés */}
                {unlinkedBalance > 0.5 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-amber-300 uppercase">
                          Solde Antérieur / Dette d'Ouverture Enregistrée : {unlinkedBalance.toFixed(2)} {settings.currency}
                        </p>
                        <p className="text-xs text-amber-200/70 mt-0.5">
                          Ce montant fait partie du solde impayé du fournisseur ({currentSupplierBalance.toFixed(2)} {settings.currency}) enregistré hors bon détaillé.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => { setPaymentData({ ...paymentData, amount: currentSupplierBalance }); setIsPaymentModalOpen(true); }}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2.5 rounded-xl shrink-0"
                    >
                      Régler ce solde
                    </Button>
                  </div>
                )}

                {matchedPurchases.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center space-y-2">
                    <FileText size={38} className="mx-auto text-white/25" />
                    <p className="text-base font-black text-white">Aucun bon de réception trouvé pour {viewingDetailsSupplier.name}</p>
                    <p className="text-xs text-white/50">
                      Les nouveaux bons créés dans « Approvisionnements » avec ce fournisseur apparaîtront automatiquement ici.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {matchedPurchases.map(p => {
                      const totalVal = Number(p.total ?? p.totalAmount ?? p.total_amount ?? 0);
                      const paidVal = Number(p.paidAmount ?? p.paid_amount ?? 0);
                      const remaining = Math.max(0, totalVal - paidVal);
                      const invNum = p.invoiceNumber || p.invoice_number || `BR-${String(p.id || '').slice(-6).toUpperCase()}`;
                      const itemCount = Array.isArray(p.items) ? p.items.length : 0;
                      return (
                        <div key={p.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group text-left">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                              <FileText size={26} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none font-sans">
                                  {invNum}
                                </p>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                  #{String(p.id || '').slice(-6).toUpperCase()}
                                </span>
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                  remaining <= 0
                                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                )}>
                                  {remaining <= 0 ? 'Payé' : 'Non Payé / Crédit'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                  • {itemCount} article(s)
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                                  <Calendar size={13} className="text-indigo-400" /> {formatSafe(p.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                                </div>
                                {p.notes && (
                                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
                                    — {p.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-5 sm:gap-8 self-end md:self-auto text-left">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Total Bon</p>
                              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                                {totalVal.toFixed(2)} {settings.currency}
                              </p>
                            </div>
                            <div className="text-right pr-4 border-r border-slate-200 dark:border-zinc-800">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Reste à Payer</p>
                              <p className={cn("text-base sm:text-lg font-black font-mono", remaining > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {remaining.toFixed(2)} {settings.currency}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                onClick={() => { onClose(); setViewingPurchaseVoucher({ ...p, total: totalVal, totalAmount: totalVal }); }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-11 px-4 shadow-sm text-xs cursor-pointer"
                              >
                                VOIR LE BON
                              </Button>
                              <button
                                type="button"
                                title="Supprimer ce bon et réajuster automatiquement le stock et la dette"
                                onClick={async () => {
                                  if (window.confirm(`Voulez-vous vraiment supprimer le bon "${invNum}" ?\nLes quantités reçues seront automatiquement déduites du stock et la dette fournisseur sera réajustée.`)) {
                                    await handleDeletePurchaseDb({
                                      purchaseId: p.id,
                                      setIsProcessing: () => {},
                                      setPurchaseToDelete: () => {}
                                    });
                                  }
                                }}
                                className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-emerald-600 p-5 sm:p-5 rounded-xl sm:rounded-xl text-white shadow-md flex flex-col justify-between relative overflow-hidden group text-left">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-normal opacity-70 mb-4">Total Versement</p>
                    <p className="text-4xl sm:text-6xl font-black mb-1 tracking-tighter font-mono">
                      {Number(supplierPayments
                        .filter(pm => pm.supplierId === viewingDetailsSupplier.id)
                        .reduce((sum, pm) => sum + Number(pm.amount || 0), 0) || 0)
                        .toFixed(2)} <span className="text-xl sm:text-2xl font-medium opacity-50">{settings.currency}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 sm:p-5 rounded-xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col justify-between text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-4">Actions Financières</p>
                  <Button 
                    onClick={() => { setPaymentData({...paymentData, amount: 0, date: new Date().toISOString()}); setIsPaymentModalOpen(true); }}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-xl shadow-md transition-all cursor-pointer text-center"
                  >
                    NOUVEAU VERSEMENT
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-left">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal">Date</th>
                      <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal font-sans">Montant</th>
                      <th className="px-6 sm:px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-800">
                    {supplierPayments
                      .filter(pm => pm.supplierId === viewingDetailsSupplier.id)
                      .map(payment => (
                        <tr key={payment.id}>
                          <td className="px-6 sm:px-6 py-6">
                            <p className="text-sm font-black">{formatSafe(payment.date, 'dd/MM/yyyy')}</p>
                          </td>
                          <td className="px-6 sm:px-6 py-6 font-mono font-bold text-lg text-emerald-600">
                            {Number(payment.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 sm:px-6 py-6">
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
