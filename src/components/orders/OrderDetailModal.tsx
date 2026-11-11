import React, { useState } from 'react';
import { Modal, SafeImage } from '../ui';
import { OnlineOrder, CompanySettings, Product } from '../../types';
import { cn } from '../../lib/utils';
import { 
  Phone, 
  MessageCircle, 
  Truck, 
  ShoppingBag, 
  Clock, 
  CreditCard,
  X
} from 'lucide-react';
import {
  EditOrderItems,
  OrderDeliveryCard,
  OrderItemsPickingList,
  OrderActionButtons
} from './detail';

export { EditOrderItems } from './detail';

export interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrder: OnlineOrder | null;
  isEditingItems: boolean;
  setIsEditingItems: (v: boolean) => void;
  saveOrderItems: (order: OnlineOrder, items: OnlineOrder['items']) => void;
  settings: CompanySettings;
  products: Product[];
  setEnlargedImage: (img: string | null) => void;
  handlePrintOrder: (o: any) => void;
  updateOrderStatus: (o: OnlineOrder, status: any) => void;
  handleYassirRequest: (o: any) => void;
  t: (key: string) => string;
}

export function OrderDetailModal({
  isOpen,
  onClose,
  selectedOrder,
  isEditingItems,
  setIsEditingItems,
  saveOrderItems,
  settings,
  products = [],
  setEnlargedImage,
  handlePrintOrder,
  updateOrderStatus,
  handleYassirRequest,
  t
}: OrderDetailModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [localStatus, setLocalStatus] = useState<OnlineOrder['status'] | null>(null);

  if (!selectedOrder) return null;

  const currentStatus = localStatus || selectedOrder.status;

  const handleOptimisticUpdateStatus = async (order: OnlineOrder, targetStatus: any) => {
    setLocalStatus(targetStatus);
    try {
      await updateOrderStatus(order, targetStatus);
    } catch (err) {
      setLocalStatus(null);
      throw err;
    }
  };

  const orderItems: any[] = Array.isArray(selectedOrder.items)
    ? selectedOrder.items
    : (typeof selectedOrder.items === 'string'
        ? (() => { try { return JSON.parse(selectedOrder.items); } catch (_) { return []; } })()
        : []);

  const displayId = selectedOrder.externalOrderId || String(selectedOrder.id || '').slice(0, 8);
  const currency = settings?.currency || 'DA';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' };
      case 'confirmed':
        return { label: 'Confirmée', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' };
      case 'processing':
        return { label: 'En préparation', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400' };
      case 'shipped':
        return { label: 'En cours de livraison', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', dot: 'bg-purple-400' };
      case 'delivered':
        return { label: 'Livrée', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' };
      case 'cancelled':
        return { label: 'Annulée', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' };
      default:
        return { label: status, color: 'bg-zinc-700/50 text-zinc-300 border-zinc-600', dot: 'bg-zinc-400' };
    }
  };

  const statusBadge = getStatusBadge(currentStatus);

  const openImageZoom = (imageUrl: string, title: string) => {
    setLightboxImage({ url: imageUrl, title });
    if (typeof setEnlargedImage === 'function') {
      setEnlargedImage(imageUrl);
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`Commande #${displayId}`}
        maxWidth="max-w-2xl"
        headerAction={
          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5", statusBadge.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusBadge.dot)} />
            {statusBadge.label}
          </span>
        }
      >
        <div className="space-y-4 text-left">
          {isEditingItems ? (
            <EditOrderItems 
              order={selectedOrder}
              onSave={saveOrderItems}
              onCancel={() => setIsEditingItems(false)}
              settings={settings}
            />
          ) : (
            <>
              {/* 1. Carte Client & Contact */}
              <div className="p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-base shrink-0">
                      {(selectedOrder.customerName || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        {selectedOrder.customerName || 'Client Inconnu'}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        {selectedOrder.customerPhone || 'Pas de numéro'}
                      </p>
                    </div>
                  </div>

                  {/* Boutons d'Action Rapide Téléphone */}
                  <div className="flex items-center gap-2">
                    {selectedOrder.customerPhone && (
                      <a 
                        href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                      >
                        <MessageCircle size={15} className="text-emerald-400" /> WhatsApp
                      </a>
                    )}
                    {selectedOrder.customerPhone && (
                      <a 
                        href={`tel:${selectedOrder.customerPhone}`}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Phone size={15} className="text-blue-400" /> Appeler
                      </a>
                    )}
                  </div>
                </div>

                {/* Badge Type de Livraison */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700/50">
                  <span className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border",
                    selectedOrder.deliveryMethod === 'delivery' 
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" 
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  )}>
                    {selectedOrder.deliveryMethod === 'delivery' ? <Truck size={14} /> : <ShoppingBag size={14} />}
                    {selectedOrder.deliveryMethod === 'delivery' ? 'Livraison à Domicile' : 'Retrait en Magasin'}
                  </span>

                  {selectedOrder.deliveryMethod === 'pickup' && selectedOrder.pickupTime && (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-700/50 border border-zinc-600/50 text-zinc-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-400" /> Heure : {selectedOrder.pickupTime}
                    </span>
                  )}

                  {selectedOrder.paymentMethod && (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-700/50 border border-zinc-600/50 text-zinc-300 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-indigo-400" />
                      Paiement : {selectedOrder.paymentMethod === 'cash' ? 'Espèces (Cash)' : selectedOrder.paymentMethod}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Carte Adresse & Navigation Livreur */}
              {selectedOrder.deliveryMethod === 'delivery' && (
                <OrderDeliveryCard 
                  order={selectedOrder}
                  settings={settings}
                />
              )}

              {/* 3. Carte Articles Commandés & Préparation */}
              <OrderItemsPickingList 
                order={selectedOrder}
                orderItems={orderItems}
                products={products}
                checkedItems={checkedItems}
                setCheckedItems={setCheckedItems}
                openImageZoom={openImageZoom}
                currency={currency}
              />

              {/* 4. Barre d'Actions Hiérarchisée & Claire */}
              <OrderActionButtons 
                order={{ ...selectedOrder, status: currentStatus }}
                updateOrderStatus={handleOptimisticUpdateStatus}
                handlePrintOrder={handlePrintOrder}
                setIsEditingItems={setIsEditingItems}
                handleYassirRequest={handleYassirRequest}
                onClose={onClose}
                t={t}
              />
            </>
          )}
        </div>
      </Modal>

      {/* 5. Lightbox Zoom Image Autonome (Plein Écran Z-Index 300) */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out select-none animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 z-10 pt-[max(env(safe-area-inset-top,0px),8px)]">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer shadow-2xl active:scale-95 transition-all border border-white/20"
              aria-label="Fermer l'agrandissement d'image"
            >
              <X size={26} strokeWidth={2.5} />
            </button>
          </div>

          <div 
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage 
              src={lightboxImage.url} 
              alt={lightboxImage.title} 
              className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <div className="mt-4 px-5 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center max-w-lg shadow-xl">
              <p className="text-sm font-bold text-white tracking-tight">{lightboxImage.title}</p>
              <p className="text-xs text-zinc-400 mt-1">Touchez l'écran ou la croix pour fermer</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OrderDetailModal;
