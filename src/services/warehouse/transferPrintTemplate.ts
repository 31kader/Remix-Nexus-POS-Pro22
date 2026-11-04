import { StockTransfer } from '../../types/warehouseTypes';
import { escapeHtml } from '../../lib/utils';

export class TransferPrintTemplate {
  static generateA4Html(transfer: StockTransfer, storeName: string = 'NEXUS DISTRIBUTION'): string {
    const rows = transfer.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; font-family: monospace;">${escapeHtml(it.barcode || '-')}</td>
          <td style="padding: 8px; font-weight: bold;">${escapeHtml(it.productName)}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${it.quantitySent}</td>
          <td style="padding: 8px; text-align: right;">${it.quantityReceived || 0}</td>
          <td style="padding: 8px; text-align: right; color: ${it.quantitySent !== it.quantityReceived && transfer.status !== 'in_transit' ? '#e11d48' : '#64748b'};">
            ${it.quantityReceived - it.quantitySent}
          </td>
          <td style="padding: 8px; font-size: 11px; color: #64748b;">${escapeHtml(it.discrepancyReason || '-')}</td>
        </tr>
      `
      )
      .join('');

    const statusBadge =
      transfer.status === 'in_transit'
        ? '<span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-weight: bold;">EN TRANSIT</span>'
        : transfer.status === 'received'
        ? '<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 6px; font-weight: bold;">RÉCEPTIONNÉ</span>'
        : transfer.status === 'partially_received'
        ? '<span style="background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 6px; font-weight: bold;">ÉCART CONSTATÉ</span>'
        : '<span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-weight: bold;">ANNULÉ</span>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bon de Transfert ${escapeHtml(transfer.transferNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
          .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #0f172a; color: white; padding: 8px; text-align: left; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 15px; }
          .sig-box { width: 45%; border-top: 1px dashed #64748b; padding-top: 8px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin: 0; color: #0f172a;">${escapeHtml(storeName)}</h2>
            <p style="margin: 4px 0; color: #64748b;">RÉSEAU DE DISTRIBUTION & LOGISTIQUE</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: #2563eb;">BON DE TRANSFERT INTER-DÉPÔTS</h3>
            <p style="margin: 4px 0; font-weight: bold; font-family: monospace; font-size: 16px;">${escapeHtml(transfer.transferNumber)}</p>
            <div style="margin-top: 5px;">${statusBadge}</div>
          </div>
        </div>

        <div style="display: flex; gap: 15px; margin-top: 15px;">
          <div class="box" style="flex: 1;">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dépôt Expéditeur (Source)</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">${escapeHtml(transfer.sourceWarehouseName)}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Expédié par : ${escapeHtml(transfer.dispatchedBy || '-')}</div>
            <div style="font-size: 12px; color: #475569;">Date : ${new Date(transfer.dispatchedAt || transfer.createdAt).toLocaleString('fr-DZ')}</div>
          </div>
          <div class="box" style="flex: 1;">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dépôt Destinataire (Cible)</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">${escapeHtml(transfer.destinationWarehouseName)}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Réceptionné par : ${escapeHtml(transfer.receivedBy || 'En attente')}</div>
            <div style="font-size: 12px; color: #475569;">Date réception : ${transfer.receivedAt ? new Date(transfer.receivedAt).toLocaleString('fr-DZ') : '-'}</div>
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 12px; color: #475569;">
          <strong>Chauffeur / Transporteur :</strong> ${escapeHtml(transfer.carrierName || 'Interne')} | <strong>Notes :</strong> ${escapeHtml(transfer.notes || 'N/A')}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">N°</th>
              <th style="width: 120px;">Code-barres</th>
              <th>Désignation Article</th>
              <th style="width: 80px; text-align: right;">Qté Expédiée</th>
              <th style="width: 80px; text-align: right;">Qté Reçue</th>
              <th style="width: 80px; text-align: right;">Écart</th>
              <th>Motif / Remarque</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 20px; text-align: right; font-weight: bold; font-size: 14px;">
          Total Articles Expédiés : <span style="color: #2563eb;">${transfer.totalSentQuantity}</span> | 
          Total Reçus : <span style="color: #16a34a;">${transfer.totalReceivedQuantity}</span>
        </div>

        <div class="signatures">
          <div class="sig-box">Visa Expéditeur & Magasinier Source</div>
          <div class="sig-box">Visa Réceptionnaire & Décharge Chauffeur</div>
        </div>
      </body>
      </html>
    `;
  }
}
