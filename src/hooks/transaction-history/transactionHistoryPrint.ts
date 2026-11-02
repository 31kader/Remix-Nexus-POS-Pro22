import { Transaction, CompanySettings } from '../../types';
import { formatSafe, escapeHtml } from '../../lib/utils';
import { format } from 'date-fns';

export function printInvoicePDF(t: Transaction, settings: CompanySettings): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const itemsHtml = (t.items || []).map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name || 'Article')}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.price || 0).toFixed(2)} ${escapeHtml(settings.currency)}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)} ${escapeHtml(settings.currency)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Facture #${escapeHtml(String(t.id || '').slice(-8).toUpperCase())}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
          .company-info h1 { margin: 0; color: #1e293b; font-size: 24px; }
          .invoice-details { text-align: right; }
          .invoice-details h2 { margin: 0; color: #64748b; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
          .section { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .section-title { font-weight: bold; color: #1e293b; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { text-align: left; background: #f8fafc; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.grand-total { border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 12px; font-weight: bold; font-size: 18px; color: #1e293b; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${escapeHtml(settings.name)}</h1>
            <p>${escapeHtml(settings.address || '')}<br>${escapeHtml(settings.phone || '')}<br>${escapeHtml(settings.email || '')}</p>
          </div>
          <div class="invoice-details">
            <h2>Facture ${t.status === 'returned' ? '(RETOURNÉ)' : t.status === 'partially_returned' ? '(RETOUR PARTIEL)' : ''}</h2>
            <p>#${escapeHtml(String(t.id || '').slice(-8).toUpperCase())}<br>Date: ${formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>

        <div class="section">
          <div>
            <div class="section-title">Facturé à</div>
            <p><strong>${escapeHtml(t.customerName || 'Client de passage')}</strong></p>
          </div>
          <div style="text-align: right;">
            <div class="section-title">Mode de Paiement</div>
            <p>${escapeHtml(String(t.paymentMethod || 'Espèces').toUpperCase())}</p>
            <div class="section-title" style="margin-top: 10px;">Type de Commande</div>
            <p>${escapeHtml(String(t.deliveryMethod || 'in_store').toUpperCase().replace('_', ' '))}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix Unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Sous-total HT</span>
            <span>${( Number(t.total || 0) / (1 + Number(settings.taxRate || 0)/100) ).toFixed(2)} ${settings.currency}</span>
          </div>
          <div class="total-row">
            <span>TVA (${settings.taxRate || 0}%)</span>
            <span>${( Number(t.total || 0) - ( Number(t.total || 0) / (1 + Number(settings.taxRate || 0)/100) ) ).toFixed(2)} ${settings.currency}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL TTC</span>
            <span>${Number(t.total || 0).toFixed(2)} ${settings.currency}</span>
          </div>
        </div>

        <div class="footer">
          <p>${settings.footerText || 'Merci de votre confiance !'}</p>
          ${settings.taxNumber ? `<p>TVA: ${settings.taxNumber}</p>` : ''}
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function printTransactionsReportList(
  filteredTransactions: Transaction[],
  dateFilter: string,
  totalPeriod: number,
  settings: CompanySettings
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rowsHtml = filteredTransactions.map((t: Transaction) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">#${String(t.id || '').slice(-8).toUpperCase()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; ${
          t.status === 'returned' ? 'background: #fee2e2; color: #b91c1c;' :
          t.status === 'partially_returned' ? 'background: #fef3c7; color: #b45309;' :
          'background: #ecfdf5; color: #047857;'
        }">
          ${t.status === 'returned' ? 'Retourné' : t.status === 'partially_returned' ? 'Retour Partiel' : 'Payé'}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(t.deliveryMethod || 'in_store')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(t.paymentMethod)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(t.total || 0).toFixed(2)} ${escapeHtml(settings.currency)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Rapport de Transactions</title>
        <style>
          body { font-family: sans-serif; padding: 40px; }
          h1 { color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #f8fafc; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; }
          .summary { margin-top: 30px; text-align: right; font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Rapport de Transactions - ${escapeHtml(dateFilter === 'all' ? 'Toutes' : dateFilter)}</h1>
        <p>Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>ID</th>
              <th>Statut</th>
              <th>Type</th>
              <th>Méthode</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="summary">
          Total Période: ${totalPeriod.toFixed(2)} ${escapeHtml(settings.currency)}
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
