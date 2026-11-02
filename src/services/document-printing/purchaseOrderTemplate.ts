import { formatSafe, safeGetItems } from '../../lib/utils';
import { CompanySettings } from '../../types';
import { executePrint } from './documentPrintCore';

export const printPurchaseOrder = (purchase: any, settings: CompanySettings) => {
  const itemsHtml = safeGetItems(purchase).map((item: any) => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000;">
        <div style="font-weight: 900; color: #000;">${item.name || item.productName}</div>
        <div style="font-size: 11px; color: #000; font-weight: 700;">Réf: ${item.productId ? item.productId.slice(-6).toUpperCase() : 'NO-SKU'}</div>
      </td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: center; font-weight: 900;">${item.type || item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; font-weight: 700;">${(item.costPrice || item.price || 0).toFixed(2)} ${settings.currency}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; font-weight: 900;">${((item.quantity || 0) * (item.costPrice || item.price || 0)).toFixed(2)} ${settings.currency}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Bon de Commande - ${purchase.supplierName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { margin: 0; }
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 4px solid #000; padding-bottom: 20px; }
          .company-info h1 { margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; }
          .document-details { text-align: right; }
          .document-label { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
          .document-value { font-size: 24px; font-weight: 900; margin-top: 5px; }
          .section { margin-bottom: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .section-title { font-weight: 900; text-transform: uppercase; font-size: 12px; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { text-align: left; padding: 12px 8px; border-bottom: 3px solid #000; font-size: 12px; font-weight: 900; text-transform: uppercase; }
          .totals { margin-left: auto; width: 350px; padding: 20px; border: 4px solid #000; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; }
          .grand-total { border-top: 3px solid #000; margin-top: 10px; padding-top: 15px; font-size: 24px; font-weight: 900; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; font-weight: 700; border-top: 2px solid #000; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${settings.name}</h1>
            <p>${settings.address || ''}<br>${settings.phone || ''}</p>
          </div>
          <div class="document-details">
            <div class="document-label">Bon de Commande (PO)</div>
            <div class="document-value">${purchase.invoiceNumber || 'PO-' + String(purchase.id || "").slice(-6).toUpperCase()}</div>
            <p style="font-weight: 800;">Date: ${formatSafe(purchase.date, 'dd/MM/yyyy')}</p>
          </div>
        </div>
        <div class="section">
          <div>
            <div class="section-title">Fournisseur</div>
            <p style="font-size: 20px; font-weight: 900;">${purchase.supplierName}</p>
          </div>
          <div style="text-align: right;">
            <div class="section-title">Expédier à</div>
            <p style="font-weight: 800;">${settings.name}</p>
            <p>${settings.address || ''}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantité</th>
              <th style="text-align: right;">Prix Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row grand-total">
            <span>TOTAL ESTIMÉ</span>
            <span>${(purchase.total || 0).toFixed(2)} ${settings.currency}</span>
          </div>
        </div>
        <div class="footer">
          <p>BON DE COMMANDE OFFICIEL - ${settings.name}</p>
        </div>
      </body>
    </html>
  `;
  executePrint(html);
};

export const printPurchaseVoucher = (purchase: any, settings: CompanySettings) => {
  const itemsHtml = safeGetItems(purchase).map((item: any) => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; font-family: 'Inter', sans-serif;">
        <div style="font-weight: 900; color: #000;">${item.name}</div>
      </td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: center; font-weight: 900; color: #000;">${item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; color: #000; font-weight: 700;">${(Number(item.costPrice) || 0).toFixed(2)} ${settings?.currency || 'DA'}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; font-weight: 900; color: #000;">${((Number(item.quantity) || 0) * (Number(item.costPrice) || 0)).toFixed(2)} ${settings?.currency || 'DA'}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Bon de Réception - #${String(purchase.id || "").slice(-6).toUpperCase()}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          @page { margin: 0; }
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 4px solid #000; padding-bottom: 20px; }
          .title { font-size: 32px; font-weight: 900; text-transform: uppercase; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px 8px; border-bottom: 3px solid #000; font-size: 12px; font-weight: 900; text-transform: uppercase; }
          .grand-total { font-size: 24px; font-weight: 900; margin-top: 20px; text-align: right; padding-top: 15px; border-top: 2px solid #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">BON DE RÉCEPTION</h1>
        </div>
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="grand-total">
          TOTAL: ${Number(purchase.total ?? (purchase as any).totalAmount ?? 0).toFixed(2)} ${settings.currency}
        </div>
      </body>
    </html>
  `;
  executePrint(html);
};
