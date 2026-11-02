import { Product, CompanySettings } from '../../../types';
import { escapeHtml } from '../../../lib/utils';
import { toast } from 'sonner';

interface PrintInventorySheetParams {
  auditItems: any[];
  products: Product[];
  settings: CompanySettings;
  blindCountMode: boolean;
}

export function printInventorySheetA4({
  auditItems,
  products,
  settings,
  blindCountMode,
}: PrintInventorySheetParams): void {
  if (auditItems.length === 0) {
    toast.error("Ajoutez d'abord des articles à la fiche d'inventaire avant d'imprimer.");
    return;
  }
  const win = window.open('', '_blank', 'width=1050,height=800');
  if (!win) return;

  const rowsHtml = auditItems
    .map((item, idx) => {
      const prod = products.find(p => p.id === item.productId);
      const ref = item.sku || prod?.sku || prod?.barcode || '-';
      return `
        <tr>
          <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${idx + 1}</td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;font-family:monospace;font-size:11px;">${escapeHtml(ref)}</td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;font-weight:bold;font-size:11px;">${escapeHtml(item.productName)}</td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;font-weight:bold;">
            ${blindCountMode ? '🔒 Masqué' : item.expectedStock}
          </td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;font-weight:bold;">
            ${blindCountMode ? '_________' : item.actualStock}
          </td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;font-weight:bold;">
            ${blindCountMode ? '_________' : (item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy)}
          </td>
          <td style="padding:7px 8px;border:1px solid #94a3b8;font-size:11px;">${escapeHtml(item.notes || '')}</td>
        </tr>
      `;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Fiche d'Inventaire Physique A4 — ${escapeHtml(settings?.name || 'Nexus POS Pro')}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
          .header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e293b; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; border: 1px solid #1e293b; }
          .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0;text-transform:uppercase;">FICHE D'INVENTAIRE PHYSIQUE & COMPTAGE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#475569;">
              Établissement : <strong>${escapeHtml(settings?.name || 'Magasin')}</strong> • Mode : <strong>${blindCountMode ? 'Comptage à l’aveugle (Stock théorique masqué)' : 'Fiche de Réconciliation Complète'}</strong>
            </p>
          </div>
          <div style="text-align:right;font-size:12px;">
            <div>Date : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
            <div>Références : <strong>${auditItems.length} article(s)</strong></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">N°</th>
              <th style="width:110px;">Réf / SKU</th>
              <th>Désignation de l'Article</th>
              <th style="width:90px;">Stock Théorique</th>
              <th style="width:100px;">Stock Compté</th>
              <th style="width:80px;">Écart</th>
              <th style="width:150px;">Emplacement / Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">
          <div>Compté par (Nom & Signature) : ___________________________</div>
          <div>Validé par le Responsable : ___________________________</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `);
  win.document.close();
}
