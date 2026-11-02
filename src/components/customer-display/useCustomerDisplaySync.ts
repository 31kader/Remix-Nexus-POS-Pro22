import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, safeRemoveChannel, safeSubscribeChannel, realtimeCircuitBreaker } from '../../supabase';
import { getCustomerDisplaySocket } from '../../services/customerDisplayService';

export interface CustomerDisplayState {
  items: any[];
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  customerName?: string;
  isPaid?: boolean;
}

export function useCustomerDisplaySync() {
  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    items: [],
    subtotal: 0,
    discountAmount: 0,
    total: 0,
    amountPaid: 0,
    changeDue: 0
  });

  const [isLocalActive, setIsLocalActive] = useState(false);
  const [isBcActive, setIsBcActive] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // 🟢 Synchronisation Multi-Canaux Résiliente (Local Wi-Fi + Écran HDMI + Cloud)
  useEffect(() => {
    let lastAppliedTimestamp = 0;
    const safeApplyUpdate = (data: any, activateSource?: () => void) => {
      if (!data || !Array.isArray(data.items)) return;
      const ts = Number(data.updatedAt || data.timestamp || 0) || Date.now();
      if (ts < lastAppliedTimestamp) return;
      lastAppliedTimestamp = ts;
      setDisplayState(data);
      if (activateSource) activateSource();
    };

    // 1. Chargement immédiat via API REST locale (Affiche l'état existant du panier dès l'ouverture)
    fetch('/api/customer-display')
      .then(res => res.json())
      .then(data => {
        safeApplyUpdate(data, () => setIsLocalActive(true));
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
            safeApplyUpdate(parsed, () => setIsLocalActive(true));
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
        safeApplyUpdate(data, () => setIsLocalActive(true));
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
          safeApplyUpdate(event.data, () => setIsBcActive(true));
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
          safeApplyUpdate(parsed, () => setIsBcActive(true));
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    try {
      const stored = localStorage.getItem('nexus_customer_display_state');
      if (stored) safeApplyUpdate(JSON.parse(stored));
    } catch (_) {}

    // 6. Écoute Supabase Realtime Broadcast (fallback Cloud optionnel)
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase.channel('nexus-pos-realtime')
          .on('broadcast', { event: 'customer-display-update' }, (msg: any) => {
            if (msg?.payload && Array.isArray(msg.payload.items)) {
              safeApplyUpdate(msg.payload, () => setIsRealtimeActive(true));
            }
          });
        if (!realtimeCircuitBreaker.isOpen()) {
          safeSubscribeChannel(channel, (status: string) => {
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

          // 2. Relais HTTP serveur (avec jeton LAN)
          const lanToken = (() => {
            try { return localStorage.getItem('nexus_lan_token') || 'nexus-pos-lan-v1'; } catch (_) { return 'nexus-pos-lan-v1'; }
          })();
          fetch('/api/customer-display/barcode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-nexus-lan-token': lanToken
            },
            body: JSON.stringify({ barcode: scannedBarcode, lanToken })
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

  return {
    displayState,
    isLocalActive,
    isBcActive,
    isRealtimeActive
  };
}
