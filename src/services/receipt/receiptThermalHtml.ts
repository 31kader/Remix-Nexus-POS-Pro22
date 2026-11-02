import { formatSafe, formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';
import { escapeHtml } from './receiptA4Html';

export interface ReceiptThermalOptions {
  receiptId: string;
  t: any;
  settings: CompanySettings;
  itemsHtml: string;
  subtotalBeforeDiscounts: number;
  totalSavings: number;
  paperWidth: string;
  pageSizeRule: string;
  socialQrDataUrl?: string;
}

export function buildReceiptThermalHtml(opts: ReceiptThermalOptions): string {
  const {
    receiptId,
    t,
    settings,
    itemsHtml,
    subtotalBeforeDiscounts,
    totalSavings,
    paperWidth,
    pageSizeRule,
    socialQrDataUrl,
  } = opts;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket #${receiptId}</title>
        <style>
          @page { size: ${pageSizeRule}; margin: 0mm; }
          html, body {
            width: ${paperWidth};
            max-width: ${paperWidth};
            height: auto;
            margin: 0 !important;
            padding: 1.5mm 1.5mm !important;
            overflow-x: hidden;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            color: #000;
            line-height: 1.25;
            background: white;
            font-size: 10px;
            font-weight: 800;
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { text-align: center; margin-bottom: 6px; width: 100%; }
          .business-name { font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
          .business-info { font-size: 9px; font-weight: 700; line-height: 1.2; color: #111; }
          
          .ticket-info { 
            padding: 4px 0; 
            margin: 4px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            text-align: center;
            width: 100%;
          }
          .ticket-id { font-weight: 900; font-size: 11px; margin: 0; text-transform: uppercase; }
          .ticket-date { font-size: 9px; margin: 2px 0 0 0; font-weight: 700; }
          
          .summary-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; width: 100%; font-size: 10px; }
          .grand-total { 
            margin-top: 5px; 
            padding-top: 5px; 
            border-top: 2px solid #000; 
            border-bottom: 2px solid #000; 
            padding-bottom: 5px;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            width: 100%;
          }
          .total-label { font-weight: 900; font-size: 12px; text-transform: uppercase; }
          .total-value { font-weight: 900; font-size: 15px; white-space: nowrap; }

          .customer-box { border: 1px solid #000; padding: 6px; margin-top: 8px; }
          .footer { text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #000; }
          .thanks { font-weight: 900; font-size: 11px; margin-bottom: 3px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.showLogoOnReceipt !== false && settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 48px; max-width: 140px; margin: 0 auto 6px auto; display: block;" alt="Logo" onerror="this.style.display='none'" />` : ''}
          <div class="business-name">${escapeHtml(settings.name || 'NEXUS STORE')}</div>
          <div class="business-info">
            ${settings.address ? `<div>${escapeHtml(settings.address)}</div>` : ''}
            ${settings.phone ? `<div>Tel: ${escapeHtml(settings.phone)}</div>` : ''}
            ${settings.taxNumber ? `<div>NIF/AI: ${escapeHtml(settings.taxNumber)}</div>` : ''}
          </div>
        </div>

        <div class="ticket-info">
          <p class="ticket-id">REÇU DE VENTE: #${receiptId}</p>
          <p class="ticket-date">${formatSafe(t.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}</p>
          <p style="font-size: 9px; font-weight: 900; margin-top: 2px;">CAISSIER: ${escapeHtml((t.employeeName || 'ADMIN').toUpperCase())}</p>
        </div>

        <div style="margin-bottom: 10px;">
          ${itemsHtml}
        </div>

        <div>
          <div class="summary-row">
            <span>Sous-total:</span>
            <span>${formatPrice(subtotalBeforeDiscounts)} ${settings.currency || 'DA'}</span>
          </div>
          
          ${t.discountAmount > 0 ? `
          <div class="summary-row" style="color: #000; font-weight: 900;">
            <span>Remise:</span>
            <span>-${formatPrice(t.discountAmount)} ${settings.currency || 'DA'}</span>
          </div>
          ` : ''}
          
          ${t.pointsDiscount > 0 ? `
          <div class="summary-row" style="color: #000; font-weight: 900;">
            <span>Fidélité:</span>
            <span>-${formatPrice(t.pointsDiscount)} ${settings.currency || 'DA'}</span>
          </div>
          ` : ''}

          <div class="grand-total">
            <span class="total-label">TOTAL NET</span>
            <span class="total-value">${formatPrice(t.total)} ${settings.currency || 'DA'}</span>
          </div>

          ${t.amountReceived !== undefined ? `
          <div class="summary-row" style="margin-top: 4px; padding-top: 2px;">
            <span>Reçu (${escapeHtml((t.paymentMethod || 'Espèces').toUpperCase())}):</span>
            <span>${formatPrice(t.amountReceived)} ${settings.currency || 'DA'}</span>
          </div>
          ` : ''}

          ${t.amountReturned !== undefined && t.amountReturned > 0 ? `
          <div class="summary-row" style="font-weight: 900;">
            <span>Rendu Monnaie:</span>
            <span>${formatPrice(t.amountReturned)} ${settings.currency || 'DA'}</span>
          </div>
          ` : ''}

          ${t.amountReceived !== undefined && t.amountReceived < t.total && t.customerId ? `
          <div class="summary-row" style="font-weight: 900; color: #000;">
            <span>Nouv. Dette Client:</span>
            <span>+${formatPrice((Number(t.total) || 0) - (Number(t.amountReceived) || 0))} ${settings.currency || 'DA'}</span>
          </div>
          ` : ''}
        </div>

        ${t.customerName ? `
        <div class="customer-box">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase;">CLIENT</div>
          <div style="font-weight: 900; font-size: 11px;">${escapeHtml(t.customerName)}</div>
          ${t.pointsEarned ? `<div style="font-size: 9px; font-weight: 700; margin-top: 2px;">Points Gagnés: +${t.pointsEarned}</div>` : ''}
        </div>
        ` : ''}

        ${settings.showSavingsOnReceipt !== false && totalSavings > 0 ? `
        <div style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: 900; font-size: 10px; margin: 8px 0; text-transform: uppercase;">
          🎉 ÉCONOMISÉ: ${formatPrice(totalSavings)} ${settings.currency || 'DA'}
        </div>
        ` : ''}

        <div class="footer">
          <div class="thanks">MERCI DE VOTRE VISITE !</div>
          <div style="font-size: 10px; font-weight: 800;">${escapeHtml(settings.footerText || 'À bientôt !')}</div>
          ${settings.customReceiptMessage ? `<div style="font-size: 8px; color: #222; margin-top: 6px; font-style: italic; border-top: 1px dashed #999; padding-top: 4px;">${escapeHtml(settings.customReceiptMessage)}</div>` : ''}
          ${socialQrDataUrl ? `
          <div style="margin-top: 6px;">
            <img src="${socialQrDataUrl}" style="width: 60px; height: 60px; margin: 0 auto; display: block;" alt="QR" />
            <div style="font-size: 7px; color: #333; margin-top: 2px; text-transform: uppercase;">Suivez-nous</div>
          </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}
