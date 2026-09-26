/**
 * 🛡️ RealtimeCircuitBreaker.ts
 * Nexus POS Pro — Coupe-circuit pour connexions Supabase Realtime WebSocket
 * 
 * Rôle :
 * 1. Détecte les échecs consécutifs de connexion WebSocket / Realtime (hors-ligne, proxy, timeout).
 * 2. Coupe le socket après 3 échecs consécutifs pour éliminer les retries infinis et nettoyer la console.
 * 3. Rétablit automatiquement la connexion lors du retour du réseau ('online') ou lors d'une synchronisation manuelle ('force-full-sync').
 * 4. Préserve 100% des opérations de caisse en mode offline-first local (IndexedDB / SQLite).
 */

export class RealtimeCircuitBreaker {
  private failureCount: number = 0;
  private readonly maxFailures: number = 3;
  private isTripped: boolean = false;
  private probeTimer: any = null;
  private socketDisconnectFn: (() => any) | null = null;
  private socketConnectFn: (() => any) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
      window.addEventListener('force-full-sync', () => this.reset('manual_sync'));
    }
  }

  /**
   * Enregistre les gestionnaires de connexion du socket Supabase
   */
  public registerSocketHandlers(disconnect: () => any, connect: () => any): void {
    this.socketDisconnectFn = disconnect;
    this.socketConnectFn = connect;
  }

  /**
   * Vérifie si le coupe-circuit est ouvert (bloquant)
   */
  public isOpen(): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return true;
    }
    return this.isTripped;
  }

  /**
   * Calcule le délai de reconnexion pour Supabase Phoenix Socket
   */
  public getReconnectInterval(tries: number): number {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 300000; // 5 minutes en mode hors-ligne
    }
    if (this.isOpen()) {
      return 300000; // 5 minutes si coupe-circuit actif
    }
    if (tries > this.maxFailures) {
      this.recordFailure('reconnect_limit');
      return 60000; // 60 secondes minimum
    }
    const intervals = [1000, 2000, 5000];
    return intervals[tries - 1] || 10000;
  }

  /**
   * Enregistre un succès de connexion Realtime
   */
  public recordSuccess(): void {
    const wasOpenOrFailing = this.isTripped || this.failureCount > 0;
    this.failureCount = 0;
    this.isTripped = false;

    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }

    if (wasOpenOrFailing) {
      console.log('[Realtime] ✅ Connexion Realtime établie et stabilisée.');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-realtime-status', { 
        detail: { status: 'connected' } 
      }));
    }
  }

  /**
   * Enregistre un échec de connexion (canal ou socket)
   */
  public recordFailure(source?: string, error?: any): void {
    this.failureCount++;

    if (this.failureCount >= this.maxFailures && !this.isTripped) {
      this.trip(source || 'max_failures_reached');
    }
  }

  /**
   * Déclenche l'ouverture du coupe-circuit (mise en pause)
   */
  public trip(reason: string = 'network_error'): void {
    this.isTripped = true;

    console.info(
      `[Realtime] ⏸️ Coupe-circuit activé (${reason}) : Mode hors-ligne ou réseau instable. ` +
      `Les tentatives WebSocket sont suspendues pour préserver la mémoire et la fluidité de la caisse. ` +
      `Le fonctionnement local (IndexedDB) reste 100% opérationnel.`
    );

    // Déconnexion physique du socket pour arrêter le cycle de retries Phoenix
    if (this.socketDisconnectFn) {
      try {
        this.socketDisconnectFn();
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-realtime-status', { 
        detail: { status: 'idle', reason: 'circuit_breaker_tripped' } 
      }));
    }

    // Planifie une tentative discrète après 3 minutes au cas où la connexion revient sans événement 'online'
    if (this.probeTimer) clearTimeout(this.probeTimer);
    this.probeTimer = setTimeout(() => {
      if (this.isTripped && (typeof navigator === 'undefined' || navigator.onLine)) {
        console.log('[Realtime] 🔄 Tentative périodique discrète de réveil Realtime...');
        this.reset('periodic_probe');
      }
    }, 180000);
  }

  /**
   * Réinitialise le coupe-circuit et tente une reconnexion
   */
  public reset(reason: string = 'manual'): void {
    this.failureCount = 0;
    this.isTripped = false;

    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    console.log(`[Realtime] 🔄 Réinitialisation du coupe-circuit (${reason}). Tentative de reconnexion...`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-realtime-status', { 
        detail: { status: 'reconnecting', reason } 
      }));
      window.dispatchEvent(new CustomEvent('nexus-realtime-retry'));
    }

    if (this.socketConnectFn) {
      try {
        this.socketConnectFn();
      } catch (_) {}
    }
  }

  private handleNetworkOnline(): void {
    console.log('[Realtime] 🌐 Connexion réseau détectée (online). Rétablissement Realtime...');
    this.reset('browser_online');
  }

  private handleNetworkOffline(): void {
    console.log('[Realtime] 📴 Mode hors-ligne détecté (offline). Coupe-circuit activé immédiatement.');
    this.trip('browser_offline');
  }
}

export const realtimeCircuitBreaker = new RealtimeCircuitBreaker();

/**
 * 🛡️ Transport WebSocket résilient qui prévient le spam d'erreurs réseau dans DevTools
 * lorsque la caisse est hors-ligne ou que le coupe-circuit est actif.
 */
export function getSafeWebSocketTransport(circuitBreaker: RealtimeCircuitBreaker): any {
  return class SafeWebSocket {
    private ws: WebSocket | null = null;
    public binaryType: string = 'arraybuffer';
    public onopen: any = null;
    public onclose: any = null;
    public onerror: any = null;
    public onmessage: any = null;

    constructor(address: string | URL, protocols?: string | string[]) {
      if (circuitBreaker.isOpen() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setTimeout(() => {
          if (typeof this.onclose === 'function') {
            const ev = typeof CloseEvent !== 'undefined' 
              ? new CloseEvent('close', { wasClean: true, code: 1000, reason: 'Offline / Circuit Breaker Active' })
              : ({ wasClean: true, code: 1000, reason: 'Offline / Circuit Breaker Active' } as any);
            try { this.onclose(ev); } catch (_) {}
          }
        }, 50);
        return;
      }

      try {
        const NativeWebSocket = typeof window !== 'undefined' ? window.WebSocket : (globalThis as any).WebSocket;
        if (!NativeWebSocket) return;
        
        const socketInstance: WebSocket = protocols ? new NativeWebSocket(address, protocols) : new NativeWebSocket(address);
        this.ws = socketInstance;
        socketInstance.binaryType = 'arraybuffer';

        socketInstance.onopen = (ev: Event) => {
          circuitBreaker.recordSuccess();
          if (typeof this.onopen === 'function') this.onopen(ev);
        };
        socketInstance.onclose = (ev: CloseEvent) => {
          if (typeof this.onclose === 'function') this.onclose(ev);
        };
        socketInstance.onerror = (ev: Event) => {
          circuitBreaker.recordFailure('websocket_network_error');
          if (typeof this.onerror === 'function') this.onerror(ev);
        };
        socketInstance.onmessage = (ev: MessageEvent) => {
          if (typeof this.onmessage === 'function') this.onmessage(ev);
        };
      } catch (err) {
        circuitBreaker.recordFailure('websocket_constructor_error', err);
        setTimeout(() => {
          if (typeof this.onclose === 'function') {
            const ev = typeof CloseEvent !== 'undefined'
              ? new CloseEvent('close', { wasClean: false, code: 1006, reason: 'Connection failed' })
              : ({ wasClean: false, code: 1006, reason: 'Connection failed' } as any);
            try { this.onclose(ev); } catch (_) {}
          }
        }, 50);
      }
    }

    get readyState(): number {
      return this.ws ? this.ws.readyState : 3; // 3 = CLOSED
    }

    get bufferedAmount(): number {
      return this.ws ? this.ws.bufferedAmount : 0;
    }

    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      if (this.ws && this.ws.readyState === 1) { // 1 = OPEN
        this.ws.send(data);
      }
    }

    public close(code?: number, reason?: string): void {
      if (!this.ws) return;
      const sock = this.ws;
      this.ws = null;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;

      if (sock.readyState === 0) {
        // 🛡️ Si le WebSocket est encore en cours de handshake TLS (CONNECTING),
        // appeler sock.close() immédiatement provoque l'erreur Chrome "WebSocket connection to 'wss://...' failed".
        // On attend la fin du handshake pour le fermer proprement.
        sock.onopen = () => {
          try { sock.close(code || 1000, reason); } catch (_) {}
        };
        sock.onerror = () => {};
        sock.onclose = () => {};
      } else if (sock.readyState === 1) {
        try {
          sock.close(code || 1000, reason);
        } catch (_) {}
      }
    }
  };
}
