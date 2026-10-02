import React, { Suspense, lazy } from 'react';
import { Printer } from 'lucide-react';
import { printPurchaseVoucher } from '../services/printService';
import { fr } from 'date-fns/locale';
import { formatSafe, safeGetItems } from '../lib/utils';
import { Button, Modal } from './ui';

const ReturnModal = lazy(() => import('./ReturnModal').then(m => ({ default: m.ReturnModal })));
const EditTransactionModal = lazy(() => import('./EditTransactionModal').then(m => ({ default: m.EditTransactionModal })));
const CategoryModal = lazy(() => import('./CategoryModal').then(m => ({ default: m.CategoryModal })));
const BrandModal = lazy(() => import('./BrandModal').then(m => ({ default: m.BrandModal })));
const PriceCheckerModal = lazy(() => import('./PriceCheckerModal').then(m => ({ default: m.PriceCheckerModal })));
const PrintStorePosterModal = lazy(() => import('./public-price-checker').then(m => ({ default: m.PrintStorePosterModal })));
const POSCustomerModal = lazy(() => import('./POSCustomerModal').then(m => ({ default: m.POSCustomerModal })));
const ProductFormModal = lazy(() => import('./ProductFormModal').then(m => ({ default: m.ProductFormModal })));
const AddStaffModal = lazy(() => import('./AddStaffModal').then(m => ({ default: m.AddStaffModal })));
const LowStockModal = lazy(() => import('./LowStockModal').then(m => ({ default: m.LowStockModal })));
const ExpirationModal = lazy(() => import('./ExpirationModal').then(m => ({ default: m.ExpirationModal })));
const StockAdjustmentModal = lazy(() => import('./StockAdjustmentModal').then(m => ({ default: m.StockAdjustmentModal })));

import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useProductStats } from '../hooks/useAppPermissionsAndStats';
import { 
  Transaction, Product, Customer, CompanySettings, Category, Brand, 
  UserProfile, Purchase, ProductReturn 
} from '../types';

interface AppModalsProps {
  isReturnModalOpen: boolean;
  setIsReturnModalOpen: (open: boolean) => void;
  selectedTransactionForReturn: Transaction | null;
  setSelectedTransactionForReturn: (t: Transaction | null) => void;
  user: UserProfile | null;
  products: Product[];
  customers: Customer[];
  settings: CompanySettings;
  returns: ProductReturn[];
  isEditTransactionModalOpen: boolean;
  setIsEditTransactionModalOpen: (open: boolean) => void;
  selectedTransactionForEdit: Transaction | null;
  setSelectedTransactionForEdit: (t: Transaction | null) => void;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (c: Category | null) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  parentCategoryId: string;
  setParentCategoryId: (id: string) => void;
  categoryImageUrl: string;
  setCategoryImageUrl: (url: string) => void;
  handleSaveCategory: () => Promise<void>;
  handleDeleteCategory: (category: Category) => Promise<void>;
  categories: Category[];
  isBrandModalOpen: boolean;
  setIsBrandModalOpen: (open: boolean) => void;
  editingBrand: Brand | null;
  setEditingBrand: (b: Brand | null) => void;
  newBrandName: string;
  setNewBrandName: (name: string) => void;
  newBrandLogo: string;
  setNewBrandLogo: (logo: string) => void;
  newBrandDesc: string;
  setNewBrandDesc: (desc: string) => void;
  handleSaveBrand: (e: React.FormEvent) => Promise<void>;
  brands: Brand[];
  isPriceCheckerModalOpen: boolean;
  setIsPriceCheckerModalOpen: (open: boolean) => void;
  isStorePosterModalOpen?: boolean;
  setIsStorePosterModalOpen?: (open: boolean) => void;
  isPOSCustomerModalOpen: boolean;
  setIsPOSCustomerModalOpen: (open: boolean) => void;
  handlePOSCustomerCreated: (customer: Customer) => void;
  isProductModalOpen: boolean;
  setIsProductModalOpen: (open: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
  setActiveTab: (tab: string) => void;
  isAddUserModalOpen: boolean;
  setIsAddUserModalOpen: (open: boolean) => void;
  handleAddStaffManual: (name: string, email: string, role: string, phone?: string, password?: string) => Promise<void>;
  viewingPurchaseVoucher: Purchase | null;
  setViewingPurchaseVoucher: (p: Purchase | null) => void;
  isLowStockModalOpen: boolean;
  setIsLowStockModalOpen: (open: boolean) => void;
  lowStockProducts: Product[];
  isExpirationModalOpen: boolean;
  setIsExpirationModalOpen: (open: boolean) => void;
  expiringProducts: Product[];
  isStockAdjustmentModalOpen: boolean;
  setIsStockAdjustmentModalOpen: (open: boolean) => void;
}

export const AppModals: React.FC<Omit<AppModalsProps, 'user' | 'products' | 'settings' | 'categories' | 'brands' | 'returns' | 'customers' | 'expiringProducts' | 'lowStockProducts'>> = ({
  ...props
}) => {
  const user = useAuthStore(s => s.user);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const returns = useTransactionStore(s => s.returns);
  const customers = usePeopleStore(s => s.customers);
  const { expiringProducts, lowStockProducts } = useProductStats();

  const p: AppModalsProps = {
    ...props,
    user: user ?? null,
    products: products ?? [],
    settings: settings ?? ({} as CompanySettings),
    categories: categories ?? [],
    brands: brands ?? [],
    returns: returns ?? [],
    customers: customers ?? [],
    expiringProducts: expiringProducts ?? [],
    lowStockProducts: lowStockProducts ?? [],
  };

  return (
    <>
      {p.isReturnModalOpen && (
        <Suspense fallback={null}>
          <ReturnModal 
            isOpen={p.isReturnModalOpen} 
            onClose={() => { p.setIsReturnModalOpen(false); p.setSelectedTransactionForReturn(null); }}
            transaction={p.selectedTransactionForReturn}
            user={p.user}
            products={p.products}
            customers={p.customers}
            settings={p.settings}
            allReturns={p.returns}
            />
        </Suspense>
      )}

      {p.isEditTransactionModalOpen && (
        <Suspense fallback={null}>
          <EditTransactionModal
            isOpen={p.isEditTransactionModalOpen}
            onClose={() => { p.setIsEditTransactionModalOpen(false); p.setSelectedTransactionForEdit(null); }}
            transaction={p.selectedTransactionForEdit}
            products={p.products}
            settings={p.settings}
            />
        </Suspense>
      )}

      {p.isCategoryModalOpen && (
        <Suspense fallback={null}>
          <CategoryModal 
            isOpen={p.isCategoryModalOpen} 
            onClose={() => {
              p.setIsCategoryModalOpen(false);
              p.setEditingCategory(null);
              p.setNewCategoryName('');
              p.setParentCategoryId('');
              p.setCategoryImageUrl('');
            }}
            onSave={p.handleSaveCategory}
            onDelete={() => {
              if (p.editingCategory) p.handleDeleteCategory(p.editingCategory);
            }}
            name={p.newCategoryName}
            setName={p.setNewCategoryName}
            parentId={p.parentCategoryId}
            setParentId={p.setParentCategoryId}
            imageUrl={p.categoryImageUrl}
            setImageUrl={p.setCategoryImageUrl}
            categories={p.categories}
            editingCategory={p.editingCategory}
            />
        </Suspense>
      )}

      {p.isBrandModalOpen && (
        <Suspense fallback={null}>
          <BrandModal
            isOpen={p.isBrandModalOpen}
            onClose={() => {
              p.setIsBrandModalOpen(false);
              p.setEditingBrand(null);
              p.setNewBrandName('');
              p.setNewBrandLogo('');
              p.setNewBrandDesc('');
            }}
            onSave={p.handleSaveBrand}
            name={p.newBrandName}
            setName={p.setNewBrandName}
            logo={p.newBrandLogo}
            setLogo={p.setNewBrandLogo}
            description={p.newBrandDesc}
            setDescription={p.setNewBrandDesc}
            editingBrand={p.editingBrand}
            />
        </Suspense>
      )}

      {p.isPriceCheckerModalOpen && (
        <Suspense fallback={null}>
          <PriceCheckerModal 
            isOpen={p.isPriceCheckerModalOpen} 
            onClose={() => p.setIsPriceCheckerModalOpen(false)} 
            products={p.products} 
            settings={p.settings}
            categories={p.categories}
            brands={p.brands}
            />
        </Suspense>
      )}

      {p.isStorePosterModalOpen && (
        <Suspense fallback={null}>
          <PrintStorePosterModal
            isOpen={p.isStorePosterModalOpen}
            onClose={() => p.setIsStorePosterModalOpen?.(false)}
            settings={p.settings}
          />
        </Suspense>
      )}

      {p.isPOSCustomerModalOpen && (
        <Suspense fallback={null}>
          <POSCustomerModal
            isOpen={p.isPOSCustomerModalOpen}
            onClose={() => p.setIsPOSCustomerModalOpen(false)}
            onCreated={p.handlePOSCustomerCreated}
            />
        </Suspense>
      )}
      
      {p.isProductModalOpen && (
        <Suspense fallback={null}>
          <ProductFormModal
            isOpen={p.isProductModalOpen}
            onClose={() => { p.setIsProductModalOpen(false); p.setEditingProduct(null); }}
            editingProduct={p.editingProduct}
            products={p.products}
            categories={p.categories}
            settings={p.settings}
            user={p.user}
            brands={p.brands}
            setActiveTab={p.setActiveTab}
            />
        </Suspense>
      )}

      {p.isAddUserModalOpen && (
        <Suspense fallback={null}>
          <AddStaffModal 
            isOpen={p.isAddUserModalOpen} 
            onClose={() => p.setIsAddUserModalOpen(false)} 
            onSave={p.handleAddStaffManual} 
            />
        </Suspense>
      )}

      {p.viewingPurchaseVoucher && (() => {
        const v: any = p.viewingPurchaseVoucher;
        let scannedPhotoUrl = v.invoiceImageUrl || '';
        if (!scannedPhotoUrl && Array.isArray(v.documents) && v.documents.length > 0) {
          scannedPhotoUrl = v.documents.find((d: any) => d?.url)?.url || '';
        }
        if (!scannedPhotoUrl) {
          try {
            const rawCache = localStorage.getItem('nexus_scanned_vouchers_v1');
            if (rawCache) {
              const parsed = JSON.parse(rawCache);
              scannedPhotoUrl = (v.id && parsed[v.id]) || (v.invoiceNumber && parsed[v.invoiceNumber]) || '';
            }
          } catch (_) {}
        }

        return (
          <Modal 
            isOpen={!!p.viewingPurchaseVoucher} 
            onClose={() => p.setViewingPurchaseVoucher(null)} 
            title={`Bon de Réception - ${v.invoiceNumber || String(v.id || "").slice(-6).toUpperCase()}`}
            maxWidth="max-w-3xl"
          >
            <div className="space-y-5 print:p-0 text-left">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fournisseur</p>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">{v.supplierName || 'Fournisseur Standard'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatSafe(v.date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">N° Document</p>
                  <p className="text-base font-mono font-black text-indigo-600 dark:text-indigo-400">{v.invoiceNumber || 'REC-' + String(v.id || "").slice(-6).toUpperCase()}</p>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${v.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                    {v.status === 'completed' ? 'Réceptionné' : 'En attente'}
                  </span>
                </div>
              </div>

              {scannedPhotoUrl && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      📸 Photo Originale du Bon d'Achat Scanné
                    </span>
                    <a
                      href={scannedPhotoUrl}
                      download={`Bon_${v.invoiceNumber || v.id}.jpg`}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Télécharger la photo
                    </a>
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 text-center">
                    <img
                      src={scannedPhotoUrl}
                      alt="Photo du bon d'achat"
                      className="max-w-full h-auto mx-auto rounded"
                    />
                  </div>
                </div>
              )}

              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">Article</th>
                      <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-center">Qté</th>
                      <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-right">Prix Achat</th>
                      <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {safeGetItems(v).map((item: any, idx: number) => (
                      <tr key={`purchase-item-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.name || item.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Réf: {item.productId ? String(item.productId).slice(-6).toUpperCase() : 'CATALOG'}</p>
                        </td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 text-center font-black">{item.quantity}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 text-right font-mono">{Number(item.costPrice ?? item.price ?? 0).toFixed(2)} {p.settings?.currency}</td>
                        <td className="p-3 text-xs font-black text-slate-900 dark:text-white text-right font-mono">{(Number(item.quantity || 0) * Number(item.costPrice ?? item.price ?? 0)).toFixed(2)} {p.settings?.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={3} className="p-3.5 text-right text-slate-600 dark:text-slate-400 uppercase text-xs font-black">Total Général</td>
                      <td className="p-3.5 text-right text-base text-indigo-600 dark:text-indigo-400 font-black font-mono">{Number(v.total ?? v.totalAmount ?? 0).toFixed(2)} {p.settings?.currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={() => printPurchaseVoucher(v, p.settings)} variant="secondary" className="flex-1 gap-2">
                  <Printer size={16} /> Imprimer le Bon
                </Button>
                <Button onClick={() => p.setViewingPurchaseVoucher(null)} className="flex-1">
                  Fermer
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {p.isLowStockModalOpen && (
        <Suspense fallback={null}>
          <LowStockModal 
            isOpen={p.isLowStockModalOpen}
            onClose={() => p.setIsLowStockModalOpen(false)}
            products={p.lowStockProducts}
            settings={p.settings}
            />
        </Suspense>
      )}

      {p.isExpirationModalOpen && (
        <Suspense fallback={null}>
          <ExpirationModal
            isOpen={p.isExpirationModalOpen}
            onClose={() => p.setIsExpirationModalOpen(false)}
            products={p.expiringProducts}
            />
        </Suspense>
      )}

      {p.isStockAdjustmentModalOpen && (
        <Suspense fallback={null}>
          <StockAdjustmentModal
            isOpen={p.isStockAdjustmentModalOpen}
            onClose={() => { p.setIsStockAdjustmentModalOpen(false); p.setEditingProduct(null); }}
            product={p.editingProduct}
            user={p.user}
            settings={p.settings}
            />
        </Suspense>
      )}

      {p.isAddUserModalOpen && (
        <Suspense fallback={null}>
          <AddStaffModal
            isOpen={p.isAddUserModalOpen}
            onClose={() => p.setIsAddUserModalOpen(false)}
            onSave={p.handleAddStaffManual}
          />
        </Suspense>
      )}
    </>
  );
};
