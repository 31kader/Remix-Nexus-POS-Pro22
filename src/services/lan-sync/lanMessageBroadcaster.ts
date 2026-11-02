import { Socket } from 'socket.io-client';
import { 
  LanRole, 
  LanSyncAction, 
  LanSyncMessage, 
  LanStockAdjustmentPayload,
  LanCustomerBalancePayload
} from '../../types/lanSync';
import { getTerminalId, getTerminalName } from '../terminalService';
import { savePendingQueueToStorage } from './lanSyncStorage';

export class LanMessageBroadcaster {
  private processedMessageIds: Set<string> = new Set();
  private maxProcessedHistory: number = 5000;

  public markMessageProcessed(id: string): void {
    this.processedMessageIds.add(id);
    if (this.processedMessageIds.size > this.maxProcessedHistory) {
      const it = this.processedMessageIds.values();
      for (let i = 0; i < 500; i++) {
        const next = it.next();
        if (next.done) break;
        this.processedMessageIds.delete(next.value);
      }
    }
  }

  public hasMessageBeenProcessed(id: string): boolean {
    return this.processedMessageIds.has(id);
  }

  public sendLanAction<T = any>(
    action: LanSyncAction, 
    payload: T, 
    socket: Socket | null, 
    lanToken: string,
    pendingOutgoing: LanSyncMessage[],
    onNotifyStateChange: () => void
  ): void {
    const message: LanSyncMessage<T> = {
      id: `lan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      originTerminalId: getTerminalId(),
      originTerminalName: getTerminalName(),
      action,
      timestamp: new Date().toISOString(),
      payload,
      version: '1.2.59',
      lanToken
    };

    this.markMessageProcessed(message.id);

    if (socket && socket.connected) {
      try {
        socket.emit('lan:sync', message);
      } catch (e) {
        console.warn('[LanSyncService] Échec envoi socket, mise en file:', e);
        this.queuePendingMessage(message, pendingOutgoing, onNotifyStateChange);
      }
    } else {
      this.queuePendingMessage(message, pendingOutgoing, onNotifyStateChange);
    }
  }

  public queuePendingMessage(
    message: LanSyncMessage, 
    pendingOutgoing: LanSyncMessage[], 
    onNotifyStateChange: () => void
  ): void {
    pendingOutgoing.push(message);
    savePendingQueueToStorage(pendingOutgoing);
    onNotifyStateChange();
  }

  public flushPendingOutgoingQueue(
    socket: Socket | null, 
    pendingOutgoing: LanSyncMessage[], 
    onNotifyStateChange: () => void
  ): LanSyncMessage[] {
    if (!socket || !socket.connected || pendingOutgoing.length === 0) return pendingOutgoing;

    const queueToSend = [...pendingOutgoing];
    let remainingQueue: LanSyncMessage[] = [];
    savePendingQueueToStorage(remainingQueue);

    for (const msg of queueToSend) {
      try {
        socket.emit('lan:sync', msg);
      } catch (_) {
        remainingQueue.push(msg);
      }
    }
    savePendingQueueToStorage(remainingQueue);
    onNotifyStateChange();
    return remainingQueue;
  }

  public broadcastStockAdjustment(
    currentRole: LanRole,
    socket: Socket | null,
    lanToken: string,
    pendingOutgoing: LanSyncMessage[],
    onNotifyStateChange: () => void,
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
    if (currentRole === 'STANDALONE') return;

    const payload: LanStockAdjustmentPayload = {
      productId,
      adjustment,
      delta: adjustment,
      mode: options?.mode || 'delta',
      adjustmentId: options?.adjustmentId || `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      reason: options?.reason,
      userId: options?.userId,
      userName: options?.userName,
      isLoss: options?.isLoss ?? (adjustment < 0),
      newQuantity: options?.newQuantity,
      timestamp: new Date().toISOString()
    };

    this.sendLanAction('STOCK_ADJUSTMENT', payload, socket, lanToken, pendingOutgoing, onNotifyStateChange);
  }

  public broadcastCustomerBalance(
    currentRole: LanRole,
    socket: Socket | null,
    lanToken: string,
    pendingOutgoing: LanSyncMessage[],
    onNotifyStateChange: () => void,
    customerId: string, 
    deltaBalance: number, 
    deltaSpent: number = 0, 
    deltaPoints: number = 0
  ): void {
    if (currentRole === 'STANDALONE') return;

    const payload: LanCustomerBalancePayload = {
      customerId,
      deltaBalance,
      deltaSpent,
      deltaPoints,
      timestamp: new Date().toISOString()
    };

    this.sendLanAction('CUSTOMER_BALANCE_UPDATE', payload, socket, lanToken, pendingOutgoing, onNotifyStateChange);
  }
}
