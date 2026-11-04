import {
  StockTransfer,
  CreateStockTransferDto,
  ReceiveStockTransferDto,
  StockTransferItem
} from '../../types/warehouseTypes';
import { enqueueStockAdjustment } from '../SyncService';

const TRANSFERS_STORAGE_KEY = 'nexus_pos_stock_transfers';

export class StockTransferService {
  static getTransfers(): StockTransfer[] {
    try {
      const raw = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveTransfers(transfers: StockTransfer[]): void {
    try {
      localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
    } catch (e) {
      console.error('[StockTransferService] Erreur sauvegarde transferts:', e);
    }
  }

  static generateTransferNumber(): string {
    const year = new Date().getFullYear();
    const count = this.getTransfers().length + 1;
    return `BLT-${year}-${String(count).padStart(4, '0')}`;
  }

  static createTransfer(dto: CreateStockTransferDto): StockTransfer {
    // Règle Projet: Consolidation préalable par productId via Map avant tout déstockage
    const consolidatedMap = new Map<string, { item: Omit<StockTransferItem, 'quantityReceived'>; qty: number }>();
    for (const it of dto.items) {
      if (it.quantitySent <= 0) continue;
      const existing = consolidatedMap.get(it.productId);
      if (existing) {
        existing.qty += it.quantitySent;
      } else {
        consolidatedMap.set(it.productId, { item: it, qty: it.quantitySent });
      }
    }

    const consolidatedItems: StockTransferItem[] = Array.from(consolidatedMap.values()).map(({ item, qty }) => ({
      productId: item.productId,
      productName: item.productName,
      barcode: item.barcode,
      quantitySent: qty,
      quantityReceived: 0,
      unitCostPrice: item.unitCostPrice || 0
    }));

    const totalSent = consolidatedItems.reduce((acc, i) => acc + i.quantitySent, 0);

    const newTransfer: StockTransfer = {
      id: `blt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      transferNumber: this.generateTransferNumber(),
      sourceWarehouseId: dto.sourceWarehouseId,
      sourceWarehouseName: dto.sourceWarehouseName,
      destinationWarehouseId: dto.destinationWarehouseId,
      destinationWarehouseName: dto.destinationWarehouseName,
      status: 'in_transit',
      items: consolidatedItems,
      totalSentQuantity: totalSent,
      totalReceivedQuantity: 0,
      hasDiscrepancy: false,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: dto.dispatchedBy || 'Opérateur Caisse',
      carrierName: dto.carrierName || 'Transporteur Interne',
      notes: dto.notes || '',
      createdAt: new Date().toISOString()
    };

    // Décrémenter le stock source via SyncService avec deltas consolidés
    for (const item of consolidatedItems) {
      enqueueStockAdjustment(
        item.productId,
        -item.quantitySent,
        { reason: `Transfert ${newTransfer.transferNumber} vers ${newTransfer.destinationWarehouseName}` }
      );
    }

    const transfers = this.getTransfers();
    transfers.unshift(newTransfer);
    this.saveTransfers(transfers);

    return newTransfer;
  }

  static receiveTransfer(dto: ReceiveStockTransferDto): StockTransfer {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === dto.transferId);
    if (index === -1) {
      throw new Error(`Transfert introuvable: ${dto.transferId}`);
    }

    const transfer = transfers[index];
    if (transfer.status !== 'in_transit' && transfer.status !== 'partially_received') {
      throw new Error(`Le statut actuel (${transfer.status}) ne permet pas la réception.`);
    }

    // Map des quantités reçues fournies
    const receivedMap = new Map<string, { qty: number; reason?: string }>();
    for (const r of dto.receivedItems) {
      receivedMap.set(r.productId, { qty: r.quantityReceived, reason: r.discrepancyReason });
    }

    let totalReceived = 0;
    let hasDiscrepancy = false;

    // Mise à jour des items du transfert
    const updatedItems: StockTransferItem[] = transfer.items.map(item => {
      const rec = receivedMap.get(item.productId);
      const qtyReceived = rec !== undefined ? rec.qty : item.quantitySent; // Par défaut reçue = envoyée si non spécifié
      const reason = rec?.reason || (qtyReceived !== item.quantitySent ? 'Écart constaté au pointage' : undefined);

      if (qtyReceived !== item.quantitySent) {
        hasDiscrepancy = true;
      }

      totalReceived += qtyReceived;

      return {
        ...item,
        quantityReceived: qtyReceived,
        discrepancyReason: reason
      };
    });

    // Règle: Incrémenter le stock destination pour chaque article effectivement réceptionné
    for (const item of updatedItems) {
      if (item.quantityReceived > 0) {
        enqueueStockAdjustment(
          item.productId,
          item.quantityReceived,
          { reason: `Réception ${transfer.transferNumber} depuis ${transfer.sourceWarehouseName}` }
        );
      }
    }

    const finalStatus: StockTransfer['status'] = hasDiscrepancy ? 'partially_received' : 'received';

    const updatedTransfer: StockTransfer = {
      ...transfer,
      items: updatedItems,
      status: finalStatus,
      totalReceivedQuantity: totalReceived,
      hasDiscrepancy,
      receivedAt: new Date().toISOString(),
      receivedBy: dto.receivedBy || 'Responsable Réception',
      notes: dto.notes ? `${transfer.notes || ''} | Reçu: ${dto.notes}` : transfer.notes,
      updatedAt: new Date().toISOString()
    };

    transfers[index] = updatedTransfer;
    this.saveTransfers(transfers);

    return updatedTransfer;
  }

  static cancelTransfer(transferId: string, reason: string): StockTransfer {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === transferId);
    if (index === -1) throw new Error('Transfert introuvable');

    const transfer = transfers[index];
    if (transfer.status !== 'in_transit') {
      throw new Error('Seul un transfert en transit peut être annulé pour réintégration du stock');
    }

    // Réintégrer le stock au dépôt d'origine
    for (const item of transfer.items) {
      enqueueStockAdjustment(
        item.productId,
        item.quantitySent,
        { reason: `Annulation ${transfer.transferNumber}: ${reason}` }
      );
    }

    transfer.status = 'cancelled';
    transfer.notes = `${transfer.notes || ''} [Annulé: ${reason}]`;
    transfer.updatedAt = new Date().toISOString();

    transfers[index] = transfer;
    this.saveTransfers(transfers);
    return transfer;
  }
}
