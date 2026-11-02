import { formatSafe, safeGetItems } from '../../lib/utils';
import { ProductReturn, CompanySettings } from '../../types';
import { executePrint } from './documentPrintCore';

export const printReturn = (r: ProductReturn, settings: CompanySettings) => {
  const itemsHtml = safeGetItems(r).map((item: any) => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; font-family: 'Inter', sans-serif;">
        <div style="font-weight: 900; color: #000;">${item.name}</div>
      </td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: center; font-weight: 900; color: #000;">${item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; color: #000; font-weight: 700;">${(Number(item.price) || 0).toFixed(2)} ${settings.currency}</td>
      <td style="padding: 12px 8px; border-bottom: 2px solid #000; text-align: right; font-weight: 900; color: #000;">${((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)} ${settings.currency}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Reçu de Retour - #${String(r.id || "").slice(-6).toUpperCase()}</title>
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
          <h1 class="title">REÇU DE RETOUR</h1>
          <p style="margin: 5px 0 0 0; font-weight: 700;">Date: ${formatSafe(r.date, 'dd/MM/yyyy HH:mm')}</p>
          <p style="margin: 5px 0 0 0; font-weight: 700;">Type: ${r.type === 'refund' ? 'Remboursement Espèces' : 'Avoir'}</p>
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
          TOTAL RETOURNÉ: ${Number(r.totalRefund || 0).toFixed(2)} ${settings.currency}
        </div>
      </body>
    </html>
  `;
  executePrint(html);
};
