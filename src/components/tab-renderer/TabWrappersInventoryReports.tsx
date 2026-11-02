import React, { lazy } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useFinanceStore } from '../../store/useFinanceStore';

const DetailedReports = lazy(() => import('../DetailedReports').then(m => ({ default: m.DetailedReports })));
const ExpiryManager = lazy(() => import('../ExpiryManager').then(m => ({ default: m.ExpiryManager })));
const InventorySettings = lazy(() => import('../InventorySettings').then(m => ({ default: m.InventorySettings })));
const VoucherManager = lazy(() => import('../VoucherManager').then(m => ({ default: m.VoucherManager })));
const GRNManager = lazy(() => import('../GRNManager').then(m => ({ default: m.GRNManager })));
const InventoryAudit = lazy(() => import('../InventoryAudit').then(m => ({ default: m.InventoryAudit })));
const Promotions = lazy(() => import('../Promotions').then(m => ({ default: m.Promotions })));
const Customers = lazy(() => import('../Customers').then(m => ({ default: m.Customers })));
const Suppliers = lazy(() => import('../Suppliers').then(m => ({ default: m.Suppliers })));
const MarketingPosters = lazy(() => import('../MarketingPosters').then(m => ({ default: m.MarketingPosters })));

export const DetailedReportsTab: React.FC<any> = (props) => {
  const transactions = useTransactionStore(s => s.transactions);
  const products = useCoreStore(s => s.products);
  const employees = usePeopleStore(s => s.employees);
  const expenses = useFinanceStore(s => s.expenses);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  const returns = useTransactionStore(s => s.returns);
  const settings = useCoreStore(s => s.settings);
  const categories = useCoreStore(s => s.categories);
  const customers = usePeopleStore(s => s.customers);
  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  return (
    <DetailedReports
      transactions={transactions || []}
      products={products || []}
      employees={employees || []}
      expenses={expenses || []}
      supplierPayments={supplierPayments || []}
      returns={returns || []}
      settings={settings || {}}
      categories={categories || []}
      customers={customers || []}
      stockAdjustments={stockAdjustments || []}
      setEditingProduct={props.setEditingProduct}
      setIsProductModalOpen={props.setIsProductModalOpen}
    />
  );
};

export const ExpiryManagerTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  return (
    <ExpiryManager
      products={products || []}
      categories={categories || []}
      onUpdateProduct={props.onUpdateProduct}
      onAdjustStock={props.onAdjustStock}
      onEditProduct={props.onEditProduct}
    />
  );
};

export const InventorySettingsTab: React.FC<any> = (props) => {
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const products = useCoreStore(s => s.products);
  return (
    <InventorySettings
      categories={categories || []}
      brands={brands || []}
      products={products || []}
      onAddCategory={props.onAddCategory}
      onEditCategory={props.onEditCategory}
      onDeleteCategory={props.onDeleteCategory}
      onAddBrand={props.onAddBrand}
      onEditBrand={props.onEditBrand}
      onDeleteBrand={props.onDeleteBrand}
    />
  );
};

export const MarketingTab: React.FC<any> = () => {
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  return <MarketingPosters products={products || []} settings={settings || {}} />;
};

export const VoucherTab: React.FC<any> = () => {
  const customers = usePeopleStore(s => s.customers);
  return <VoucherManager customers={customers || []} />;
};

export const GRNManagerTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const suppliers = usePeopleStore(s => s.suppliers);
  const settings = useCoreStore(s => s.settings);
  return (
    <GRNManager
      products={products || []}
      suppliers={suppliers || []}
      setIsProductModalOpen={props.setIsProductModalOpen}
      setEditingProduct={props.setEditingProduct}
      settings={settings || {}}
    />
  );
};

export const InventoryAuditTab: React.FC<any> = () => {
  const audits = useInventoryStore(s => s.audits);
  const products = useCoreStore(s => s.products);
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <InventoryAudit audits={audits || []} products={products || []} user={user} settings={settings || {}} />;
};

export const PromotionsTab: React.FC<any> = () => {
  const promotions = useCoreStore(s => s.promotions);
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  const transactions = useTransactionStore(s => s.transactions);
  const settings = useCoreStore(s => s.settings);
  return (
    <Promotions
      promotions={Array.isArray(promotions) ? promotions.filter(Boolean) : []}
      products={products || []}
      categories={categories || []}
      transactions={transactions || []}
      settings={settings || {}}
    />
  );
};

export const CustomersTab: React.FC<any> = (props) => {
  const customers = usePeopleStore(s => s.customers);
  const transactions = useTransactionStore(s => s.transactions);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  const expenses = useFinanceStore(s => s.expenses);
  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  const categories = useCoreStore(s => s.categories);
  return (
    <Customers
      customers={customers || []}
      transactions={transactions || []}
      settings={settings || {}}
      onRestore={props.onRestore || props.loadTransactionToCart}
      products={products || []}
      expenses={expenses || []}
      stockAdjustments={stockAdjustments || []}
      categories={categories || []}
    />
  );
};

export const SuppliersTab: React.FC<any> = (props) => {
  const suppliers = usePeopleStore(s => s.suppliers);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const purchases = useFinanceStore(s => s.purchases);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  const categories = useCoreStore(s => s.categories);
  const user = useAuthStore(s => s.user);
  const damagedItems = useInventoryStore(s => s.damagedItems);
  return (
    <Suppliers
      suppliers={suppliers || []}
      products={products || []}
      settings={settings || {}}
      purchases={purchases || []}
      supplierPayments={supplierPayments || []}
      setViewingPurchaseVoucher={props.setViewingPurchaseVoucher}
      categories={categories || []}
      user={user}
      damagedItems={damagedItems || []}
    />
  );
};
