import React, { Suspense, lazy } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { 
  Transaction, Product, Customer, CompanySettings, Category, Brand, 
  UserProfile, Purchase, ProductReturn 
} from '../types';
import { PurchaseVoucherViewerModal } from './modals/PurchaseVoucherViewerModal';
import { AppTaxonomyModals } from './modals/AppTaxonomyModals';

const ReturnModal = lazy(() => import('./ReturnModal').then(m => ({ default: m.ReturnModal })));
const EditTransactionModal = lazy(() => import('./EditTransactionModal').then(m => ({ default: m.EditTransactionModal })));
const PriceCheckerModal = lazy(() => import('./PriceCheckerModal').then(m => ({ default: m.PriceCheckerModal })));
const PrintStorePosterModal = lazy(() => import('./public-price-checker').then(m => ({ default: m.PrintStorePosterModal })));
const POSCustomerModal = lazy(() => import('./POSCustomerModal').then(m => ({ default: m.POSCustomerModal })));
const ProductFormModal = lazy(() => import('./ProductFormModal').then(m => ({ default: m.ProductFormModal })));
const AddStaffModal = lazy(() => import('./AddStaffModal').then(m => ({ default: m.AddStaffModal })));
const LowStockModal = lazy(() => import('./LowStockModal').then(m => ({ default: m.LowStockModal })));
const ExpirationModal = lazy(() => import('./ExpirationModal').then(m => ({ default: m.ExpirationModal })));
const StockAdjustmentModal = lazy(() => import('./StockAdjustmentModal').then(m => ({ default: m.StockAdjustmentModal })));

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

export const AppModals: React.FC<Omit<AppModalsProps, 'user' | 'products' | 'settings' | 'categories' | 'brands' | 'returns' | 'customers' | 'expiringProducts' | 'lowStockProducts'> & { expiringProducts?: Product[]; lowStockProducts?: Product[] }> = ({
  expiringProducts: propExpiringProducts,
  lowStockProducts: propLowStockProducts,
  ...props
}) => {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const returns = useTransactionStore(s => s.returns);
  const customers = usePeopleStore(s => s.customers);
  const expiringProducts = propExpiringProducts ?? [];
  const lowStockProducts = propLowStockProducts ?? [];

  const p: AppModalsProps = {
    ...props,
    user: profile ?? (user && 'role' in user ? (user as UserProfile) : null),
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

      <AppTaxonomyModals
        isCategoryModalOpen={p.isCategoryModalOpen}
        setIsCategoryModalOpen={p.setIsCategoryModalOpen}
        editingCategory={p.editingCategory}
        setEditingCategory={p.setEditingCategory}
        newCategoryName={p.newCategoryName}
        setNewCategoryName={p.setNewCategoryName}
        parentCategoryId={p.parentCategoryId}
        setParentCategoryId={p.setParentCategoryId}
        categoryImageUrl={p.categoryImageUrl}
        setCategoryImageUrl={p.setCategoryImageUrl}
        handleSaveCategory={p.handleSaveCategory}
        handleDeleteCategory={p.handleDeleteCategory}
        categories={p.categories}
        isBrandModalOpen={p.isBrandModalOpen}
        setIsBrandModalOpen={p.setIsBrandModalOpen}
        editingBrand={p.editingBrand}
        setEditingBrand={p.setEditingBrand}
        newBrandName={p.newBrandName}
        setNewBrandName={p.setNewBrandName}
        newBrandLogo={p.newBrandLogo}
        setNewBrandLogo={p.setNewBrandLogo}
        newBrandDesc={p.newBrandDesc}
        setNewBrandDesc={p.setNewBrandDesc}
        handleSaveBrand={p.handleSaveBrand}
        brands={p.brands}
      />

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

      <PurchaseVoucherViewerModal
        voucher={p.viewingPurchaseVoucher}
        onClose={() => p.setViewingPurchaseVoucher(null)}
        settings={p.settings}
      />

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
    </>
  );
};
