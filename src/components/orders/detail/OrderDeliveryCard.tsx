import React, { useState } from 'react';
import { OnlineOrder, CompanySettings } from '../../../types';
import { MapPin, Compass, Navigation, Share2, Check, Copy, AlertCircle } from 'lucide-react';
import { 
  getGoogleMapsDirectionsUrl, 
  getWazeDirectionsUrl, 
  getDeliveryDispatchText, 
  getWhatsAppDispatchUrl, 
  hasGpsCoordinates 
} from '../../../lib/delivery-itinerary';
import { toast } from 'sonner';

export interface OrderDeliveryCardProps {
  order: OnlineOrder;
  settings: CompanySettings;
}

export function OrderDeliveryCard({ order, settings }: OrderDeliveryCardProps) {
  const [copiedDispatch, setCopiedDispatch] = useState(false);
  const currency = settings?.currency || 'DA';
  const hasGps = hasGpsCoordinates(order);
  const gmapsUrl = getGoogleMapsDirectionsUrl(order);
  const wazeUrl = getWazeDirectionsUrl(order);
  const whatsappCourierUrl = getWhatsAppDispatchUrl(order, undefined, currency, settings?.name);

  const handleCopyDispatch = async () => {
    try {
      const text = getDeliveryDispatchText(order, currency, settings?.name);
      await navigator.clipboard.writeText(text);
      setCopiedDispatch(true);
      toast.success("Fiche de livraison copiée dans le presse-papier !");
      setTimeout(() => setCopiedDispatch(false), 2500);
    } catch (_) {
      toast.error("Impossible de copier la fiche.");
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={15} className="text-indigo-400" /> Adresse de livraison
        </p>
        {hasGps ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Compass size={12} className="text-emerald-400" />
            GPS Précis ({order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)})
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-700/50 text-zinc-400 border border-zinc-600/50">
            📍 Adresse Déclarée
          </span>
        )}
      </div>

      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        <p className="text-sm font-medium text-zinc-100 leading-relaxed break-words">
          {order.shippingAddress || 'Aucune adresse renseignée'}
        </p>
        {order.deliveryNotes && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span><strong className="text-amber-200">Consignes :</strong> {order.deliveryNotes}</span>
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
  );
}
