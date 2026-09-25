import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, CheckCircle2, ShieldCheck, Heart, Store, Wifi, Radio } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCoreStore } from '../store/useCoreStore';
import { SafeImage } from './ui/SafeImage';
import { supabase, isSupabaseConfigured, safeRemoveChannel, realtimeCircuitBreaker } from '../supabase';
import { getCustomerDisplaySocket } from '../services/customerDisplayService';

interface CustomerDisplayState {
  items: any[];
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  customerName?: string;
  isPaid?: boolean;
}

export const CustomerDisplayWindow: React.FC = () => {
  const settings = useCoreStore(s => s.settings);
  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    items: [],
    subtotal: 0,
    discountAmount: 0,
    total: 0,
    amountPaid: 0,
    changeDue: 0
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLocalActive, setIsLocalActive] = useState(false);
  const [isBcActive, setIsBcActive] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🟢 Synchronisation Multi-Canaux Résiliente (Local Wi-Fi + Écran HDMI + Cloud)
  useEffect(() => {
    // 1. Chargement immédiat via API REST locale (Affiche l'état existant du panier dès l'ouverture)
    fetch('/api/customer-display')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.items)) {
          setDisplayState(data);
          setIsLocalActive(true);
        }
      })
      .catch(() => {});

    // 2. Flux temps réel Server-Sent Events (SSE) : Fonctionne nativement sur 100% des téléphones/tablettes
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/customer-display/events');
      sse.onmessage = (event) => {
        if (event.data) {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && Array.isArray(parsed.items)) {
              setDisplayState(parsed);
              setIsLocalActive(true);
            }
          } catch (_) {}
        }
      };
      sse.onopen = () => setIsLocalActive(true);
      sse.onerror = () => {
        // SSE réessaie automatiquement en arrière-plan
      };
    } catch (_) {}

    // 3. Connexion Socket.IO locale (Wi-Fi ultra-rapide 0 ms)
    const socket = getCustomerDisplaySocket();
    if (socket) {
      socket.on('customer-display:update', (data: any) => {
        if (data && Array.isArray(data.items)) {
          setDisplayState(data);
          setIsLocalActive(true);
        }
      });
      // Réclamer l'état actuel
      socket.emit('customer-display:request');
    }

    // 4. Écoute locale BroadcastChannel (pour second écran sur le même PC via câble HDMI / fenêtre détachée)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('nexus_customer_display');
      bc.onmessage = (event) => {
        if (event.data && !event.data.type && Array.isArray(event.data.items)) {
          setDisplayState(event.data);
          setIsBcActive(true);
        }
      };
      // Réclamer immédiatement l'état du panier dès l'ouverture
      bc.postMessage({ type: 'REQUEST_CURRENT_STATE' });
    } catch (_) {}

    // 5. Écoute localStorage (pour onglets partagés)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nexus_customer_display_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDisplayState(parsed);
          setIsBcActive(true);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    try {
      const stored = localStorage.getItem('nexus_customer_display_state');
      if (stored) setDisplayState(JSON.parse(stored));
    } catch (_) {}

    // 6. Écoute Supabase Realtime Broadcast (fallback Cloud optionnel)
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase.channel('nexus-pos-realtime')
          .on('broadcast', { event: 'customer-display-update' }, (msg: any) => {
            if (msg?.payload && Array.isArray(msg.payload.items)) {
              setDisplayState(msg.payload);
              setIsRealtimeActive(true);
            }
          })
        if (!realtimeCircuitBreaker.isOpen()) {
          channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              realtimeCircuitBreaker.recordSuccess();
              setIsRealtimeActive(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              realtimeCircuitBreaker.recordFailure('customer-display');
            }
          });
        }
      } catch (_) {}
    }

    return () => {
      if (sse) sse.close();
      if (socket) socket.off('customer-display:update');
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      if (channel) safeRemoveChannel(channel);
    };
  }, []);

  // 4. Relais automatique de la douchette code-barres si l'écran client a le focus par inadvertance
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastTime;
      lastTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 2 && diff < 250) {
          const scannedBarcode = buffer.trim();
          buffer = '';
          // 1. Relais BroadcastChannel
          try {
            const bc = new BroadcastChannel('nexus_customer_display');
            bc.postMessage({ type: 'FORWARD_BARCODE', barcode: scannedBarcode });
            bc.close();
          } catch (_) {}

          // 2. Relais HTTP serveur
          fetch('/api/customer-display/barcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: scannedBarcode })
          }).catch(() => {});
        } else {
          buffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (diff < 120 || buffer === '') {
          buffer += e.key;
        } else {
          buffer = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const hasItems = displayState.items && displayState.items.length > 0;

  // Calcul du badge de connectivité
  const connectionBadge = (() => {
    if (isLocalActive) {
      return {
        label: 'Direct Wi-Fi Sans Fil (0 ms)',
        dotClass: 'bg-emerald-500 animate-pulse',
        textClass: 'text-emerald-400'
      };
    }
    if (isBcActive) {
      return {
        label: 'Écran Secondaire (Câble HDMI)',
        dotClass: 'bg-indigo-500 animate-pulse',
        textClass: 'text-indigo-400'
      };
    }
    if (isRealtimeActive) {
      return {
        label: 'Connecté Cloud Supabase',
        dotClass: 'bg-emerald-500 animate-pulse',
        textClass: 'text-emerald-400'
      };
    }
    return {
      label: 'Prêt (En attente de caisse)',
      dotClass: 'bg-amber-400 animate-pulse',
      textClass: 'text-amber-300'
    };
  })();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Header */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            <SafeImage 
              src={settings.logoUrl} 
              alt="Logo" 
              className="h-12 w-auto object-contain rounded-xl" 
              fallback={
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Store size={26} />
                </div>
              }
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Store size={26} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              {settings.name || 'Nexus POS Pro'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Afficheur Caisse Client</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-[11px] font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionBadge.dotClass}`} />
            <span className={connectionBadge.textClass}>
              {connectionBadge.label}
            </span>
          </div>

          <div className="text-right">
            <p className="text-lg font-mono font-black text-indigo-400">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">
        
        {/* Left Section: Items List or Welcome Banner */}
        <div className="col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col overflow-hidden shadow-2xl">
          {hasItems ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs font-black text-slate-400 uppercase tracking-wider">
                <span>Article</span>
                <div className="flex items-center gap-12">
                  <span>Qté</span>
                  <span>Prix Unit.</span>
                  <span>Total</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pr-2">
                {displayState.items.map((item, idx) => (
                  <div key={idx} className="py-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-white text-base">{item.name}</p>
                        {item.barcode && <p className="text-[11px] text-slate-500 font-mono">{item.barcode}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-12 font-mono">
                      <span className="text-base font-black text-indigo-400 w-8 text-center bg-indigo-500/10 py-1 rounded-lg">
                        {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-slate-300 w-20 text-right">
                        {(item.price || 0).toFixed(2)}
                      </span>
                      <span className="text-base font-black text-white w-24 text-right">
                        {((item.price || 0) * (item.quantity || 1)).toFixed(2)} {settings.currency || 'DA'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse">
                <Sparkles size={48} />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Bienvenue !</h2>
              <p className="text-base text-slate-400 max-w-md font-medium">
                {settings.footerText || 'Nous vous souhaitons un agréable shopping. Vos articles apparaîtront ici lors du scan.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Section: Total Card & Payment Summary */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Main Total Card */}
          <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Total à Payer</p>
              <h3 className="text-5xl font-black font-mono text-white tracking-tight">
                {(displayState.total || 0).toFixed(2)} <span className="text-2xl text-indigo-400 font-sans">{settings.currency || 'DA'}</span>
              </h3>
            </div>

            {displayState.discountAmount > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-emerald-400 text-xs font-black uppercase">
                <span>Remise appliquée</span>
                <span className="font-mono font-bold">-{(displayState.discountAmount).toFixed(2)} {settings.currency || 'DA'}</span>
              </div>
            )}
          </div>

          {/* Change & Payment details */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 flex-1 flex flex-col justify-center">
            {displayState.amountPaid > 0 && (
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="text-xs uppercase font-bold text-slate-400">Montant Versé :</span>
                <span className="text-lg font-mono font-black text-white">{(displayState.amountPaid).toFixed(2)} {settings.currency || 'DA'}</span>
              </div>
            )}

            {displayState.changeDue > 0 && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-1 animate-in zoom-in-95 duration-200">
                <span className="text-[11px] uppercase font-black tracking-wider text-emerald-400 block">Monnaie à rendre :</span>
                <span className="text-3xl font-mono font-black text-emerald-300 block">
                  {(displayState.changeDue).toFixed(2)} {settings.currency || 'DA'}
                </span>
              </div>
            )}

            {displayState.isPaid && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95 duration-200">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="font-black text-emerald-300 text-sm uppercase tracking-wide">Paiement Validé</p>
                  <p className="text-xs text-slate-300 mt-0.5">Merci de votre visite et à très bientôt !</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex items-center gap-3 text-slate-400 text-xs font-medium">
              <ShieldCheck size={18} className="text-indigo-400 flex-shrink-0" />
              <span>Paiement sécurisé et ticket certifié.</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
