import React from 'react';
import { Phone, MessageCircle, MapPin, Navigation, User, Users, Check, RotateCcw, Compass } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { CompanySettings } from '../../types';
import { getGoogleMapsDirectionsUrl, getWazeDirectionsUrl, hasGpsCoordinates } from '../../lib/delivery-itinerary';

interface DeliveryOrderCardProps {
  order: any;
  activeTab: 'pending' | 'history';
  isPicker: boolean;
  isProcessing: string | null;
  settings: CompanySettings;
  onUpdateStatus: (order: any, status: string) => void;
}

export function DeliveryOrderCard({
  order,
  activeTab,
  isPicker,
  isProcessing,
  settings,
  onUpdateStatus
}: DeliveryOrderCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex justify-between items-start bg-indigo-50/30">
        <div>
          <h3 className="font-black text-slate-800 text-lg">#{String(order.id || "").slice(0, 8).toUpperCase()}</h3>
          <p className="text-xs text-slate-500">{format(new Date(order.timestamp), 'dd/MM/yyyy HH:mm')}</p>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
          order.status === 'confirmed' ? "bg-blue-100 text-blue-700" :
          order.status === 'processing' ? "bg-indigo-100 text-indigo-700" :
          order.status === 'shipped' ? "bg-purple-100 text-purple-700" :
          order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
        )}>
          {order.status === 'confirmed' ? 'Prête' :
           order.status === 'processing' ? 'En préparation' :
           order.status === 'shipped' ? 'En livraison' :
           order.status === 'delivered' ? 'Livrée' : order.status}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Customer Info */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 truncate">{order.customerName || 'Client M'}</p>
            <div className="flex items-center gap-3 mt-1">
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} className="text-slate-600 font-bold text-xs flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                  <Phone size={12} /> Appeler
                </a>
              )}
              {order.customerPhone && (
                <a 
                  href={`https://wa.me/${order.customerPhone?.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-600 font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Location & GPS Navigation */}
        {(order.shippingAddress || order.latitude || order.mapsUrl) && (
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adresse de livraison</p>
                    {hasGpsCoordinates(order) && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold flex items-center gap-0.5">
                        <Compass size={10} /> GPS Fixé
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">{order.shippingAddress || 'Position GPS'}</p>
                  {order.deliveryNotes && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg p-1.5 mt-1.5 font-medium">
                      ⚠️ {order.deliveryNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons Itinéraire : Google Maps & Waze */}
            <div className="flex items-center gap-2 pt-1">
              <a 
                href={getGoogleMapsDirectionsUrl(order)}
                target="_blank" 
                rel="noreferrer" 
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                title="Lancer le guidage routier Google Maps"
              >
                <Navigation size={13} className="text-blue-500" /> Google Maps
              </a>
              <a 
                href={getWazeDirectionsUrl(order)}
                target="_blank" 
                rel="noreferrer" 
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                title="Lancer le guidage Waze (Trafic en temps réel)"
              >
                <Compass size={13} className="text-cyan-600" /> Waze
              </a>
            </div>
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between items-center py-2 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">À Encaisser</span>
          <span className="text-xl font-black text-slate-900">{order.total?.toFixed(2)} {settings.currency}</span>
        </div>

        {/* Actions */}
        {activeTab === 'pending' && (
          <div className="space-y-3 pt-2">
            {/* Picker Flow */}
            {isPicker && (
              order.status === 'confirmed' ? (
                <button 
                  onClick={() => onUpdateStatus(order, 'processing')}
                  disabled={isProcessing === order.id}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl active:bg-indigo-700 disabled:opacity-50"
                >
                  {isProcessing === order.id ? "..." : "Démarrer Préparation"}
                </button>
              ) : (
                <button 
                  onClick={() => onUpdateStatus(order, 'shipped')} // In picker context, shipping means ready for delivery
                  disabled={isProcessing === order.id}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl active:bg-emerald-700 disabled:opacity-50"
                >
                  {isProcessing === order.id ? "..." : "Prêt pour Livraison"}
                </button>
              )
            )}

            {/* Delivery Flow */}
            {!isPicker && (
              order.status === 'confirmed' ? (
                <button 
                  onClick={() => onUpdateStatus(order, 'shipped')}
                  disabled={isProcessing === order.id}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing === order.id ? "..." : "Démarrer Livraison"}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={() => {
                        if(confirm("Confirmer le retour au magasin ?")) {
                          onUpdateStatus(order, 'confirmed');
                        }
                      }}
                    disabled={isProcessing === order.id}
                    className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl active:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} /> Retour
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm("Confirmer la livraison au client ?")) {
                        onUpdateStatus(order, 'delivered');
                      }
                    }}
                    disabled={isProcessing === order.id}
                    className="py-3 bg-emerald-600 text-white font-bold rounded-xl active:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Livré
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
