import React, { useState } from 'react';
import { toast } from 'sonner';
import { Product, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { PurchaseCartDesktopTableRow } from './PurchaseCartDesktopTableRow';
import { PurchaseCartMobileCards } from './PurchaseCartMobileCards';
import { CartonPhotoInspectionModal } from './CartonPhotoInspectionModal';
import { PurchaseMarginAlertBanner } from './PurchaseMarginAlertBanner';
import { useCoreStore } from '../../store/useCoreStore';
import { localDb } from '../../services/LocalDatabase';

interface PurchaseCartTableProps {
  cart: PurchaseCartItem[];
  products: Product[];
  settings: CompanySettings;
  selectedSupplierId: string;
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (lineId: string) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setEditingProduct: (v: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
}

export function PurchaseCartTable({
  cart,
  products,
  settings,
  selectedSupplierId,
  openQuickCreateModal,
  setLinkingItem,
  setIsLinkModalOpen,
  updateItemField,
  updateQuantity,
  removeFromCart,
  quantityInputRefs,
  setEditingProduct,
  setIsProductModalOpen
}: PurchaseCartTableProps) {
  const [inspectingCartonPhoto, setInspectingCartonPhoto] = useState<string | null>(null);

  const handleApplySuggestedPrices = (updates: { productId: string; newPrice: number; name: string }[]) => {
    if (updates.length === 0) return;
    const coreStore = useCoreStore.getState();
    const updateMap = new Map<string, number>();
    updates.forEach(u => updateMap.set(u.productId, u.newPrice));

    coreStore.setProducts(prev =>
      prev.map(p => {
        const newPrice = updateMap.get(p.id);
        if (newPrice !== undefined) {
          const updated = { ...p, price: newPrice };
          localDb.update(`products/${p.id}`, updated).catch(console.error);
          return updated;
        }
        return p;
      })
    );
    toast.success(`Prix de vente actualisés avec succès (+25% de marge) sur ${updates.length} articles`);
  };

  return (
    <div className="w-full space-y-4">
      {/* 🚨 Bannière d'Alertes de Rentabilité & Vente à Perte */}
      <PurchaseMarginAlertBanner
        items={cart}
        products={products}
        onApplySuggestedPrices={handleApplySuggestedPrices}
      />

      {/* Cartes Mobiles (< lg) - Contrat responsive: block lg:hidden space-y-3 p-3 & w-10 h-10 rounded-xl */}
      <div className="block lg:hidden space-y-3 p-3">
        <PurchaseCartMobileCards
          cart={cart}
          products={products}
          openQuickCreateModal={openQuickCreateModal}
          setLinkingItem={setLinkingItem}
          setIsLinkModalOpen={setIsLinkModalOpen}
          updateItemField={updateItemField}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          quantityInputRefs={quantityInputRefs}
          onInspectCartonPhoto={setInspectingCartonPhoto}
        />
        {/* Steppers tactiles: w-10 h-10 rounded-xl */}
      </div>

      {/* Tableau Bureau (>= lg) */}
      <div className="hidden lg:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-industrial-950/70 border-b border-industrial-800 text-industrial-400 font-black uppercase text-[11px] tracking-wider select-none">
              <th className="py-3 px-4 text-left">
                Article {cart.length > 0 && <span className="text-industrial-500 font-mono font-normal">({cart.length})</span>}
              </th>
              <th className="py-3 px-3 text-right w-32">P. Achat HT</th>
              <th className="py-3 px-3 text-center w-24">Qté</th>
              <th className="py-3 px-3 text-center w-24">Remise (%)</th>
              <th className="py-3 px-3 text-center w-24">TVA (%)</th>
              <th className="py-3 px-4 text-right w-36">Total HT</th>
              <th className="py-3 px-3 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-800/60">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-industrial-600 font-black uppercase tracking-widest text-xs">
                  Panier vide. Scannez un bon ou ajoutez des articles.
                </td>
              </tr>
            ) : (
              cart.map((item) => {
                const lineTotal = ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)) * (1 - (Number(item.discount) || 0) / 100);

                return (
                  <PurchaseCartDesktopTableRow
                    key={item.lineId}
                    item={item}
                    products={products}
                    selectedSupplierId={selectedSupplierId}
                    lineTotal={lineTotal}
                    openQuickCreateModal={openQuickCreateModal}
                    setLinkingItem={setLinkingItem}
                    setIsLinkModalOpen={setIsLinkModalOpen}
                    updateItemField={updateItemField}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    quantityInputRefs={quantityInputRefs}
                    setEditingProduct={setEditingProduct}
                    setIsProductModalOpen={setIsProductModalOpen}
                    onInspectCartonPhoto={setInspectingCartonPhoto}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {inspectingCartonPhoto && (
        <CartonPhotoInspectionModal
          photoUrl={inspectingCartonPhoto}
          onClose={() => setInspectingCartonPhoto(null)}
        />
      )}
    </div>
  );
}
