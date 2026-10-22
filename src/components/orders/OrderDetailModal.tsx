import React, { useState } from 'react';
import { Modal, Button, SafeImage } from '../ui';
import { OnlineOrder, CompanySettings, Product } from '../../types';
import { cn } from '../../lib/utils';
import { 
  Phone, 
  MessageCircle, 
  Truck, 
  ShoppingBag, 
  MapPin, 
  Navigation, 
  Package, 
  Printer, 
  Edit3, 
  X, 
  Copy, 
  Check, 
  Share2, 
  Compass,
  ZoomIn,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  User
} from 'lucide-react';
import { 
  getGoogleMapsDirectionsUrl, 
  getWazeDirectionsUrl, 
  getDeliveryDispatchText, 
  getWhatsAppDispatchUrl, 
  hasGpsCoordinates 
} from '../../lib/delivery-itinerary';
import { toast } from 'sonner';

interface EditOrderItemsProps {
  order: OnlineOrder;
  onSave: (order: OnlineOrder, items: OnlineOrder['items']) => void;
  onCancel: () => void;
  settings: CompanySettings;
}

export function EditOrderItems({ order, onSave, onCancel, settings }: EditOrderItemsProps) {
  const parseItems = (raw: any) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (_) { return []; }
    }
    return [];
  };

  const [items, setItems] = useState<OnlineOrder['items']>(parseItems(order?.items));

  const updateQuantity = (productId: string, delta: number) => {
    setItems((items || []).map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Edit3 size={15} className="text-amber-400" /> Modifier les articles
        </h4>
        <span className="text-xs text-white/50">{items.length} article(s)</span>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {(items || []).map((item, idx) => (
          <div key={`order-item-${idx}`} className="flex items-center justify-between p-3.5 bg-zinc-800/80 border border-zinc-700/80 rounded-xl">
            <div className="flex-1 text-left pr-3">
              <p className="text-sm font-bold text-white tracking-tight leading-snug">{item.name}</p>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{(item.price || 0).toFixed(2)} {settings?.currency || 'DA'} × {item.quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => updateQuantity(item.productId, -1)}
                className="w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >-</button>
              <span className="text-sm font-black w-8 text-center text-white font-mono">{item.quantity || 0}</span>
              <button 
                type="button"
                onClick={() => updateQuantity(item.productId, 1)}
                className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1 py-3 text-xs font-bold rounded-xl">
          Annuler
        </Button>
        <Button onClick={() => onSave(order, items)} className="flex-1 py-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30">
          Sauvegarder les modifications
        </Button>
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
  products = [],
  setEnlargedImage,
  handlePrintOrder,
  updateOrderStatus,
  handleYassirRequest,
  t
}: OrderDetailModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copiedDispatch, setCopiedDispatch] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  if (!selectedOrder) return null;

  const orderItems: any[] = Array.isArray(selectedOrder.items)
    ? selectedOrder.items
    : (typeof selectedOrder.items === 'string'
        ? (() => { try { return JSON.parse(selectedOrder.items); } catch (_) { return []; } })()
        : []);

  const displayId = selectedOrder.externalOrderId || String(selectedOrder.id || '').slice(0, 8);
  const currency = settings?.currency || 'DA';
  const hasGps = hasGpsCoordinates(selectedOrder);
  const gmapsUrl = getGoogleMapsDirectionsUrl(selectedOrder);
  const wazeUrl = getWazeDirectionsUrl(selectedOrder);
  const whatsappCourierUrl = getWhatsAppDispatchUrl(selectedOrder, undefined, currency, settings?.name);

  const handleCopyDispatch = async () => {
    try {
      const text = getDeliveryDispatchText(selectedOrder, currency, settings?.name);
      await navigator.clipboard.writeText(text);
      setCopiedDispatch(true);
      toast.success("Fiche de livraison copiée dans le presse-papier !");
      setTimeout(() => setCopiedDispatch(false), 2500);
    } catch (_) {
      toast.error("Impossible de copier la fiche.");
    }
  };

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

  const statusBadge = getStatusBadge(selectedOrder.status);

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
                <div className="p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={15} className="text-indigo-400" /> Adresse de livraison
                    </p>
                    {hasGps ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Compass size={12} className="text-emerald-400" />
                        GPS Précis ({selectedOrder.latitude?.toFixed(4)}, {selectedOrder.longitude?.toFixed(4)})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-700/50 text-zinc-400 border border-zinc-600/50">
                        📍 Adresse Déclarée
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <p className="text-sm font-medium text-zinc-100 leading-relaxed break-words">
                      {selectedOrder.shippingAddress || 'Aucune adresse renseignée'}
                    </p>
                    {selectedOrder.deliveryNotes && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                        <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <span><strong className="text-amber-200">Consignes :</strong> {selectedOrder.deliveryNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'Action Itinéraire & Fiche Livreur */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 text-xs py-2.5 px-2 rounded-xl transition-all font-bold shadow-xs active:scale-95"
                      title="Ouvrir le guidage Google Maps"
                    >
                      <Navigation size={14} className="text-blue-400 shrink-0" /> Google Maps
                    </a>

                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 text-xs py-2.5 px-2 rounded-xl transition-all font-bold shadow-xs active:scale-95"
                      title="Lancer Waze"
                    >
                      <Compass size={14} className="text-cyan-400 shrink-0" /> Waze
                    </a>

                    <a
                      href={whatsappCourierUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs py-2.5 px-2 rounded-xl transition-all font-bold shadow-xs active:scale-95"
                      title="Transmettre la fiche au coursier via WhatsApp"
                    >
                      <Share2 size={14} className="text-emerald-400 shrink-0" /> Fiche Livreur
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyDispatch}
                      className="flex items-center justify-center gap-1.5 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600/60 text-zinc-200 text-xs py-2.5 px-2 rounded-xl transition-all font-bold shadow-xs active:scale-95 cursor-pointer"
                      title="Copier la fiche"
                    >
                      {copiedDispatch ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedDispatch ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Carte Articles Commandés & Préparation */}
              <div className="p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-700/50">
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={15} className="text-indigo-400" />
                    Articles Commandés ({orderItems.length})
                  </p>
                  <span className="text-[11px] text-zinc-400 font-medium">Cochez pour préparer</span>
                </div>

                <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
                  {orderItems
                    .slice()
                    .sort((a, b) => {
                      const prodA = (products || []).find(p => p.id === (a.productId || (a as any).id));
                      const prodB = (products || []).find(p => p.id === (b.productId || (b as any).id));
                      const locA = prodA?.location || 'ZZZ';
                      const locB = prodB?.location || 'ZZZ';
                      return locA.localeCompare(locB);
                    })
                    .map((item, idx) => {
                      const itemKey = `${selectedOrder.id}-${item.lineId || `pick-item-${idx}`}`;
                      const isItemChecked = !!checkedItems[itemKey];
                      const productRef = (products || []).find(p => p.id === (item.productId || (item as any).id));
                      const rawImg = item.image || item.imageUrl || productRef?.imageUrl || productRef?.imageUrls?.[0];
                      const hasImage = Boolean(rawImg && rawImg.trim() !== '');

                      return (
                        <div 
                          key={itemKey} 
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                            isItemChecked 
                              ? "bg-emerald-950/20 border-emerald-500/30 opacity-75" 
                              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                          )}
                        >
                          {/* Checkbox stylisée pour picking */}
                          <button
                            type="button"
                            onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                            className={cn(
                              "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90",
                              isItemChecked 
                                ? "bg-emerald-600 border-emerald-500 text-white shadow-xs" 
                                : "bg-zinc-800 border-zinc-700 text-transparent hover:border-zinc-500"
                            )}
                            aria-label={isItemChecked ? "Décocher l'article" : "Valider la préparation de l'article"}
                          >
                            <Check size={16} strokeWidth={3} className={isItemChecked ? "text-white" : "opacity-0"} />
                          </button>
                          
                          {/* Miniature de produit cliquable avec zoom */}
                          <div 
                            className={cn(
                              "w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700/80 overflow-hidden shrink-0 relative group",
                              hasImage ? "cursor-zoom-in hover:border-indigo-500" : "cursor-default"
                            )}
                            onClick={() => {
                              if (hasImage && rawImg) {
                                openImageZoom(rawImg, item.name);
                              }
                            }}
                            title={hasImage ? "Cliquer pour agrandir la photo" : "Aucune image"}
                          >
                            {hasImage ? (
                              <>
                                <SafeImage 
                                  src={rawImg} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                                  alt={item.name}
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn size={16} className="text-white drop-shadow-md" />
                                </div>
                                <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded px-1 py-0.5 text-[9px] text-white/90">
                                  🔍
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                                <Package size={22} />
                              </div>
                            )}
                          </div>

                          {/* Nom, Emplacement & Prix */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {productRef?.location && (
                                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold uppercase shrink-0">
                                  {productRef.location}
                                </span>
                              )}
                              <p className={cn(
                                "text-sm font-bold truncate leading-tight transition-colors",
                                isItemChecked ? "line-through text-zinc-400" : "text-white"
                              )}>
                                {item.name}
                              </p>
                            </div>
                            <p className="text-xs text-zinc-400 font-mono mt-1">
                              {(item.price || 0).toFixed(2)} {currency} × {item.quantity}
                            </p>
                          </div>

                          {/* Total de la ligne */}
                          <div className="text-right shrink-0">
                            <p className="text-base font-black text-white font-mono">
                              {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">{currency}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Total de la commande */}
                <div className="border-t border-dashed border-zinc-700 pt-3 flex justify-between items-center bg-zinc-900/40 -mx-4 -mb-4 p-4 rounded-b-2xl">
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total de la commande</p>
                    <p className="text-xs text-indigo-400 font-medium">TTC et service inclus</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-white font-mono tracking-tight">
                      {(selectedOrder.total || 0).toFixed(2)} <span className="text-sm font-bold text-indigo-400">{currency}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Barre d'Actions Hiérarchisée & Claire */}
              <div className="space-y-2 pt-2">
                {/* A. Action Principale Contextuelle (CTA Majeur) */}
                {selectedOrder.status === 'pending' && (
                  <Button 
                    onClick={() => updateOrderStatus(selectedOrder, 'confirmed')} 
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Confirmer la commande
                  </Button>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <Button 
                    onClick={() => updateOrderStatus(selectedOrder, 'processing')} 
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    <Package size={18} /> Passer en préparation
                  </Button>
                )}

                {selectedOrder.status === 'processing' && (
                  <Button 
                    onClick={() => updateOrderStatus(selectedOrder, selectedOrder.deliveryMethod === 'delivery' ? 'shipped' : 'delivered')} 
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                  >
                    {selectedOrder.deliveryMethod === 'delivery' ? (
                      <>
                        <Truck size={18} /> Remettre au livreur / Expédier
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} /> Prête & Retirée par le client
                      </>
                    )}
                  </Button>
                )}

                {selectedOrder.status === 'shipped' && (
                  <Button 
                    onClick={() => updateOrderStatus(selectedOrder, 'delivered')} 
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Marquer comme Livrée
                  </Button>
                )}

                {/* B. Actions Utilitaires (Ticket, Modifier, Annuler) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => handlePrintOrder(selectedOrder)} 
                    className="py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Printer size={15} /> Imprimer Ticket
                  </Button>

                  {selectedOrder.status === 'pending' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsEditingItems(true)} 
                      className="py-2.5 text-xs font-semibold rounded-xl text-amber-300 hover:text-amber-200 border-amber-500/30 flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={15} /> Modifier
                    </Button>
                  )}

                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <button 
                      type="button" 
                      onClick={() => {
                        if (window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) {
                          updateOrderStatus(selectedOrder, 'cancelled');
                        }
                      }} 
                      className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <X size={15} /> Annuler Cde
                    </button>
                  )}
                </div>

                {/* C. Option Partenaire Yassir Livreur */}
                {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.assignedEmployeeId !== 'YASSIR_EXT' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button 
                    type="button"
                    onClick={() => handleYassirRequest(selectedOrder)} 
                    className="w-full flex items-center justify-center gap-2 bg-[#f2ec24] text-black hover:bg-[#dcd01b] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Truck size={17} /> {t("Demander livreur Yassir")}
                  </button>
                )}

                {/* D. Bouton Fermer Évident pour Mobile */}
                <div className="pt-2">
                  <Button 
                    variant="secondary" 
                    onClick={onClose} 
                    className="w-full py-3 text-xs font-bold rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                  >
                    Fermer la boîte
                  </Button>
                </div>
              </div>
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
          {/* Bouton de Fermeture Flottant Grand Format */}
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
