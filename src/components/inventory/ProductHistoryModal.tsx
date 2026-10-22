import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingCart, ShoppingBag, History, Eye, RotateCcw, Image as ImageIcon, FileText, X, ZoomIn } from 'lucide-react';
import { Button, Modal } from '../ui';
import { SafeImage } from '../ui/SafeImage';
import { Product, Transaction, Purchase, CompanySettings } from '../../types';
import { cn, safeGetItems } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { usePeopleStore } from '../../store/usePeopleStore';

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
  transactions,
  purchases,
  settings,
  setViewingPurchaseVoucher
}: ProductHistoryModalProps) {
  const [historyTab, setHistoryTab] = useState<'sales' | 'purchases' | 'price' | 'returns'>('sales');
  const [zoomedVoucherImage, setZoomedVoucherImage] = useState<string | null>(null);

  const returns = useTransactionStore(s => s.returns) || [];
  const goodsReceiptNotes: any[] = useInventoryStore((s: any) => s.goodsReceiptNotes) || [];
  const suppliers = usePeopleStore(s => s.suppliers) || [];

  const getRecordItems = (record: any): any[] => safeGetItems(record);

  // Vérifie si un item de facture/vente/BR correspond au produit inspecté (par ID, SKU, code-barres ou Nom normalisé)
  const isMatchingProductItem = (item: any, product: Product): boolean => {
    if (!item || !product) return false;
    if (item.productId && item.productId === product.id) return true;
    if (item.id && item.id === product.id) return true;
    if (product.sku && item.sku && String(item.sku).trim().toLowerCase() === String(product.sku).trim().toLowerCase()) return true;
    if (product.barcode && item.barcode && String(item.barcode).trim().toLowerCase() === String(product.barcode).trim().toLowerCase()) return true;
    const itemName = String(item.name || item.productName || '').trim().toLowerCase();
    const prodName = String(product.name || '').trim().toLowerCase();
    if (itemName && prodName && itemName === prodName) return true;
    return false;
  };

  // Récupère l'URL de la photo scannée du bon d'achat (depuis documents, invoiceImageUrl ou cache local)
  const getPurchaseScannedImage = (p: any): string => {
    if (!p) return '';
    if (p.invoiceImageUrl) return p.invoiceImageUrl;
    if (Array.isArray(p.documents) && p.documents.length > 0) {
      const imgDoc = p.documents.find((d: any) => d?.url);
      if (imgDoc?.url) return imgDoc.url;
    }
    try {
      const rawCache = localStorage.getItem('nexus_scanned_vouchers_v1');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (p.id && parsed[p.id]) return parsed[p.id];
        if (p.invoiceNumber && parsed[p.invoiceNumber]) return parsed[p.invoiceNumber];
      }
    } catch (_) {}
    return '';
  };

  const productSales = useMemo(() => {
    if (!viewingHistoryProduct) return [];
    return (transactions || []).filter(t => {
      const items = getRecordItems(t);
      return items.some(i => isMatchingProductItem(i, viewingHistoryProduct));
    });
  }, [transactions, viewingHistoryProduct]);

  const productReturns = useMemo(() => {
    if (!viewingHistoryProduct) return [];
    return (returns || []).filter(r => {
      const items = getRecordItems(r);
      return items.some(i => isMatchingProductItem(i, viewingHistoryProduct));
    });
  }, [returns, viewingHistoryProduct]);

  // Fusionner les Achats (SmartPurchase) ET les Bons de Réception (GRN) pour ce produit
  const productPurchases = useMemo(() => {
    if (!viewingHistoryProduct) return [];
    const fromPurchases = (purchases || []).filter(p => {
      const items = getRecordItems(p);
      return items.some(i => isMatchingProductItem(i, viewingHistoryProduct));
    });

    const existingIds = new Set(fromPurchases.map(p => p.id));
    const fromGrns: Purchase[] = (goodsReceiptNotes || [])
      .filter((grn: any) => {
        if (!grn || existingIds.has(grn.id)) return false;
        const items = getRecordItems(grn);
        return items.some(i => isMatchingProductItem(i, viewingHistoryProduct));
      })
      .map((grn: any) => {
        const supName = suppliers.find(s => s.id === grn.supplierId)?.name || grn.supplierName || 'Fournisseur BR';
        const items = getRecordItems(grn);
        const total = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.costPrice ?? it.price) || 0), 0);
        return {
          id: grn.id,
          supplierId: grn.supplierId || '',
          supplierName: supName,
          items,
          invoiceNumber: grn.invoiceNumber || `BR-${String(grn.id).slice(-6).toUpperCase()}`,
          total,
          date: grn.date || new Date().toISOString(),
          status: 'completed'
        } as Purchase;
      });

    return [...fromPurchases, ...fromGrns].sort(
      (a, b) => new Date(b.date || (b as any).created_at || 0).getTime() - new Date(a.date || (a as any).created_at || 0).getTime()
    );
  }, [purchases, goodsReceiptNotes, suppliers, viewingHistoryProduct]);

  // Bascule intelligente : si aucune vente mais des achats existent, ouvrir directement l'onglet "Achats & Bons"
  useEffect(() => {
    if (!viewingHistoryProduct) return;
    if (productSales.length === 0 && productPurchases.length > 0) {
      setHistoryTab('purchases');
    } else {
      setHistoryTab('sales');
    }
  }, [viewingHistoryProduct?.id, productSales.length, productPurchases.length]);

  if (!viewingHistoryProduct) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Historique du produit : ${viewingHistoryProduct.name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-left">
          {/* Barre d'onglets avec compteurs en temps réel */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'sales', label: 'Ventes', count: productSales.length, icon: ShoppingCart, color: 'text-indigo-600 dark:text-indigo-400' },
              { id: 'purchases', label: 'Achats & Bons Scannés', count: productPurchases.length, icon: ShoppingBag, color: 'text-amber-600 dark:text-amber-400' },
              { id: 'returns', label: 'Retours', count: productReturns.length, icon: RotateCcw, color: 'text-rose-600 dark:text-rose-400' },
              { id: 'price', label: 'Prix & Coût', count: (viewingHistoryProduct.priceHistory || []).length, icon: History, color: 'text-emerald-600 dark:text-emerald-400' },
            ].map((tab) => {
              const active = historyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <tab.icon size={14} className={active ? "text-white" : tab.color} />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                    active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {/* ONGLET VENTES */}
            {historyTab === 'sales' && (
              <div className="space-y-3">
                {productSales.length > 0 ? (
                  productSales
                    .sort((a, b) => new Date(b.timestamp || (b as any).created_at || 0).getTime() - new Date(a.timestamp || (a as any).created_at || 0).getTime())
                    .map((t) => {
                      const items = getRecordItems(t);
                      const item = items.find(i => isMatchingProductItem(i, viewingHistoryProduct));
                      return (
                        <div key={t.id} className="p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500/40 transition-all shadow-xs">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                              <ShoppingCart size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5">
                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Vente #{String(t.id || "").slice(-8).toUpperCase()}</p>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/20">Payé</span>
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                {format(new Date(t.timestamp || (t as any).created_at || Date.now()), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-1">
                                Client : {t.customerName || 'Client de passage'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                              {item?.quantity || 1} <span className="text-[10px] text-slate-400 uppercase">{viewingHistoryProduct.unit}</span>
                            </p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              P.U : {(item?.price || 0).toFixed(2)} {settings.currency}
                            </p>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 px-2.5 py-0.5 bg-emerald-500/10 rounded-lg inline-block">
                              Total : {((item?.quantity || 1) * (item?.price || 0)).toFixed(2)} {settings.currency}
                            </p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <ShoppingCart size={32} className="mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucune vente enregistrée pour ce produit</p>
                    {productPurchases.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoryTab('purchases')}
                        className="mt-3 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-black uppercase cursor-pointer"
                      >
                        👉 Voir les {productPurchases.length} Bon(s) d'Achat de ce produit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ONGLET RETOURS */}
            {historyTab === 'returns' && (
              <div className="space-y-3">
                {productReturns.length > 0 ? (
                  productReturns
                    .sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime())
                    .map((r) => {
                      const items = getRecordItems(r);
                      const item = items.find(i => isMatchingProductItem(i, viewingHistoryProduct));
                      const itemPrice = item?.price || 0;
                      const itemQty = item?.quantity || 0;
                      const returnDate = r.timestamp || r.date || new Date().toISOString();
                      return (
                        <div key={r.id} className="p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-rose-500/40 transition-all shadow-xs">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                              <RotateCcw size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5">
                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Retour #{String(r.id || "").slice(-8).toUpperCase()}</p>
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded border border-rose-500/20">Retourné</span>
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{format(new Date(returnDate), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                              {r.reason && <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mt-1">Motif : {r.reason}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">-{itemQty} <span className="text-[10px] text-slate-400 uppercase">{viewingHistoryProduct.unit}</span></p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">P.U : {itemPrice.toFixed(2)} {settings.currency}</p>
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-1 px-2.5 py-0.5 bg-rose-500/10 rounded-lg inline-block">Remboursé : {(itemQty * itemPrice).toFixed(2)} {settings.currency}</p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <RotateCcw size={32} className="mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucun retour enregistré pour ce produit</p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET ACHATS & BONS SCANNÉS */}
            {historyTab === 'purchases' && (
              <div className="space-y-3">
                {productPurchases.length > 0 ? (
                  productPurchases.map((p) => {
                    const items = getRecordItems(p);
                    const item = items.find(i => isMatchingProductItem(i, viewingHistoryProduct));
                    const scannedImg = getPurchaseScannedImage(p);
                    const qty = Number(item?.quantity || 1);
                    const cost = Number(item?.costPrice ?? item?.price ?? viewingHistoryProduct.costPrice ?? 0);

                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/50 transition-all shadow-xs"
                      >
                        <div className="flex items-start sm:items-center gap-4">
                          {/* Miniature Photo Bon Scanné ou Icône */}
                          {scannedImg ? (
                            <button
                              type="button"
                              onClick={() => setZoomedVoucherImage(scannedImg)}
                              className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-500/40 shrink-0 group/img cursor-pointer shadow-sm"
                              title="Cliquer pour agrandir la photo scannée du bon d'achat"
                            >
                              <SafeImage src={scannedImg} alt="Bon scanné" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn size={18} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0">
                              <ShoppingBag size={22} />
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-900 dark:text-white uppercase text-xs">
                                {p.supplierName || 'Fournisseur Standard'}
                              </p>
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold rounded border border-indigo-500/20">
                                N° {p.invoiceNumber || `BON-${String(p.id).slice(-6).toUpperCase()}`}
                              </span>
                              {scannedImg && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/20 flex items-center gap-1">
                                  <ImageIcon size={11} /> Photo Bon Scanné
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              Date de réception : {format(new Date(p.date || (p as any).created_at || Date.now()), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setViewingPurchaseVoucher(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                              >
                                <FileText size={12} /> Ouvrir le Bon Complet ({items.length} art.)
                              </button>
                              {scannedImg && (
                                <button
                                  type="button"
                                  onClick={() => setZoomedVoucherImage(scannedImg)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  <ZoomIn size={12} /> Voir Photo Scannée
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            +{qty} <span className="text-[10px] text-slate-400 uppercase">{viewingHistoryProduct.unit}</span>
                          </p>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            P.A Unitaire : <span className="font-mono font-black">{cost.toFixed(2)} {settings.currency}</span>
                          </p>
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 px-2.5 py-0.5 bg-amber-500/10 rounded-lg inline-block font-mono">
                            Total Ligne : {(qty * cost).toFixed(2)} {settings.currency}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <ShoppingBag size={32} className="mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                      Aucun bon d'achat enregistré pour ce produit
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET PRIX & COÛT */}
            {historyTab === 'price' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix d'Achat Actuel</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums font-mono">
                      {(viewingHistoryProduct.costPrice || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix de Gros Actuel</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums font-mono">
                      {(viewingHistoryProduct.wholesalePrice || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix Détail Actuel</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                      {(viewingHistoryProduct.price || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {viewingHistoryProduct.priceHistory && viewingHistoryProduct.priceHistory.length > 0 ? (
                    viewingHistoryProduct.priceHistory.map((entry: any, idx: number) => (
                      <div key={`price-history-${idx}`} className="p-3.5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
                            <History size={16} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-900 dark:text-white text-xs">
                                Vente : {(entry.price || 0).toFixed(2)} {settings.currency}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                Achat : {(entry.costPrice || 0).toFixed(2)} {settings.currency}
                              </span>
                              {entry.invoiceNumber && (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold rounded">
                                  Bon : {entry.invoiceNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {format(new Date(entry.date || Date.now()), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                              {entry.supplierName ? ` • Fournisseur : ${entry.supplierName}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      <History size={28} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucun historique de variation de prix</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={onClose} variant="secondary">Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Zoom Plein Écran pour la Photo Scannée du Bon d'Achat */}
      {zoomedVoucherImage && (
        <Modal
          isOpen={!!zoomedVoucherImage}
          onClose={() => setZoomedVoucherImage(null)}
          title="📸 Photo Scannée du Bon d'Achat (Achat Intelligent)"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 text-center">
            <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-2">
              <SafeImage
                src={zoomedVoucherImage}
                alt="Photo du bon d'achat scanné"
                className="max-w-full h-auto mx-auto rounded-lg"
                optimizeWidth={1200}
              />
            </div>
            <div className="flex justify-end gap-3">
              <a
                href={zoomedVoucherImage}
                download={`Bon_Achat_${viewingHistoryProduct.name}.jpg`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Télécharger l'image
              </a>
              <Button onClick={() => setZoomedVoucherImage(null)} variant="secondary">
                Fermer l'aperçu
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
