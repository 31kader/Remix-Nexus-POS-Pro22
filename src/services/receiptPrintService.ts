import { formatSafe, calculateItemPrice } from '../lib/utils';
import { Product, CompanySettings } from '../types';

export const printReceipt = async (t: any, settings: CompanySettings) => {
  const useSilent = settings.silentPrinting;
  
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
    printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    doc = printWindow.document;
  }

  if (!doc) return;

  const itemsHtml = (t.items || []).map((item: any) => {
    const unitPrice = calculateItemPrice(item, t.isWholesale);
    const originalUnitPrice = item.overriddenPrice || item.price;
    const hasLineDiscount = item.lineDiscount || (item.overriddenPrice !== undefined && item.overriddenPrice < item.price);
    
    return `
      <div style="padding: 4px 0;">
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2px;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 9px; font-weight: 500;">
            <span style="font-weight: 700;">${item.quantity}</span> x ${unitPrice.toFixed(2)} ${settings.currency}
            ${item.lineDiscount ? `<span style="color: #000; text-decoration: underline; margin-left: 4px; font-weight: 700;">(-${item.lineDiscount.value}${item.lineDiscount.type === 'percentage' ? '%' : settings.currency})</span>` : ''}
          </div>
          <div style="text-align: right;">
            ${hasLineDiscount ? `<div style="text-decoration: line-through; font-size: 7px; color: #333;">${((originalUnitPrice || 0) * (item.quantity || 0)).toFixed(2)}</div>` : ''}
            <div style="font-weight: 800; font-size: 10px;">${((unitPrice || 0) * (item.quantity || 0)).toFixed(2)} ${settings.currency}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const receiptId = (t.id || 'N/A').slice(-8).toUpperCase();
  const subtotalBeforeDiscounts = ( (t.total || 0) + (t.discountAmount || 0) + (t.pointsDiscount || 0) + (t.voucherDiscount || 0) );
  const paperWidth = settings.paperFormat === '60mm' ? '60mm' : settings.paperFormat === 'A4' ? '210mm' : '80mm';

  doc.open();

  if (settings.paperFormat === 'A4') {
    doc.write(`
      <html>
        <head>
          <title>Facture #${receiptId}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
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
                  <div style="font-weight: 900; font-size: 18px; text-transform: uppercase; color: #111; letter-spacing: 1px;">${settings.name}</div>
                  ${settings.address ? `<div style="font-size: 11px; color: #555; margin-top: 4px;">${settings.address}</div>` : ''}
                  ${settings.phone ? `<div style="font-size: 11px; color: #555; margin-top: 2px;">Tel: ${settings.phone}</div>` : ''}
                  ${settings.taxNumber ? `<div style="font-size: 11px; color: #555; margin-top: 2px;">N° TVA: ${settings.taxNumber}</div>` : ''}
               </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 40px; margin-top: 30px;">
               <div>
                  <h3 style="margin: 0 0 8px 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 850;">FACTURÉ À</h3>
                  <div style="font-size: 14px; font-weight: 900; color: #111;">${t.customerName || 'Client de Passage'}</div>
               </div>
               <div style="text-align: right; font-size: 12px; color: #333; line-height: 1.6;">
                  <div><strong>Date d'Émission :</strong> ${formatSafe(t.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}</div>
                  <div><strong>Mode de Paiement :</strong> CONPTANT</div>
                  <div style="text-transform: uppercase;"><strong>Caissier :</strong> ${(t.employeeName || 'ADMIN')}</div>
               </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
               <thead>
                  <tr style="background-color: #111; color: white;">
                     <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; text-align: left; font-weight: 900; letter-spacing: 1px; width: 50%;">Article</th>
                     <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 1px; width: 15%;">Qté</th>
                     <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 1px; width: 15%;">Prix Unit.</th>
                     <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 1px; width: 20%;">Total</th>
                  </tr>
               </thead>
               <tbody>
                  ${(t.items || []).map((item: any) => {
                     const unitPrice = calculateItemPrice(item, t.isWholesale);
                     const itemTotal = (unitPrice || 0) * (item.quantity || 0);
                     return `
                        <tr style="border-bottom: 1px solid #efefef;">
                           <td style="padding: 14px 10px; font-size: 13px; color: #111;">
                              <span style="font-weight: 800;">${item.name}</span>
                              ${item.sku ? `<div style="font-size: 10.5px; color: #888; font-family: monospace; margin-top: 2px;">SKU: ${item.sku}</div>` : ''}
                           </td>
                           <td style="padding: 14px 10px; font-size: 13px; text-align: center; font-weight: bold;">${item.quantity}</td>
                           <td style="padding: 14px 10px; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">${unitPrice.toFixed(2)} ${settings.currency}</td>
                           <td style="padding: 14px 10px; font-size: 13px; text-align: right; font-family: monospace; font-weight: 800; color: #111;">${itemTotal.toFixed(2)} ${settings.currency}</td>
                        </tr>
                     `;
                  }).join('')}
               </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
               <div style="width: 320px; background-color: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px solid #eee;">
                     <span style="font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; tracking: 0.5px;">Sous-total</span>
                     <span style="font-family: monospace; font-weight: bold;">${subtotalBeforeDiscounts.toFixed(2)} ${settings.currency}</span>
                  </div>
                  ${t.discountAmount > 0 ? `
                     <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #e11d48; border-bottom: 1px solid #eee;">
                         <span style="font-weight: bold; text-transform: uppercase; font-size: 10px;">Remise</span>
                         <span style="font-family: monospace; font-weight: bold;">-${t.discountAmount.toFixed(2)} ${settings.currency}</span>
                     </div>
                  ` : ''}
                  ${t.pointsDiscount > 0 ? `
                     <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #0284c7; border-bottom: 1px solid #eee;">
                         <span style="font-weight: bold; text-transform: uppercase; font-size: 10px;">Remise Points</span>
                         <span style="font-family: monospace; font-weight: bold;">-${t.pointsDiscount.toFixed(2)} ${settings.currency}</span>
                     </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; padding: 10px 0 0 0; font-size: 14px; font-weight: bold; margin-top: 5px;">
                     <span style="text-transform: uppercase; font-size: 11px; tracking: 1px; color: #111;">Net à Payer</span>
                     <span style="font-family: monospace; font-size: 20px; color: #111; font-weight: 900;">${(t.total || 0).toFixed(2)} ${settings.currency}</span>
                  </div>
                  ${t.amountReceived !== undefined ? `
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-top: 1px dashed #eee; margin-top: 5px;">
                     <span style="color: #666; text-transform: uppercase; font-size: 10px;">Montant Reçu</span>
                     <span style="font-family: monospace; font-weight: bold;">${t.amountReceived.toFixed(2)} ${settings.currency}</span>
                  </div>
                  ` : ''}
                  ${t.amountReturned !== undefined && t.amountReturned > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
                     <span style="color: #666; text-transform: uppercase; font-size: 10px;">Rendu</span>
                     <span style="font-family: monospace; font-weight: bold;">${t.amountReturned.toFixed(2)} ${settings.currency}</span>
                  </div>
                  ` : ''}
                  ${t.amountReceived !== undefined && t.amountReceived < t.total && t.customerId ? `
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #e11d48; font-weight: bold;">
                     <span style="text-transform: uppercase; font-size: 10px;">Dette Client (Crédit)</span>
                     <span style="font-family: monospace;">+${(t.total - t.amountReceived).toFixed(2)} ${settings.currency}</span>
                  </div>
                  ` : ''}
                  ${t.amountReceived !== undefined && t.amountReceived > t.total && t.customerId && (!t.amountReturned || t.amountReturned === 0) ? `
                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #16a34a; font-weight: bold;">
                     <span style="text-transform: uppercase; font-size: 10px;">Ajouté au Solde</span>
                     <span style="font-family: monospace;">+${(t.amountReceived - t.total).toFixed(2)} ${settings.currency}</span>
                  </div>
                  ` : ''}
               </div>
            </div>

            <div style="margin-top: 80px; text-align: center; border-top: 1px solid #eee; padding-top: 24px;">
               <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #111; letter-spacing: 1px;">${settings.footerText || 'Merci pour votre visite ! à bientôt.'}</div>
               <div style="font-size: 10px; color: #aaa; margin-top: 6px;">Nexus Automation SAS - Édité numériquement par NEXUS POS PRO</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              try {
                window.focus();
                window.print();
                ${useSilent ? '' : 'setTimeout(() => window.close(), 500);'}
              } catch (e) {
                console.error("Print failed:", e);
              }
            };
          </script>
        </body>
      </html>
    `);
  } else {
    doc.write(`
      <html>
        <head>
          <title>Reçu #${receiptId}</title>
          <style>
            @page { margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { 
              width: ${paperWidth}; 
              margin: 0 auto; 
              padding: 8mm 4mm;
              font-family: 'Verdana', 'Geneva', sans-serif;
              color: #000;
              line-height: 1.4;
              background: white;
              font-size: 9px;
              font-weight: 900;
            }
            .header { text-align: center; margin-bottom: 5px; }
            .business-name { font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 2px; }
            .business-info { font-size: 9px; font-weight: 900; line-height: 1; }
            
            .ticket-info { 
              padding: 8px 0; 
              margin: 8px 0;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .ticket-meta { flex: 1; text-align: center; }
            .ticket-id { font-weight: 900; font-size: 12px; margin: 0; text-transform: uppercase; }
            .ticket-date { font-size: 9px; margin: 2px 0 0 0; font-weight: 900; }
            
            .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; }
            
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .summary-label { font-weight: 900; text-transform: uppercase; }
            .summary-value { font-weight: 900; }
            
            .grand-total { 
              margin-top: 8px; 
              padding-top: 8px; 
              border-top: 2px solid #000; 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
            }
            .total-label { font-weight: 900; font-size: 13px; }
            .total-value { font-weight: 900; font-size: 17px; }
  
            .customer-box { border: 1px solid #000; padding: 6px; margin-top: 10px; }
            .customer-name { font-weight: 700; font-size: 10px; }
  
            .footer { text-align: center; margin-top: 20px; padding-top: 10px; }
            .thanks { font-weight: 900; font-size: 10px; margin-bottom: 3px; }
            
            @media print {
              body { padding: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${settings.name}</div>
            <div class="business-info">
              ${settings.address ? `<div>${settings.address}</div>` : ''}
              ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
              ${settings.taxNumber ? `<div>TVA: ${settings.taxNumber}</div>` : ''}
            </div>
          </div>
  
          <div class="ticket-info">
            <div class="ticket-meta">
              <p class="ticket-id">REÇU DE VENTE: #${receiptId}</p>
              <p class="ticket-date">${formatSafe(t.timestamp || Date.now(), 'dd/MM/yyyy HH:mm')}</p>
              <p style="font-size: 9px; font-weight: 900; margin-top: 2px;">CAISSIER: ${(t.employeeName || 'ADMIN').toUpperCase()}</p>
            </div>
          </div>
  
          <div class="section-title">Articles</div>
          <div style="margin-bottom: 20px;">
            ${itemsHtml}
          </div>
  
          <div class="section-title">Total</div>
          <div>
            <div class="summary-row">
              <span class="summary-label">Sous-total</span>
              <span class="summary-value">${subtotalBeforeDiscounts.toFixed(2)} ${settings.currency}</span>
            </div>
            
            ${t.discountAmount > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Remise</span>
              <span class="summary-value">-${t.discountAmount.toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
            
            ${t.pointsDiscount > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Fidélité</span>
              <span class="summary-value">-${t.pointsDiscount.toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
  
            <div class="grand-total">
              <span class="total-label">TOTAL</span>
              <span class="total-value">${(t.total || 0).toFixed(2)} ${settings.currency}</span>
            </div>
            ${t.amountReceived !== undefined ? `
            <div class="summary-row" style="margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 4px;">
              <span class="summary-label" style="font-size: 8px;">Reçu</span>
              <span class="summary-value" style="font-size: 8px;">${t.amountReceived.toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
            ${t.amountReturned !== undefined && t.amountReturned > 0 ? `
            <div class="summary-row">
              <span class="summary-label" style="font-size: 8px;">Rendu</span>
              <span class="summary-value" style="font-size: 8px;">${t.amountReturned.toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
            ${t.amountReceived !== undefined && t.amountReceived < t.total && t.customerId ? `
            <div class="summary-row" style="color: #000; font-weight: bold;">
              <span class="summary-label" style="font-size: 8px;">Nouv. Dette</span>
              <span class="summary-value" style="font-size: 8px;">+${(t.total - t.amountReceived).toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
            ${t.amountReceived !== undefined && t.amountReceived > t.total && t.customerId && (!t.amountReturned || t.amountReturned === 0) ? `
            <div class="summary-row" style="color: #000; font-weight: bold;">
              <span class="summary-label" style="font-size: 8px;">Ajouté au Solde</span>
              <span class="summary-value" style="font-size: 8px;">+${(t.amountReceived - t.total).toFixed(2)} ${settings.currency}</span>
            </div>
            ` : ''}
          </div>
  
          ${t.customerName ? `
          <div class="customer-box">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase;">Client</div>
            <div class="customer-name">${t.customerName}</div>
            ${t.pointsEarned ? `<div style="font-size: 9px; font-weight: 700; color: #444; margin-top: 4px;">Points Gagnés: ${t.pointsEarned}</div>` : ''}
          </div>
          ` : ''}
  
          <div class="footer">
            <div class="thanks">MERCI DE VOTRE VISITE</div>
            <div style="font-size: 12px; font-weight: 700;">${settings.footerText || 'À bientôt !'}</div>
          </div>
  
          <script>
            window.onload = () => {
              try {
                window.focus();
                window.print();
                ${useSilent ? '' : 'setTimeout(() => window.close(), 500);'}
              } catch (e) {
                console.error("Print failed:", e);
              }
            };
          </script>
        </body>
      </html>
    `);
  }
  doc.close();

  // If silent, also try to trigger print from outside the iframe for better compatibility
  if (useSilent && iframe?.contentWindow) {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {}
  }
};
