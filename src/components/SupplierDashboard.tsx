import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef, useDeferredValue } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, LogOut, Bell, TrendingUp, History, EyeOff, LogIn, Store, Gift, Wallet, Edit2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader, SafeImage } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions, Promotion, Voucher, PurchaseOrder, POSSession } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, formatProductStock, calculateItemPrice } from '../lib/utils';
import { printReceipt, printPurchaseOrder } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

import { BarcodeScanner } from './BarcodeScanner';
import { Categories } from './Categories';
import { Brands } from './Brands';
import { ProductFormModal } from './ProductFormModal';
import { SupplierProductsTab } from './suppliers/SupplierProductsTab';
import { SupplierOrdersTab } from './suppliers/SupplierOrdersTab';
import { SupplierOrderForm } from './suppliers/SupplierOrderForm';
import { useSupplierOrder } from '../hooks/supplier/useSupplierOrder';

export const SupplierDashboard = ({ 
  supplier, 
  onLogout,
  products,
  categories,
  brands,
  settings,
  handleCreatePurchaseOrder,
  purchaseOrders,
  user,
  setIsProductModalOpen,
  setEditingProduct,
  editingProduct,
  isProductModalOpen,
  setActiveTab: setGlobalActiveTab,
  purchases,
  supplierPayments,
  setViewingPurchaseVoucher
}: { 
  supplier: Supplier; 
  onLogout: () => void;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  settings: CompanySettings;
  handleCreatePurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  purchaseOrders: PurchaseOrder[];
  user: any;
  setIsProductModalOpen: (v: boolean) => void;
  setEditingProduct: (p: Product | null) => void;
  editingProduct: Product | null;
  isProductModalOpen: boolean;
  setActiveTab: (t: string) => void;
  purchases: Purchase[];
  supplierPayments: any[];
  setViewingPurchaseVoucher: (v: any) => void;
}) => {
  const { 
    orderNumber, setOrderNumber,
    items, setItems,
    selectedProduct, setSelectedProduct,
    quantity, setQuantity,
    costPrice, setCostPrice,
    isSubmitting,
    total,
    searchQuery, setSearchQuery,
    isSearchFocused, setIsSearchFocused,
    filteredProducts,
    handleSelectProduct,
    handleAddItem,
    handleSubmit
  } = useSupplierOrder(supplier, handleCreatePurchaseOrder, products, purchaseOrders);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new-order' | 'products' | 'orders'>('new-order');

  const handleBarcodeScan = (barcode: string) => {
    setSearchQuery(barcode);
    setIsScannerOpen(false);
    if (activeTab === 'new-order') {
      const cleanBarcode = barcode.trim().toLowerCase();
      const availableProducts = supplier.hasFullInventoryAccess ? products : products.filter(p => p.supplier === supplier.name);
      const exactMatch = availableProducts.find(p => p.sku && p.sku.toLowerCase() === cleanBarcode);
      if (exactMatch) {
        handleSelectProduct(exactMatch);
      }
    }
  };

  const myOrders = useMemo(() => {
    return purchaseOrders.filter(o => o.supplierId === supplier.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, supplier.id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">{settings.name} - Portail Fournisseur</h1>
              <p className="text-xs text-slate-500">Bienvenue, {supplier.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('new-order')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'new-order' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Nouvelle Commande
              </button>
              <button 
                onClick={() => setActiveTab('products')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'products' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Mes Produits
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'orders' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Mes Commandes
              </button>
            </div>
            <button 
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-sm"
            >
              <Package size={18} /> Nouveau Produit
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm"
            >
              <LogOut size={18} /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="w-full min-h-screen">
        {activeTab === 'products' ? (
          <SupplierProductsTab 
            supplier={supplier}
            products={products}
            settings={settings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setIsScannerOpen={setIsScannerOpen}
            setEditingProduct={setEditingProduct}
            setIsProductModalOpen={setIsProductModalOpen}
          />
        ) : activeTab === 'orders' ? (
          <SupplierOrdersTab
            myOrders={myOrders}
            settings={settings}
          />
        ) : (
          <SupplierOrderForm 
              settings={settings}
              orderNumber={orderNumber} setOrderNumber={setOrderNumber}
              items={items} setItems={setItems}
              selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct}
              quantity={quantity} setQuantity={setQuantity}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              isSearchFocused={isSearchFocused} setIsSearchFocused={setIsSearchFocused}
              filteredProducts={filteredProducts}
              costPrice={costPrice} setCostPrice={setCostPrice}
              handleSelectProduct={handleSelectProduct}
              handleAddItem={handleAddItem}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              total={total}
              setIsScannerOpen={setIsScannerOpen}
          />
        )}
      
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
      
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
        editingProduct={editingProduct}
        products={products}
        categories={categories}
        settings={settings}
        user={user}
        brands={brands}
        setActiveTab={setGlobalActiveTab}
      />
    </main>
  </div>
);
};
