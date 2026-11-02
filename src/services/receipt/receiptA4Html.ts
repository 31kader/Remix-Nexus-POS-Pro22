import { formatSafe, formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ReceiptA4Options {
  receiptId: string;
  t: any;
  settings: CompanySettings;
  itemsHtml: string;
  subtotalBeforeDiscounts: number;
  totalSavings: number;
  totalHT: number;
  taxRate: number;
  totalTVA: number;
  totalTTC: number;
}

export function buildReceiptA4Html(opts: ReceiptA4Options): string {
  const {
    receiptId,
    t,
    settings,
    itemsHtml,
    subtotalBeforeDiscounts,
    totalSavings,
    totalHT,
    taxRate,
    totalTVA,
    totalTTC,
  } = opts;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Facture #${receiptId}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111;
            background: white;
            padding: 0;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 25px; align-items: flex-end;">
             <div>
                <h1 style="margin: 0; font-size: 28px; text-transform: uppercase; color: #111; font-weight: 900; letter-spacing: 2px;">FACTURE</h1>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 11px; letter-spacing: 1px; font-weight: bold;">N° #${receiptId}</p>
             </div>
             <div style="text-align: right;">
                <div style="font-weight: 900; font-size: 18px; text-transform: uppercase; color: #111; letter-spacing: 1px;">${escapeHtml(settings.name || 'NEXUS STORE')}</div>
                ${settings.address ? `<div style="font-size: 11px; color: #555; margin-top: 4px;">${escapeHtml(settings.address)}</div>` : ''}
                ${settings.phone ? `<div style="font-size: 11px; color: #555; margin-top: 2px;">Tel: ${escapeHtml(settings.phone)}</div>` : ''}
                ${settings.taxNumber ? `<div style="font-size: 11px; color: #555; margin-top: 2px;">N° TVA: ${escapeHtml(settings.taxNumber)}</div>` : ''}
             </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
             <div>
                <h3 style="margin: 0 0 6px 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 850;">FACTURÉ À</h3>
                <div style="font-size: 14px; font-weight: 900; color: #111;">${escapeHtml(t.customerName || 'Client de Passage')}</div>
             </div>
             <div style="text-align: right; font-size: 12px; color: #333; line-height: 1.6;">
                <div><strong>Date d'Émission :</strong> ${formatSafe(t.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}</div>
                <div><strong>Mode de Paiement :</strong> ${escapeHtml((t.paymentMethod || 'Espèces').toUpperCase())}</div>
                <div style="text-transform: uppercase;"><strong>Caissier :</strong> ${escapeHtml(t.employeeName || 'ADMIN')}</div>
             </div>
          </div>

          <div style="margin-bottom: 30px;">
            ${itemsHtml}
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
             <div style="width: 280px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #666;">
                   <span>Sous-total</span>
                   <span style="font-family: monospace; font-weight: bold;">${formatPrice(subtotalBeforeDiscounts)} ${settings.currency || 'DA'}</span>
                </div>
                ${totalSavings > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #16a34a; font-weight: bold;">
                   <span>Remises Déduites</span>
                   <span style="font-family: monospace;">-${formatPrice(totalSavings)} ${settings.currency || 'DA'}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #666;">
                   <span>Total HT</span>
                   <span style="font-family: monospace;">${formatPrice(totalHT)} ${settings.currency || 'DA'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #666;">
                   <span>TVA (${taxRate}%)</span>
                   <span style="font-family: monospace;">${formatPrice(totalTVA)} ${settings.currency || 'DA'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: 900; border-top: 2px solid #111; margin-top: 6px;">
                   <span>TOTAL TTC</span>
                   <span style="font-family: monospace;">${formatPrice(totalTTC)} ${settings.currency || 'DA'}</span>
                </div>
             </div>
          </div>

          <div style="margin-top: 60px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
             <div style="font-size: 12px; font-weight: 800; text-transform: uppercase;">${settings.footerText || 'Merci de votre visite !'}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
