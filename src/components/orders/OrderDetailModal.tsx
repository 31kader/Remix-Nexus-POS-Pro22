import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { OnlineOrder, CompanySettings, Product } from '../../types';
import { formatSafe } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Phone, MessageCircle, Truck, ShoppingBag, MapPin, Navigation, Package, Printer, Edit, X } from 'lucide-react';

interface EditOrderItemsProps {
  order: OnlineOrder;
  onSave: (order: OnlineOrder, items: OnlineOrder['items']) => void;
  onCancel: () => void;
  settings: CompanySettings;
}

export function EditOrderItems({ order, onSave, onCancel, settings }: EditOrderItemsProps) {
  const [items, setItems] = useState<OnlineOrder['items']>(order.items);

  const updateQuantity = (productId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Modifier les articles</h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={`order-item-${idx}`} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-white tracking-tight">{item.name}</p>
              <p className="text-xs text-white/40 font-mono mt-0.5">{(item.price || 0).toFixed(2)} {settings.currency} x {item.quantity}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => updateQuantity(item.productId, -1)}
                className="bg-white/10 hover:bg-white/20 border-none text-white w-8 h-8 p-0 flex items-center justify-center rounded-lg"
              >-</Button>
              <span className="text-sm font-black w-8 text-center text-white font-mono">{item.quantity || 0}</span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => updateQuantity(item.productId, 1)}
                className="bg-indigo-500/20 hover:bg-indigo-500/30 border-none text-indigo-400 w-8 h-8 p-0 flex items-center justify-center rounded-lg"
              >+</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-6">
        <Button variant="secondary" onClick={onCancel} className="flex-1 bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto">Annuler</Button>
        <Button onClick={() => onSave(order, items)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 border-none text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto shadow-lg shadow-indigo-500/20">Sauvegarder</Button>
      </div>
    </div>
  );
}

interface OrderDetailModalProps {
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
  products,
  setEnlargedImage,
  handlePrintOrder,
  updateOrderStatus,
  handleYassirRequest,
  t
}: OrderDetailModalProps) {
  if (!selectedOrder) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Détails Commandes #${selectedOrder.externalOrderId || selectedOrder.id.slice(0, 8)}`}>
      <div className="space-y-8">
        {isEditingItems ? (
          <EditOrderItems order={selectedOrder} onSave={saveOrderItems} onCancel={() => setIsEditingItems(false)} settings={settings} />
        ) : (
          <>
            <div className="bg-white/5 border text-center border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 backdrop-blur-md">
              <div className="flex-1 text-center items-center justify-center space-y-1 w-full">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Client</p>
                <p className="text-xl font-bold text-white tracking-tight">{selectedOrder.customerName || 'Client Inconnu'}</p>
                <div className="flex items-center justify-center gap-3">
                  {selectedOrder.customerPhone && (
                    <a href={`tel:${selectedOrder.customerPhone}`} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono">
                      <Phone size={14} /> {selectedOrder.customerPhone}
                    </a>
                  )}
                  {selectedOrder.customerPhone && (
                    <a 
                      href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-500/30 transition-all shadow-sm border border-emerald-500/20"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                </div>
                {selectedOrder.customerEmail && <p className="text-xs text-white/40 font-mono italic">{selectedOrder.customerEmail}</p>}
              </div>

              <div className="hidden md:block w-px h-16 bg-white/10" />

              <div className="flex-1 text-center items-center justify-center space-y-3 w-full">
                <div className="flex flex-col items-center gap-2 justify-center">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg",
                    selectedOrder.deliveryMethod === 'delivery' ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                  )}>
                    {selectedOrder.deliveryMethod === 'delivery' ? (
                      <><Truck size={14} /> Livraison</>
                    ) : (
                      <><ShoppingBag size={14} /> Retrait Magasin</>
                    )}
                  </span>
                  {selectedOrder.deliveryMethod === 'pickup' && selectedOrder.pickupTime && (
                    <p className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 animate-pulse uppercase tracking-widest">
                      Heure de retrait: {selectedOrder.pickupTime}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Date de création</p>
                  <p className="text-sm font-bold text-white/80 font-mono">{formatSafe(selectedOrder.timestamp, 'dd MMMM yyyy à HH:mm')}</p>
                  <span className="inline-block px-2 py-0.5 bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest rounded-lg mt-1 border border-white/5">Source: {selectedOrder.source}</span>
                </div>
              </div>
            </div>

            {selectedOrder.shippingAddress && selectedOrder.deliveryMethod === 'delivery' && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm text-left">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <MapPin size={12} className="text-rose-500" /> Adresse de Livraison
                </p>
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm text-white/80 font-medium leading-relaxed flex-1 italic">{selectedOrder.shippingAddress}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.shippingAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/10 text-white rounded-xl shadow-lg border border-white/10 hover:bg-white/20 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                     <Navigation size={12} /> Itinéraire
                  </a>
                </div>
              </div>
            )}

            <div className="bg-white/5 border rounded-2xl p-6 shadow-2xl text-center border-white/10 backdrop-blur-md">
              <p className="text-xs font-black text-white/60 uppercase tracking-widest text-left mb-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-indigo-400"><Package size={14}/> Articles Commandés</span>
                <span className="text-[10px] font-black text-white/20">Vérifier avant emballage</span>
              </p>
              <div className="space-y-2">
                {selectedOrder.items
                  .slice()
                  .sort((a, b) => {
                    const prodA = products.find(p => p.id === (a.productId || (a as any).id));
                    const prodB = products.find(p => p.id === (b.productId || (b as any).id));
                    const locA = prodA?.location || 'ZZZ';
                    const locB = prodB?.location || 'ZZZ';
                    return locA.localeCompare(locB);
                  })
                  .map((item, idx) => {
                    const itemKey = item.lineId || `pick-item-${idx}`;
                    const productRef = products.find(p => p.id === (item.productId || (item as any).id));
                    return (
                      <div key={itemKey} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            id={`check-${itemKey}`} 
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        
                        {/* Product Thumbnail */}
                        <div 
                          className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 overflow-hidden shrink-0 cursor-zoom-in"
                          onClick={() => {
                            const mainImg = productRef?.imageUrl || (productRef?.imageUrls && productRef.imageUrls[0]);
                            if (mainImg) setEnlargedImage(mainImg);
                          }}
                        >
                          {(() => {
                            const imgSrc = productRef?.imageUrl || productRef?.imageUrls?.[0];
                            return imgSrc && imgSrc.trim() !== '' ? (
                              <img 
                                src={imgSrc} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                                alt={item.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
                                <Package size={20} />
                              </div>
                            );
                          })()}
                        </div>

                        <label htmlFor={`check-${itemKey}`} className="flex-1 flex justify-between items-center cursor-pointer min-w-0">
                          <div className="text-left truncate mr-2">
                            <div className="flex items-center gap-2">
                              {productRef?.location && (
                                <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[10px] font-black uppercase tracking-widest shrink-0 shadow-lg shadow-indigo-500/20">
                                  {productRef.location}
                                </span>
                              )}
                              <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{item.name}</p>
                            </div>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-0.5">{(item.price || 0).toFixed(2)} {settings.currency} x {item.quantity}</p>
                          </div>
                          <p className="text-lg font-black text-white font-mono tracking-tighter">{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                        </label>
                      </div>
                    );
                  })}
              </div>

              <div className="border-t border-dashed border-white/10 mt-6 pt-6 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest text-left">Total de la commande</p>
                  <p className="text-xs font-bold text-indigo-400 mt-1 text-left">Taxes et service inclus</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {(selectedOrder.total || 0).toFixed(2)} <span className="text-xl text-white/40">{settings.currency}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <Button onClick={() => handlePrintOrder(selectedOrder)} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border-white/10 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto">
                <Printer size={18} /> Imprimer Ticket
              </Button>
              
              {selectedOrder.status === 'pending' && (
                <Button variant="secondary" onClick={() => updateOrderStatus(selectedOrder, 'confirmed')} className="flex-1 bg-indigo-500 text-white hover:bg-indigo-600 border-none font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto shadow-lg shadow-indigo-500/20">
                  Confirmer la Cde
                </Button>
              )}
              
              {selectedOrder.status === 'pending' && (
                <Button onClick={() => setIsEditingItems(true)} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 border-none font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto shadow-lg shadow-amber-500/20">
                  <Edit size={18} /> Modifier Articles
                </Button>
              )}
              
              {selectedOrder.status === 'confirmed' && selectedOrder.deliveryMethod === 'delivery' && (
                <Button variant="secondary" onClick={() => updateOrderStatus(selectedOrder, 'shipped')} className="flex-1 bg-indigo-500 text-white hover:bg-indigo-600 border-none font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto shadow-lg shadow-indigo-500/20">
                  Marquer Expédié
                </Button>
              )}
            </div>
            
            {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.assignedEmployeeId !== 'YASSIR_EXT' && (
              <div className="pt-2">
                <Button 
                  onClick={() => handleYassirRequest(selectedOrder)} 
                  className="w-full flex items-center justify-center gap-2 bg-[#f2ec24] text-black hover:bg-[#dcd01b] border-none font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl h-auto shadow-lg shadow-[#f2ec24]/20"
                >
                  <Truck size={18} /> {t("Demander livreur Yassir")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
