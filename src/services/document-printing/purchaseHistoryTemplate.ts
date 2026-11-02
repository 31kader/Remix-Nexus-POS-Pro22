import { formatSafe, safeGetItems } from '../../lib/utils';
import { Purchase, CompanySettings } from '../../types';
import { executePrint } from './documentPrintCore';

export const printHistory = (filteredPurchases: Purchase[], settings: CompanySettings) => {
  const itemsHtml = filteredPurchases.map(p => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 2px solid #000; font-size: 12px; font-weight: 800;">${formatSafe(p.date, 'dd/MM/yyyy HH:mm')}</td>
      <td style="padding: 10px 8px; border-bottom: 2px solid #000;">
        <div style="font-weight: 900; text-transform: uppercase;">${p.supplierName}</div>
        <div style="font-size: 11px; font-weight: 700;">Facture: ${p.invoiceNumber || '-'}</div>
      </td>
      <td style="padding: 10px 8px; border-bottom: 2px solid #000; text-align: center; font-weight: 900;">${safeGetItems(p).length}</td>
      <td style="padding: 10px 8px; border-bottom: 2px solid #000; text-align: right; font-weight: 900; font-size: 13px;">${Number(p.total ?? (p as any).totalAmount ?? 0).toFixed(2)} ${settings.currency}</td>
    </tr>
  `).join('');

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total ?? (p as any).totalAmount ?? 0), 0);

  const html = `
    <html>
      <head>
        <title>Historique des Achats - ${settings.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { margin: 0; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif !important; 
            padding: 30px; 
            font-size: 13px; 
            color: #000 !important;
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 4px solid #000; padding-bottom: 20px; }
          h1 { margin: 0; color: #000; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #fff; padding: 12px 8px; border-bottom: 3px solid #000; text-transform: uppercase; font-size: 12px; font-weight: 900; color: #000; }
          .total-info { margin-top: 20px; text-align: right; font-size: 20px; font-weight: 900; color: #000; }
          .footer { margin-top: 40px; font-size: 12px; color: #000; font-weight: 800; text-align: center; border-top: 3px solid #000; padding-top: 20px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport de Réceptions d'Achats</h1>
          <p style="font-weight: 800; margin-top: 5px;">${settings.name} - Généré le ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fournisseur / Facture</th>
              <th style="text-align: center;">Articles</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 20px 8px; text-align: right; font-weight: 900; font-size: 16px;">TOTAL GÉNÉRAL</td>
              <td style="padding: 20px 8px; text-align: right; font-weight: 900; font-size: 22px; border-top: 2px dashed #000;">${totalAmount.toFixed(2)} ${settings.currency}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          Document Interne - ${settings.name}
        </div>
      </body>
    </html>
  `;
  executePrint(html);
};
