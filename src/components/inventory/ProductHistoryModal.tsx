import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, ShoppingBag, History, RotateCcw } from 'lucide-react';
import { Button, Modal } from '../ui';
import { Product, Transaction, Purchase, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { getRecordItems, isMatchingProductItem } from './product-history/productHistoryHelpers';
import { ProductSalesHistoryTab } from './product-history/ProductSalesHistoryTab';
import { ProductReturnsHistoryTab } from './product-history/ProductReturnsHistoryTab';
import { ProductPurchasesHistoryTab } from './product-history/ProductPurchasesHistoryTab';
import { ProductPriceHistoryTab } from './product-history/ProductPriceHistoryTab';
import { VoucherImageZoomModal } from './product-history/VoucherImageZoomModal';

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
            {historyTab === 'sales' && (
              <ProductSalesHistoryTab
                product={viewingHistoryProduct}
                productSales={productSales}
                settings={settings}
                purchasesCount={productPurchases.length}
                onGoToPurchases={() => setHistoryTab('purchases')}
              />
            )}

            {historyTab === 'returns' && (
              <ProductReturnsHistoryTab
                product={viewingHistoryProduct}
                productReturns={productReturns}
                settings={settings}
              />
            )}

            {historyTab === 'purchases' && (
              <ProductPurchasesHistoryTab
                product={viewingHistoryProduct}
                productPurchases={productPurchases}
                settings={settings}
                onOpenVoucher={(p) => setViewingPurchaseVoucher(p)}
                onZoomImage={(url) => setZoomedVoucherImage(url)}
              />
            )}

            {historyTab === 'price' && (
              <ProductPriceHistoryTab
                product={viewingHistoryProduct}
                settings={settings}
              />
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={onClose} variant="secondary">Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Zoom Plein Écran pour la Photo Scannée du Bon d'Achat */}
      <VoucherImageZoomModal
        imageUrl={zoomedVoucherImage}
        onClose={() => setZoomedVoucherImage(null)}
        productName={viewingHistoryProduct.name}
      />
    </>
  );
}
