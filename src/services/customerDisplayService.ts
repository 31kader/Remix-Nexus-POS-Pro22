import { io, Socket } from 'socket.io-client';
import { supabase, isSupabaseConfigured, realtimeCircuitBreaker } from '../supabase';

export interface CustomerDisplayState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    barcode?: string;
    image?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  customerName?: string;
  isPaid?: boolean;
}

let lastBroadcastPayload: string = '';
let currentDisplayState: CustomerDisplayState | null = null;
let persistentBroadcastChannel: BroadcastChannel | null = null;
let socketInstance: Socket | null = null;

const DEFAULT_LAN_TOKEN = 'nexus-pos-lan-v1';

export function getPosLanToken(): string {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_lan_token') || DEFAULT_LAN_TOKEN;
    }
  } catch (_) {}
  return DEFAULT_LAN_TOKEN;
}

/**
 * 🟢 Instance Socket.IO singleton pour diffusion ultra-rapide sur le réseau local (Wi-Fi)
 */
export function getCustomerDisplaySocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (!socketInstance) {
    try {
      socketInstance = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        timeout: 5000,
        auth: {
          token: getPosLanToken()
        }
      });
    } catch (e) {
      console.warn('[CustomerDisplay] Socket.IO initialization error:', e);
      socketInstance = null;
    }
  }
  return socketInstance;
}

/**
 * 🟢 Instance singleton BroadcastChannel persistante (évite les fermetures prématurées)
 */
export function getCustomerDisplayBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!persistentBroadcastChannel) {
    try {
      persistentBroadcastChannel = new BroadcastChannel('nexus_customer_display');
      // Répondre automatiquement si un écran client fraîchement ouvert réclame l'état du panier
      persistentBroadcastChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'REQUEST_CURRENT_STATE' && currentDisplayState) {
          try {
            persistentBroadcastChannel?.postMessage(currentDisplayState);
          } catch (_) {}
        }
      });
    } catch (e) {
      console.warn('[CustomerDisplay] BroadcastChannel not supported:', e);
      persistentBroadcastChannel = null;
    }
  }
  return persistentBroadcastChannel;
}

/**
 * 🟢 Récupère le dernier état connu de l'afficheur client
 */
export function getLastCustomerDisplayState(): CustomerDisplayState | null {
  if (currentDisplayState) return currentDisplayState;
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexus_customer_display_state');
      if (stored) {
        currentDisplayState = JSON.parse(stored);
        return currentDisplayState;
      }
    }
  } catch (_) {}
  return null;
}

// Throttle HTTP POST to prevent rapid-fire network requests
let httpPostTimeout: any = null;

/**
 * 🟢 Diffuse l'état du panier en temps réel à tous les écrans clients
 * (Supporte le multi-écrans local, les tablettes/smartphones Wi-Fi sans fil, et le Cloud Supabase)
 */
export function broadcastCustomerDisplay(state: CustomerDisplayState): void {
  const stateWithTs = { ...state, updatedAt: (state as any).updatedAt || Date.now() };
  currentDisplayState = stateWithTs;
  const serialized = JSON.stringify(stateWithTs);
  if (serialized === lastBroadcastPayload) return;
  lastBroadcastPayload = serialized;

  // 1. Diffusion locale via BroadcastChannel (ZÉRO latence pour même PC / 2ème écran câble)
  try {
    const bc = getCustomerDisplayBroadcastChannel();
    if (bc) {
      bc.postMessage(stateWithTs);
    }
  } catch (_) {}

  // 2. Sauvegarde en localStorage (pour onglets et fenêtres du même navigateur)
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_customer_display_state', serialized);
    }
  } catch (_) {}

  // 3. Diffusion temps réel réseau local via Socket.IO (Wi-Fi, zéro latence pour smartphone/tablette)
  let isSocketConnected = false;
  try {
    const socket = getCustomerDisplaySocket();
    if (socket && socket.connected) {
      isSocketConnected = true;
      socket.emit('customer-display:send', { ...stateWithTs, lanToken: getPosLanToken() });
    }
  } catch (_) {}

  // 4. Diffusion HTTP REST au serveur local (relais SSE et persistance serveur) uniquement si socket déconnecté
  if (!isSocketConnected && typeof window !== 'undefined') {
    if (httpPostTimeout) clearTimeout(httpPostTimeout);
    httpPostTimeout = setTimeout(() => {
      fetch('/api/customer-display', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nexus-lan-token': getPosLanToken()
        },
        body: serialized
      }).catch(() => {});
    }, 40);
  }

  // 5. Diffusion sans fil globale via Supabase Realtime (si connecté au Cloud et canal déjà joint)
  try {
    if (isSupabaseConfigured && supabase && !realtimeCircuitBreaker.isOpen() && typeof supabase.getChannels === 'function') {
      const existingChannel = supabase.getChannels().find(
        (c: any) => (c.name === 'nexus-pos-realtime' || c.topic === 'realtime:nexus-pos-realtime') && c.state === 'joined'
      );
      if (existingChannel) {
        existingChannel.send({
          type: 'broadcast',
          event: 'customer-display-update',
          payload: state
        }).catch(() => {});
      }
    }
  } catch (_) {}
}

let cachedNetworkIp: string | null = null;

/**
 * 🟢 Récupère l'IP locale réelle du PC sur le réseau Wi-Fi/LAN via l'API serveur
 */
export async function fetchNetworkIp(): Promise<string> {
  if (cachedNetworkIp) return cachedNetworkIp;
  try {
    const res = await fetch('/api/network-ip');
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== 'localhost' && data.ip !== '127.0.0.1') {
        cachedNetworkIp = data.ip;
        return data.ip;
      }
    }
  } catch (_) {}
  return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
}

/**
 * 🟢 Retourne l'URL complète pour ouvrir l'afficheur client sur n'importe quel appareil
 */
export function getCustomerDisplayUrl(overrideHost?: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.hash = 'customer-display';
  if (overrideHost) {
    url.hostname = overrideHost;
  }
  return url.toString();
}
