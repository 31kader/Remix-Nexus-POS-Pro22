import { io, Socket } from 'socket.io-client';
import { LanRole, LanSyncMessage, LanTerminalInfo } from '../../types/lanSync';
import { getTerminalId, getTerminalName } from '../terminalService';

export interface LanSocketCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onConnectError: () => void;
  onSyncMessage: (msg: LanSyncMessage) => void;
  onTerminalsUpdate: (terminals: LanTerminalInfo[]) => void;
  onLatencyUpdate: (latencyMs: number) => void;
}

export class LanSocketManager {
  private socket: Socket | null = null;
  private pingInterval: any = null;
  private lastPingSentTime: number = 0;

  public getSocket(): Socket | null {
    return this.socket;
  }

  public setSocket(s: Socket | null): void {
    this.socket = s;
  }

  public connect(
    targetUrl: string,
    role: LanRole,
    lanToken: string,
    callbacks: LanSocketCallbacks
  ): void {
    this.disconnect();

    try {
      this.socket = io(targetUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 4000,
        transports: ['websocket', 'polling'],
        auth: {
          token: lanToken,
          terminalId: getTerminalId(),
          terminalName: getTerminalName(),
          role
        }
      });

      this.socket.on('connect', () => {
        this.registerTerminalWithHub(role, lanToken);
        this.startPingRoutine();
        callbacks.onConnect();
      });

      this.socket.on('disconnect', () => {
        this.stopPingRoutine();
        callbacks.onDisconnect();
      });

      this.socket.on('connect_error', () => {
        callbacks.onConnectError();
      });

      this.socket.on('lan:sync', (message: LanSyncMessage) => {
        callbacks.onSyncMessage(message);
      });

      this.socket.on('lan:terminals-update', (terminals: LanTerminalInfo[]) => {
        if (Array.isArray(terminals)) {
          const peers = terminals.filter(t => t && t.terminalId !== getTerminalId());
          callbacks.onTerminalsUpdate(peers);
        }
      });

      this.socket.on('lan:pong', (data: { timestamp: number }) => {
        if (data && data.timestamp && this.lastPingSentTime) {
          const latency = Math.max(1, Date.now() - this.lastPingSentTime);
          callbacks.onLatencyUpdate(latency);
        }
      });

    } catch (e) {
      console.warn('[LanSocketManager] Erreur initialisation socket:', e);
      callbacks.onConnectError();
    }
  }

  public disconnect(): void {
    this.stopPingRoutine();
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (_) {}
      this.socket = null;
    }
  }

  public registerTerminalWithHub(role: LanRole, lanToken: string): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('lan:register', {
      terminalId: getTerminalId(),
      terminalName: getTerminalName(),
      role,
      version: '1.2.59',
      lanToken
    });
  }

  public startPingRoutine(): void {
    this.stopPingRoutine();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.lastPingSentTime = Date.now();
        this.socket.emit('lan:ping', { timestamp: this.lastPingSentTime });
      }
    }, 10000);
  }

  public stopPingRoutine(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
