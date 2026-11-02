import { useState } from 'react';
import { Product, CompanySettings } from '../../../types';
import {
  printCatalog,
  shareCatalog,
  exportCatalogAsHtml,
  CatalogPrintSettings,
  SocialTarget
} from '../../../services/printService';
import { escapeHtml } from '../../../lib/utils';
import { toast } from 'sonner';
import { Orientation, LayoutMode } from '../types';

export interface UseCatalogPrinterExportProps {
  queueProducts: Product[];
  settings: CompanySettings;
  buildPrintSettings: () => CatalogPrintSettings;
  layoutMode: LayoutMode;
  title: string;
  subtitle: string;
  themeColor: string;
  orientation: Orientation;
  blindInventoryMode: boolean;
}

export function useCatalogPrinterExport({
  queueProducts,
  settings,
  buildPrintSettings,
  layoutMode,
  title,
  subtitle,
  themeColor,
  orientation,
  blindInventoryMode
}: UseCatalogPrinterExportProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = async () => {
    if (queueProducts.length === 0) {
      toast.error("Recherchez et ajoutez au moins un produit avant d'imprimer.");
      return;
    }
    if (layoutMode === 'inventory_sheet') {
      const win = window.open('', '_blank', 'width=1050,height=800');
      if (!win) return;
      const rowsHtml = queueProducts
        .map(
          (p, idx) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${idx + 1}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-family:monospace;font-size:11px;">${escapeHtml(p.sku || p.barcode || '-')}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-weight:bold;font-size:11px;">${escapeHtml(p.name)}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${escapeHtml(p.categoryId || '-')}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-weight:bold;font-size:11px;">
              ${blindInventoryMode ? '🔒 Masqué' : (p.stock ?? 0)}
            </td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;">_________</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;">_________</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-size:11px;"></td>
          </tr>`
        )
        .join('');
      win.document.write(`
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style>
              @page { size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 12mm; }
              body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th { background: ${escapeHtml(themeColor)}; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; border: 1px solid ${escapeHtml(themeColor)}; }
            </style>
          </head>
          <body>
            <div style="border-bottom:3px solid ${escapeHtml(themeColor)};padding-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <h2 style="margin:0;color:${escapeHtml(themeColor)};">${escapeHtml(title)}</h2>
                <p style="margin:3px 0 0;font-size:12px;color:#475569;">${escapeHtml(subtitle)}</p>
              </div>
              <div style="text-align:right;font-size:11px;">
                <div>Date : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
                <div>Total Références : <strong>${queueProducts.length}</strong></div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:32px;">N°</th>
                  <th style="width:105px;">Réf / Code</th>
                  <th>Désignation de l'Article</th>
                  <th style="width:95px;">Rayon</th>
                  <th style="width:85px;">Stock Théorique</th>
                  <th style="width:95px;">Stock Compté</th>
                  <th style="width:75px;">Écart</th>
                  <th style="width:130px;">Observations</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div style="margin-top:28px;display:flex;justify-content:space-between;font-size:12px;">
              <div>Auditeur / Magasinier : _________________________</div>
              <div>Visa Responsable : _________________________</div>
            </div>
            <script>window.onload = () => { window.print(); }</script>
          </body>
        </html>
      `);
      win.document.close();
      return;
    }
    toast.info('Préparation du Catalogue A4...');
    await printCatalog(queueProducts, settings, buildPrintSettings());
  };

  const handleShare = async (target: SocialTarget) => {
    if (queueProducts.length === 0) {
      toast.error('Ajoutez au moins un produit au catalogue.');
      return;
    }
    setIsSharing(true);
    try {
      const result = await shareCatalog(queueProducts, settings, buildPrintSettings(), target);
      if (result.success) toast.success(result.message);
      else toast.warning(result.message);
    } catch {
      toast.error('Erreur lors du partage.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportHtml = async () => {
    if (queueProducts.length === 0) {
      toast.error('Ajoutez au moins un produit au catalogue.');
      return;
    }
    await exportCatalogAsHtml(queueProducts, settings, buildPrintSettings());
    toast.success('Catalogue A4 téléchargé en HTML/PDF !');
  };

  return {
    isSharing,
    handlePrint,
    handleShare,
    handleExportHtml
  };
}
