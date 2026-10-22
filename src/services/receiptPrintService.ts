import { formatSafe, calculateItemPrice, formatPrice } from '../lib/utils';
import { Product, CompanySettings } from '../types';
import QRCode from 'qrcode';

export async function generateReceiptQrCode(url: string): Promise<string> {
  if (!url) return '';
  return await QRCode.toDataURL(url, {
    margin: 1,
    width: 120,
    errorCorrectionLevel: 'M'
  });
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const printReceipt = async (t: any, settings: CompanySettings) => {
  const useSilent = settings?.silentPrinting ?? false;
  
  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  if (useSilent) {
    iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }
    doc = iframe.contentWindow?.document || iframe.contentDocument;
  } else {
    printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) return;
    doc = printWindow.document;
  }

  if (!doc) return;

  const receiptId = (t.id || 'N/A').slice(-8).toUpperCase();
  const subtotalBeforeDiscounts = ( (t.total || 0) + (t.discountAmount || 0) + (t.pointsDiscount || 0) + (t.voucherDiscount || 0) );
  const totalSavings = ((t.discountAmount || 0) + (t.pointsDiscount || 0) + (t.voucherDiscount || 0));
  // 🛡️ BUG-10 : Ventilation fiscale légale TVA 19%
  const taxRate = Number(settings.taxRate) || 19;
  const totalTTC = Number(t.total) || 0;
  const totalHT = totalTTC / (1 + taxRate / 100);
  const totalTVA = totalTTC - totalHT;
  // Largeur utile réelle des imprimantes thermiques : 72mm (pour rouleau 80mm) et 48mm (pour rouleau 58/60mm)
  // Utiliser 80mm provoque un débordement qui force le pilote Windows/Electron en mode Paysage A4 (20cm horizontal)
  const paperWidth = settings.paperFormat === '60mm' ? '48mm' : settings.paperFormat === 'A4' ? '210mm' : '72mm';
  const pageSizeRule = settings.paperFormat === '60mm' ? '58mm auto' : '80mm auto';

  let socialQrDataUrl = '';
  if (settings.receiptSocialQrUrl) {
    try {
      socialQrDataUrl = await generateReceiptQrCode(settings.receiptSocialQrUrl);
    } catch (e) {
      console.error('Offline receipt QR generation error:', e);
    }
  }

  const itemsHtml = (t.items || []).map((item: any) => {
    const unitPrice = calculateItemPrice(item, t.isWholesale);
    const originalUnitPrice = item.overriddenPrice || item.price;
    const hasLineDiscount = item.lineDiscount || (item.overriddenPrice !== undefined && item.overriddenPrice < item.price);
    
    return `
      <div style="padding: 3px 0; border-bottom: 1px dashed #aaa; width: 100%; overflow: hidden;">
        <div style="font-weight: 800; font-size: 11px; margin-bottom: 1px; color: #000; word-break: break-word;">${escapeHtml(item.name)}</div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="font-size: 10px; font-weight: 700; color: #000; text-align: left; width: 60%; vertical-align: bottom;">
              <span style="font-weight: 900;">${item.quantity}</span> x ${formatPrice(unitPrice)} ${settings.currency || 'DA'}
              ${item.lineDiscount ? `<span style="color: #000; font-weight: 900; margin-left: 2px;">(-${item.lineDiscount.value}${item.lineDiscount.type === 'percentage' ? '%' : (settings.currency || 'DA')})</span>` : ''}
            </td>
            <td style="text-align: right; width: 40%; vertical-align: bottom; white-space: nowrap;">
              ${hasLineDiscount ? `<div style="text-decoration: line-through; font-size: 8px; color: #555;">${formatPrice((Number(originalUnitPrice) || 0) * (Number(item.quantity) || 0))}</div>` : ''}
              <div style="font-weight: 900; font-size: 11px; color: #000;">${formatPrice((Number(unitPrice) || 0) * (Number(item.quantity) || 0))} ${settings.currency || 'DA'}</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join('');

  doc.open();

  if (settings.paperFormat === 'A4') {
    doc.write(`
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
    `);
  } else {
    // Standard Thermal Receipt (80mm -> 72mm printable & 58mm -> 48mm printable)
    doc.write(`
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
    `);
  }

  doc.close();

  // Bulletproof print trigger across Electron, Chrome, and IFrames
  setTimeout(() => {
    try {
      if (useSilent && iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else if (printWindow) {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          try { printWindow?.close(); } catch (_) {}
        }, 800);
      }
    } catch (e) {
      console.error('Direct print failed:', e);
    }
  }, 250);
};

export interface DebtPaymentReceiptData {
  customerName: string;
  customerPhone?: string;
  date: string;
  previousBalance: number;
  paymentAmount: number;
  newBalance: number;
  paymentMethod?: string;
  note?: string;
  operatorName?: string;
}

export const printDebtPaymentReceipt = async (data: DebtPaymentReceiptData, settings: CompanySettings) => {
  const useSilent = settings?.silentPrinting ?? false;
  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  if (useSilent) {
    iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }
    doc = iframe.contentWindow?.document || iframe.contentDocument;
  } else {
    printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) return;
    doc = printWindow.document;
  }

  if (!doc) return;

  const paperWidth = settings.paperFormat === '60mm' ? '48mm' : '72mm';
  const pageSizeRule = settings.paperFormat === '60mm' ? '58mm auto' : '80mm auto';
  const currency = settings.currency || 'DA';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reçu de Règlement - ${escapeHtml(data.customerName)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: ${pageSizeRule}; margin: 0mm; }
          html, body {
            font-family: 'Courier New', monospace;
            font-weight: 800;
            width: ${paperWidth};
            max-width: ${paperWidth};
            height: auto;
            margin: 0 !important;
            padding: 1.5mm !important;
            overflow-x: hidden;
            color: #000;
            background: #fff;
            box-sizing: border-box;
            text-transform: uppercase;
            font-size: 10px;
          }
          .center { text-align: center; }
          .header { margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 6px; }
          .title { font-size: 13px; font-weight: 900; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .highlight { font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 6px 0; }
          .footer { margin-top: 10px; border-top: 2px dashed #000; padding-top: 6px; text-align: center; font-size: 9px; }
          .signature-box { margin-top: 14px; border: 1px dashed #000; height: 38px; display: flex; align-items: flex-end; justify-content: center; font-size: 8px; padding-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="header center">
          <div style="font-size: 14px; font-weight: 900;">${escapeHtml(settings.name || 'NEXUS POS')}</div>
          ${settings.address ? `<div style="font-size: 9px;">${escapeHtml(settings.address)}</div>` : ''}
          ${settings.phone ? `<div style="font-size: 9px;">TÉL: ${escapeHtml(settings.phone)}</div>` : ''}
          <div class="title">REÇU DE RÈGLEMENT</div>
          <div style="font-size: 9px;">${escapeHtml(data.date)}</div>
        </div>

        <div style="margin-bottom: 6px;">
          <div class="row"><span>CLIENT :</span><span style="font-weight: 900;">${escapeHtml(data.customerName)}</span></div>
          ${data.customerPhone ? `<div class="row"><span>TÉLÉPHONE :</span><span>${escapeHtml(data.customerPhone)}</span></div>` : ''}
          ${data.operatorName ? `<div class="row"><span>CAISSE / OPÉRATEUR :</span><span>${escapeHtml(data.operatorName)}</span></div>` : ''}
        </div>

        <div style="border-top: 1px dashed #000; padding-top: 6px;">
          <div class="row"><span>ANCIEN SOLDE DÛ :</span><span>${Math.abs(data.previousBalance).toFixed(2)} ${currency}</span></div>
          <div class="row highlight"><span>MONTANT REÇU :</span><span>${data.paymentAmount.toFixed(2)} ${currency}</span></div>
          <div class="row"><span>MODE DE RÈGLEMENT :</span><span>${escapeHtml(data.paymentMethod || 'ESPÈCES')}</span></div>
          <div class="row" style="font-size: 12px; font-weight: 900; margin-top: 4px;">
            <span>NOUVEAU SOLDE RESTANT :</span>
            <span>${Math.abs(data.newBalance).toFixed(2)} ${currency}</span>
          </div>
        </div>

        ${data.note ? `<div style="margin-top: 6px; font-size: 9px; font-style: italic;">NOTE: ${escapeHtml(data.note)}</div>` : ''}

        <div class="signature-box">
          SIGNATURE / CACHET COMMERÇANT
        </div>

        <div class="footer">
          <div>CONSERVEZ CE REÇU COMME JUSTIFICATIF</div>
          <div>MERCI DE VOTRE CONFIANCE</div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      if (useSilent && iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else if (printWindow) {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          try { printWindow?.close(); } catch (_) {}
        }, 800);
      }
    } catch (e) {
      console.error('Direct print failed:', e);
    }
  }, 250);
};
