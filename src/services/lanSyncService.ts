/**
 * Nexus POS Pro — Service de Synchronisation Réseau Local (LAN) Multi-Caisses
 * 
 * Permet l'interconnexion en direct de plusieurs postes de caisse via Câble Ethernet ou Wi-Fi :
 * - Un poste configuré en Caisse Maître (Hub LAN)
 * - Les autres postes en Caisses Secondaires (Clients LAN)
 */

import { Socket } from 'socket.io-client';
import { 
  LanRole, 
  LanSyncMessage, 
  LanTerminalInfo, 
  LanSyncState, 
  HybridNetworkMode
} from '../types/lanSync';
import { getTerminalId } from './terminalService';
import {
  DEFAULT_PORT,
  loadPendingQueueFromStorage,
  applyStockAdjustment,
  applyIncomingTransaction,
  applyTransactionUpdate,
  applyCustomerBalanceUpdate,
  buildTargetUrl,
  testLanConnection,
  LanSocketManager,
  LanMessageBroadcaster,
  LanConfigManager
} from './lan-sync';

class LanSyncService {
  private socketManager: LanSocketManager = new LanSocketManager();
  private broadcaster: LanMessageBroadcaster = new LanMessageBroadcaster();
  private configManager: LanConfigManager = new LanConfigManager();
  private isLanConnected: boolean = false;
  private isInternetConnected: boolean = true;
  private connectedPeers: LanTerminalInfo[] = [];
  private pendingOutgoing: LanSyncMessage[] = [];
  private listeners: Set<(state: LanSyncState) => void> = new Set();
  private currentLatencyMs: number | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isInternetConnected = navigator.onLine;
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.pendingOutgoing = loadPendingQueueFromStorage();

    if (this.getRole() !== 'STANDALONE') {
      this.connect();
    }
  }

  public loadConfiguration(): void {
    this.configManager.reload();
  }

  public setRole(role: LanRole): void {
    if (!this.configManager.setRole(role)) return;
    this.disconnect();
    if (role !== 'STANDALONE') {
      this.connect();
    }
    this.notifyStateChange();
  }

  public getRole(): LanRole {
    return this.configManager.currentRole;
  }

  public setMasterIp(ip: string): void {
    if (!this.configManager.setMasterIp(ip)) return;
    if (this.getRole() === 'SECONDARY') {
      this.disconnect();
      this.connect();
    }
    this.notifyStateChange();
  }

  public getMasterIp(): string {
    return this.configManager.masterIp;
  }

  public setMasterPort(port: number): void {
    if (!this.configManager.setMasterPort(port)) return;
    if (this.getRole() === 'SECONDARY') {
      this.disconnect();
      this.connect();
    }
    this.notifyStateChange();
  }

  public getMasterPort(): number {
    return this.configManager.masterPort;
  }

  public setLanToken(token: string): void {
    if (!this.configManager.setLanToken(token)) return;
    if (this.getRole() !== 'STANDALONE') {
      this.disconnect();
      this.connect();
    }
    this.notifyStateChange();
  }

  public getLanToken(): string {
    return this.configManager.lanToken;
  }

  public getHybridMode(): HybridNetworkMode {
    if (this.isLanConnected && this.isInternetConnected) {
      return 'LAN_AND_CLOUD';
    }
    if (this.isLanConnected && !this.isInternetConnected) {
      return 'LAN_ONLY';
    }
    if (!this.isLanConnected && this.isInternetConnected) {
      return 'CLOUD_ONLY';
    }
    return 'OFFLINE_ISOLATED';
  }

  public getState(): LanSyncState {
    return {
      role: this.configManager.currentRole,
      masterIp: this.configManager.masterIp,
      masterPort: this.configManager.masterPort,
      lanToken: this.configManager.lanToken,
      isLanConnected: this.isLanConnected,
      isInternetConnected: this.isInternetConnected,
      hybridMode: this.getHybridMode(),
      connectedPeers: [...this.connectedPeers],
      lastSyncTimestamp: new Date().toISOString(),
      pendingOutgoingCount: this.pendingOutgoing.length,
      latencyMs: this.currentLatencyMs
    };
  }

  public buildTargetUrl(ip: string, port?: number): string {
    return buildTargetUrl(ip, port || this.configManager.masterPort);
  }

  public get socket(): Socket | null {
    return this.socketManager.getSocket();
  }

  public set socket(s: Socket | null) {
    this.socketManager.setSocket(s);
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    const role = this.getRole();
    if (role === 'STANDALONE') return;

    this.disconnect();

    const targetUrl = role === 'MASTER'
      ? window.location.origin
      : this.buildTargetUrl(this.configManager.masterIp, this.configManager.masterPort);

    this.socketManager.connect(targetUrl, role, this.configManager.lanToken, {
      onConnect: () => {
        this.isLanConnected = true;
        this.flushPendingOutgoingQueue();
        this.notifyStateChange();
      },
      onDisconnect: () => {
        this.isLanConnected = false;
        this.currentLatencyMs = null;
        this.notifyStateChange();
      },
      onConnectError: () => {
        this.isLanConnected = false;
        this.currentLatencyMs = null;
        this.notifyStateChange();
      },
      onSyncMessage: (message: LanSyncMessage) => {
        this.handleIncomingMessage(message);
      },
      onTerminalsUpdate: (peers: LanTerminalInfo[]) => {
        this.connectedPeers = peers;
        this.notifyStateChange();
      },
      onLatencyUpdate: (latency: number) => {
        this.currentLatencyMs = latency;
        this.notifyStateChange();
      }
    });
  }

  public disconnect(): void {
    this.socketManager.disconnect();
    this.isLanConnected = false;
    this.currentLatencyMs = null;
  }

  public handleIncomingMessage(message: LanSyncMessage): void {
    if (!message || !message.id || !message.action) return;
    if (message.originTerminalId === getTerminalId()) return;
    if (this.broadcaster.hasMessageBeenProcessed(message.id)) return;
    this.broadcaster.markMessageProcessed(message.id);

    try {
      switch (message.action) {
        case 'STOCK_ADJUSTMENT':
          applyStockAdjustment(message.payload);
          break;
        case 'TRANSACTION_NEW':
          applyIncomingTransaction(message.payload);
          break;
        case 'TRANSACTION_UPDATE':
          applyTransactionUpdate(message.payload);
          break;
        case 'CUSTOMER_BALANCE_UPDATE':
          applyCustomerBalanceUpdate(message.payload);
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[LanSyncService] Erreur traitement message entrant:', err, message);
    }
  }

  public broadcastStockAdjustment(
    productId: string, 
    adjustment: number, 
    options?: {
      mode?: 'delta' | 'set';
      adjustmentId?: string;
      reason?: string;
      userId?: string;
      userName?: string;
      isLoss?: boolean;
      newQuantity?: number;
    }
  ): void {
    this.broadcaster.broadcastStockAdjustment(
      this.getRole(),
      this.socket,
      this.configManager.lanToken,
      this.pendingOutgoing,
      () => this.notifyStateChange(),
      productId,
      adjustment,
      options
    );
  }

  public broadcastTransaction(transaction: any): void {
    if (this.getRole() === 'STANDALONE') return;
    this.broadcaster.sendLanAction(
      'TRANSACTION_NEW', 
      transaction, 
      this.socket, 
      this.configManager.lanToken, 
      this.pendingOutgoing, 
      () => this.notifyStateChange()
    );
  }

  public broadcastTransactionUpdate(transaction: any): void {
    if (this.getRole() === 'STANDALONE') return;
    this.broadcaster.sendLanAction(
      'TRANSACTION_UPDATE', 
      transaction, 
      this.socket, 
      this.configManager.lanToken, 
      this.pendingOutgoing, 
      () => this.notifyStateChange()
    );
  }

  public broadcastCustomerBalance(
    customerId: string, 
    deltaBalance: number, 
    deltaSpent: number = 0, 
    deltaPoints: number = 0
  ): void {
    this.broadcaster.broadcastCustomerBalance(
      this.getRole(),
      this.socket,
      this.configManager.lanToken,
      this.pendingOutgoing,
      () => this.notifyStateChange(),
      customerId,
      deltaBalance,
      deltaSpent,
      deltaPoints
    );
  }

  private flushPendingOutgoingQueue(): void {
    this.pendingOutgoing = this.broadcaster.flushPendingOutgoingQueue(
      this.socket,
      this.pendingOutgoing,
      () => this.notifyStateChange()
    );
  }

  private handleNetworkChange(online: boolean): void {
    this.isInternetConnected = online;
    this.notifyStateChange();
  }

  public subscribe(callback: (state: LanSyncState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.listeners.forEach(cb => {
      try { cb(state); } catch (_) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-lan-status-changed', {
        detail: state
      }));
    }
  }

  public async testConnection(
    overrideIp?: string, 
    overridePort?: number
  ): Promise<{ success: boolean; latencyMs?: number; message?: string; info?: any }> {
    const targetHost = (overrideIp || this.configManager.masterIp || 'localhost').trim();
    const port = overridePort || this.configManager.masterPort || DEFAULT_PORT;
    return testLanConnection(targetHost, port, this.configManager.lanToken);
  }
}

export const lanSyncService = new LanSyncService();
