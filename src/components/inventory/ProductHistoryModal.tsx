import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingCart, ShoppingBag, History, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { localDb } from '../../services/LocalDatabase';
import { Button, Modal } from '../ui';
import { Product, Transaction, Purchase, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';

export interface ProductHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingHistoryProduct: Product | null;
  setViewingHistoryProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  transactions: Transaction[];
  purchases: Purchase[];
  settings: CompanySettings;
  setViewingPurchaseVoucher: (p: Purchase | null) => void;
}

export function ProductHistoryModal({
  isOpen,
  onClose,
  viewingHistoryProduct,
  setViewingHistoryProduct,
  transactions,
  purchases,
  settings,
  setViewingPurchaseVoucher
}: ProductHistoryModalProps) {
  const [historyTab, setHistoryTab] = useState<'sales' | 'purchases' | 'price' | 'returns'>('sales');
  const returns = useTransactionStore(s => s.returns) || [];

  if (!viewingHistoryProduct) return null;

  // Filter returns containing this product
  const productReturns = returns.filter(r => r.items && r.items.some(i => i.productId === viewingHistoryProduct.id));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Historique du produit: ${viewingHistoryProduct.name}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-left">
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit">
          {[
            { id: 'sales', label: 'Ventes', icon: ShoppingCart },
            { id: 'returns', label: 'Retours', icon: RotateCcw },
            { id: 'purchases', label: 'Achats', icon: ShoppingBag },
            { id: 'price', label: 'Prix & Coût', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHistoryTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer",
                historyTab === tab.id 
                  ? "bg-white/10 text-white shadow-inner ring-1 ring-white/5" 
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <tab.icon size={14} className={cn(historyTab === tab.id ? "text-indigo-400" : "")} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {historyTab === 'sales' && (
            <div className="space-y-3">
              {transactions.filter(t => t.items.some(i => i.id === viewingHistoryProduct.id)).length > 0 ? (
                transactions.filter(t => t.items.some(i => i.id === viewingHistoryProduct.id))
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((t) => {
                    const item = t.items.find(i => i.id === viewingHistoryProduct.id);
                    return (
                      <div key={t.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 hover:border-indigo-500/30 transition-all group shadow-xl">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg shadow-indigo-500/5">
                            <ShoppingCart size={24} />
                          </div>
                          <div>
                             <div className="flex items-center gap-3">
                               <p className="font-black text-white italic uppercase text-xs tracking-widest">Vente #{t.id.slice(-8).toUpperCase()}</p>
                               <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded border border-emerald-500/20">Payé</span>
                             </div>
                            <p className="text-[10px] font-medium text-white/40 mt-1">{format(new Date(t.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-2 bg-indigo-500/5 px-2 py-0.5 rounded-full inline-block">Client: {t.customerName || 'Client anonyme'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white tabular-nums">{item?.quantity} <span className="text-[10px] text-white/30 uppercase ml-1">{viewingHistoryProduct.unit}</span></p>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">P.U: {(item?.price || 0).toFixed(2)} {settings.currency}</p>
                          <p className="text-sm font-black text-emerald-400 mt-2 tracking-tighter shadow-emerald-500/20 shadow-sm px-3 py-1 bg-emerald-500/10 rounded-full inline-block">Total: {((item?.quantity || 0) * (item?.price || 0)).toFixed(2)} {settings.currency}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 text-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Aucune vente enregistrée pour ce produit</p>
                </div>
              )}
            </div>
          )}

          {historyTab === 'returns' && (
            <div className="space-y-3">
              {productReturns.length > 0 ? (
                productReturns
                  .sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime())
                  .map((r) => {
                    const item = r.items.find(i => i.productId === viewingHistoryProduct.id);
                    const itemPrice = item?.price || 0;
                    const itemQty = item?.quantity || 0;
                    const returnDate = r.timestamp || r.date || new Date().toISOString();
                    return (
                      <div key={r.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 hover:border-red-500/30 transition-all group shadow-xl">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all shadow-lg shadow-red-500/5">
                            <RotateCcw size={24} />
                          </div>
                          <div>
                             <div className="flex items-center gap-3">
                               <p className="font-black text-white italic uppercase text-xs tracking-widest">Retour #{r.id.slice(-8).toUpperCase()}</p>
                               <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[8px] font-black uppercase rounded border border-red-500/20">Retourné</span>
                             </div>
                            <p className="text-[10px] font-medium text-white/40 mt-1">{format(new Date(returnDate), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                            {r.reason && <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-2 bg-red-500/5 px-2 py-0.5 rounded-full inline-block">Raison: {r.reason}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white tabular-nums">-{itemQty} <span className="text-[10px] text-white/30 uppercase ml-1">{viewingHistoryProduct.unit}</span></p>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">P.U: {(itemPrice).toFixed(2)} {settings.currency}</p>
                          <p className="text-sm font-black text-red-400 mt-2 tracking-tighter shadow-red-500/20 shadow-sm px-3 py-1 bg-red-500/10 rounded-full inline-block">Remboursé: {(itemQty * itemPrice).toFixed(2)} {settings.currency}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 text-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <RotateCcw size={32} />
                  </div>
                  <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Aucun retour enregistré pour ce produit</p>
                </div>
              )}
            </div>
          )}

          {historyTab === 'purchases' && (
            <div className="space-y-3">
              {purchases.filter(p => p.items.some(i => i.productId === viewingHistoryProduct.id)).length > 0 ? (
                purchases.filter(p => p.items.some(i => i.productId === viewingHistoryProduct.id))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((p) => {
                    const item = p.items.find(i => i.productId === viewingHistoryProduct.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setViewingPurchaseVoucher(p)}
                        className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer group shadow-xl"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-lg shadow-amber-500/5">
                            <ShoppingBag size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-white italic uppercase text-xs tracking-widest">Achat - {p.supplierName}</p>
                              <Eye size={14} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-[10px] font-medium text-white/40 mt-1">{format(new Date(p.date), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                            {p.invoiceNumber && <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-2 bg-indigo-500/5 px-2 py-0.5 rounded-full inline-block">Fiche: {p.invoiceNumber}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white tabular-nums">+{item?.quantity} <span className="text-[10px] text-white/30 uppercase ml-1">{viewingHistoryProduct.unit}</span></p>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Coût: {(item?.costPrice || 0).toFixed(2)} {settings.currency}</p>
                          <p className="text-sm font-black text-amber-400 mt-2 tracking-tighter shadow-amber-500/20 shadow-sm px-3 py-1 bg-amber-500/10 rounded-full inline-block">Total: {((item?.quantity || 0) * (item?.costPrice || 0)).toFixed(2)} {settings.currency}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 text-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Aucun achat enregistré pour ce produit</p>
                </div>
              )}
            </div>
          )}

          {historyTab === 'price' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 pl-1">Prix de vente actuel</p>
                  <p className="text-3xl font-black text-white tabular-nums">{(viewingHistoryProduct.price || 0).toFixed(2)} <span className="text-xs text-emerald-400 font-black uppercase tracking-widest ml-1">{settings.currency}</span></p>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 pr-1">Coût d'achat actuel</p>
                  <p className="text-3xl font-black text-white tabular-nums">{(viewingHistoryProduct.costPrice || 0).toFixed(2)} <span className="text-xs text-rose-400 font-black uppercase tracking-widest ml-1">{settings.currency}</span></p>
                </div>
              </div>

              <div className="space-y-3 pr-1">
                {viewingHistoryProduct.priceHistory && viewingHistoryProduct.priceHistory.length > 0 ? (
                  viewingHistoryProduct.priceHistory.map((entry, idx) => (
                    <div key={`price-history-${idx}`} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-indigo-500/40 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
                          <History size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-black text-white text-xs uppercase leading-none">{(entry.price || 0).toFixed(2)} {settings.currency}</p>
                            <div className="h-3 w-px bg-white/15" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Coût: {(entry.costPrice || 0).toFixed(2)} {settings.currency}</span>
                          </div>
                          <p className="text-[9px] text-white/40 font-bold uppercase mt-1.5">{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                          {entry.reason && <p className="text-[8px] text-indigo-300 font-black uppercase tracking-widest mt-1.5 bg-indigo-500/10 px-2 py-0.5 rounded w-fit border border-indigo-500/15">{entry.reason}</p>}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white border-none py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer"
                        onClick={async () => {
                          if (!viewingHistoryProduct) return;
                          try {
                            const newHistory = [
                              {
                                price: viewingHistoryProduct.price,
                                costPrice: viewingHistoryProduct.costPrice || 0,
                                timestamp: new Date().toISOString(),
                                reason: 'Restauration historique'
                              },
                              ...viewingHistoryProduct.priceHistory!
                            ].slice(0, 50);

                            const newProductData = {
                              ...viewingHistoryProduct,
                              price: entry.price,
                              costPrice: entry.costPrice,
                              priceHistory: newHistory,
                              updatedAt: new Date().toISOString()
                            };
                            window.dispatchEvent(new CustomEvent('product-cache-update', { detail: newProductData }));
                            if (viewingHistoryProduct.id) {
                              await localDb.update(`products/${viewingHistoryProduct.id}`, {
                                price: entry.price,
                                costPrice: entry.costPrice,
                                updatedAt: newProductData.updatedAt
                              });
                            }
                            setViewingHistoryProduct(newProductData);
                            toast.success("Ancien prix restauré avec succès.");
                          } catch (e) {
                            console.error(e);
                            toast.error("Erreur lors de la restauration.");
                          }
                        }}
                      >
                        Restaurer
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                    <div className="w-16 h-16 bg-white/5 text-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <History size={32} />
                    </div>
                    <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Aucune modification de prix enregistrée</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
