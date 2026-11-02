import React from 'react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { CheckoutHeader } from './CheckoutHeader';
import { BarcodeScanner } from '../BarcodeScanner';
import { CheckoutEditingBanner } from './CheckoutEditingBanner';
import { CartItemsList } from './CartItemsList';
import { CartItem, CompanySettings, Product } from '../../types';

interface CheckoutCartColumnProps {
  isMobile: boolean;
  mobileTab: 'cart' | 'catalog';
  search: string;
  setSearch: (search: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  handleBarcodeScan: (barcode: string) => void;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  filteredProducts: Product[];
  addToCart: (product: Product, quantity?: number) => void;
  isReturnMode: boolean;
  settings: CompanySettings;
  total: number;
  editingTransaction: any;
  handleCancelEditTransaction: () => void;
  currency: string;
  cart: CartItem[];
  cartEndRef: React.RefObject<HTMLDivElement>;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  removeFromCart: (cartItemId: string) => void;
  setQuantity: (cartItemId: string, quantity: number) => void;
  setEditingProduct: (product: Product | null) => void;
  setIsProductModalOpen: (open: boolean) => void;
  setDiscountingItemId: (id: string | null) => void;
  setPrice: (cartItemId: string, price: number) => void;
  isWholesale: boolean;
  permissions: any;
  products: Product[];
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

export const CheckoutCartColumn: React.FC<CheckoutCartColumnProps> = ({
  isMobile,
  mobileTab,
  search,
  setSearch,
  searchRef,
  handleBarcodeScan,
  isScannerOpen,
  setIsScannerOpen,
  filteredProducts,
  addToCart,
  isReturnMode,
  settings,
  total,
  editingTransaction,
  handleCancelEditTransaction,
  currency,
  cart,
  cartEndRef,
  selectedItemId,
  setSelectedItemId,
  removeFromCart,
  setQuantity,
  setEditingProduct,
  setIsProductModalOpen,
  setDiscountingItemId,
  setPrice,
  isWholesale,
  permissions,
  products,
  quantityInputRefs
}) => {
  return (
    <div className={cn(
      "flex-1 flex flex-col bg-slate-100 dark:bg-[#07090e] border-r border-slate-200 dark:border-white/5 relative z-0",
      isMobile && mobileTab !== 'cart' && "hidden"
    )}>
      <CheckoutHeader
        search={search}
        setSearch={setSearch}
        searchRef={searchRef}
        handleBarcodeScan={handleBarcodeScan}
        setIsScannerOpen={setIsScannerOpen}
        filteredProducts={filteredProducts}
        addToCart={addToCart}
        isReturnMode={isReturnMode}
        settings={settings}
        total={total}
      />

      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-[200]">
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setIsScannerOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Bannière en cas d'édition de ticket existant */}
      <CheckoutEditingBanner
        editingTransaction={editingTransaction}
        onCancelEditTransaction={handleCancelEditTransaction}
        currency={currency}
      />

      <CartItemsList 
        cart={cart}
        cartEndRef={cartEndRef}
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        removeFromCart={removeFromCart}
        setQuantity={setQuantity}
        setEditingProduct={setEditingProduct}
        setIsProductModalOpen={setIsProductModalOpen}
        setDiscountingItemId={setDiscountingItemId}
        setPrice={setPrice}
        isWholesale={isWholesale}
        permissions={permissions}
        settings={settings}
        products={products}
        quantityInputRefs={quantityInputRefs}
      />
    </div>
  );
};
