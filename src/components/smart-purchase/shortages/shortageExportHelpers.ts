import { ShortageItem } from '../../../types/shortages';
import { exportToExcelSafely } from '../../../lib/excelSecurity';

export interface ShortageExportOptions {
  items: ShortageItem[];
  supplierName?: string;
  listName?: string;
  companyName?: string;
  companyPhone?: string;
  currency?: string;
}

/**
 * Formate un montant en DA (Dinars Algériens) avec deux décimales
 */
export const formatDZD = (val: number): string => {
  return Number(val || 0).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Génère le modèle HTML A4 épuré pour le Bon de Réassort Fournisseur
 */
export const generateShortageA4PrintHtml = ({
  items,
  supplierName = 'Tous fournisseurs',
  listName = 'Toutes les listes',
  companyName = 'Nexus POS Pro',
  companyPhone = '',
  currency = 'DA'
}: ShortageExportOptions): string => {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantityNeeded || 0), 0);
  const totalValuation = items.reduce((acc, it) => acc + ((it.quantityNeeded || 0) * (it.costPrice || 0)), 0);

  const rowsHtml = items.map((item, index) => {
    const lineTotal = (item.quantityNeeded || 0) * (item.costPrice || 0);
    return `
      <tr>
        <td style="text-align: center; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding: 7px 6px;">
          ${index + 1}
        </td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 7px 6px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.name}</div>
          <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">
            ${item.barcode ? `CB: ${item.barcode}` : ''} ${item.sku ? `| Réf: ${item.sku}` : ''} ${item.unit ? `(${item.unit})` : ''}
          </div>
        </td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 7px 6px; font-size: 11px; color: #334155;">
          ${item.supplierName || 'Non spécifié'}
        </td>
        <td style="text-align: center; border-bottom: 1px solid #cbd5e1; padding: 7px 6px; font-size: 11px; color: #475569;">
          ${item.currentStock} <span style="font-size: 9px; color: #94a3b8;">/ ${item.minStock}</span>
        </td>
        <td style="text-align: center; font-weight: 900; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding: 7px 6px; color: #1e1b4b; background-color: #f8fafc;">
          ${item.quantityNeeded}
        </td>
        <td style="text-align: right; border-bottom: 1px solid #cbd5e1; padding: 7px 6px; font-family: monospace; font-size: 12px; color: #334155;">
          ${formatDZD(item.costPrice || 0)}
        </td>
        <td style="text-align: right; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding: 7px 6px; font-family: monospace; font-size: 12px; color: #0f172a;">
          ${formatDZD(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Bon de Réassort - ${supplierName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 12px;
            background-color: #ffffff;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 14px;
          }
          .title-area h1 {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
            color: #0f172a;
          }
          .title-area p {
            margin: 0;
            font-size: 11px;
            color: #475569;
          }
          .meta-area {
            text-align: right;
            font-size: 11px;
            color: #334155;
          }
          .meta-pill {
            display: inline-block;
            background: #e2e8f0;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .info-banner {
            display: flex;
            gap: 12px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 16px;
            font-size: 11px;
          }
          .info-banner div {
            flex: 1;
          }
          .info-banner strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 6px;
            font-weight: 800;
          }
          .summary-card {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 24px;
          }
          .summary-table {
            width: 280px;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
          }
          .summary-table tr.total-row td {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 2px solid #0f172a;
            border-top: 1px solid #0f172a;
            background: #f8fafc;
          }
          .signatures-area {
            display: flex;
            gap: 20px;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .signature-box {
            flex: 1;
            border: 1px dashed #64748b;
            border-radius: 6px;
            height: 90px;
            padding: 8px;
            font-size: 10px;
            color: #475569;
            text-transform: uppercase;
            font-weight: 700;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .footer-note {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            margin-top: 24px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title-area">
            <h1>Bon de Réassort & Commande</h1>
            <p><strong>${companyName}</strong> ${companyPhone ? `• Tél: ${companyPhone}` : ''}</p>
          </div>
          <div class="meta-area">
            <div>Émis le : <strong>${dateStr}</strong></div>
            <div class="meta-pill">Réf: CDM-${new Date().getTime().toString().slice(-6)}</div>
          </div>
        </div>

        <div class="info-banner">
          <div>Fournisseur ciblé : <strong>${supplierName}</strong></div>
          <div>Liste / Tournée : <strong>${listName}</strong></div>
          <div>Nb Références : <strong>${items.length}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">N°</th>
              <th>Désignation & Références</th>
              <th style="width: 120px;">Fournisseur</th>
              <th style="width: 70px; text-align: center;">Stock</th>
              <th style="width: 60px; text-align: center;">Qté</th>
              <th style="width: 90px; text-align: right;">P.U Achat (${currency})</th>
              <th style="width: 100px; text-align: right;">Total (${currency})</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-card">
          <table class="summary-table">
            <tr>
              <td>Total articles commandés :</td>
              <td style="text-align: right; font-weight: bold;">${items.length} réf.</td>
            </tr>
            <tr>
              <td>Volume total unités :</td>
              <td style="text-align: right; font-weight: bold;">${totalQuantity} unités</td>
            </tr>
            <tr class="total-row">
              <td>Total Estimé :</td>
              <td style="text-align: right; font-family: monospace;">${formatDZD(totalValuation)} ${currency}</td>
            </tr>
          </table>
        </div>

        <div class="signatures-area">
          <div class="signature-box">
            <span>Visa & Cachet Magasin :</span>
            <span style="font-size: 9px; color: #94a3b8;">Signature du responsable</span>
          </div>
          <div class="signature-box">
            <span>Signature & Réception Fournisseur :</span>
            <span style="font-size: 9px; color: #94a3b8;">Bon pour accord & livraison</span>
          </div>
        </div>

        <div class="footer-note">
          Document généré automatiquement via Nexus POS Pro (Cahier des Manques) • Tous droits réservés.
        </div>
      </body>
    </html>
  `;
};

/**
 * Déclenche l'impression d'un document HTML dans une iframe isolée
 */
export const printShortageHtmlDocument = (html: string): void => {
  let iframe = document.getElementById('nexus-shortage-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'nexus-shortage-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Erreur lors de l\'impression du cahier des manques:', err);
    }
  }, 250);
};

/**
 * Exporte les articles au format Excel (.xlsx) sécurisé via exportToExcelSafely
 */
export const exportShortagesToExcel = async (
  items: ShortageItem[],
  fileName?: string,
  listName?: string
): Promise<void> => {
  if (!items || items.length === 0) {
    throw new Error('Aucun article à exporter.');
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const baseName = fileName || `Cahier_des_Manques_${listName ? listName.replace(/\s+/g, '_') : 'Global'}_${dateTag}`;

  const rows = items.map((it, idx) => ({
    'N°': idx + 1,
    'Désignation': it.name,
    'Code-Barres': it.barcode || '',
    'Référence SKU': it.sku || '',
    'Fournisseur': it.supplierName || 'Sans fournisseur',
    'Stock Rayon': it.currentStock,
    'Seuil Alerte': it.minStock,
    'Quantité Demandée': it.quantityNeeded,
    'Prix Unitaire Achat (DA)': Number(it.costPrice || 0),
    'Montant Estimé (DA)': Number((it.quantityNeeded || 0) * (it.costPrice || 0)),
    'Unité': it.unit || 'pcs'
  }));

  await exportToExcelSafely(rows, baseName, 'Cahier Manques');
};

/**
 * Exporte les articles au format CSV avec séparateur point-virgule et BOM UTF-8
 */
export const exportShortagesToCSV = (
  items: ShortageItem[],
  fileName?: string,
  listName?: string
): void => {
  if (!items || items.length === 0) {
    throw new Error('Aucun article à exporter.');
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const baseName = fileName || `Cahier_des_Manques_${listName ? listName.replace(/\s+/g, '_') : 'Global'}_${dateTag}.csv`;

  const headers = [
    'N°',
    'Désignation',
    'Code-Barres',
    'SKU',
    'Fournisseur',
    'Stock Actuel',
    'Seuil Alerte',
    'Quantité Demandée',
    'Prix Unitaire (DA)',
    'Total Ligne (DA)',
    'Unité'
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = items.map((it, idx) => {
    const lineTotal = (it.quantityNeeded || 0) * (it.costPrice || 0);
    return [
      idx + 1,
      escapeCsv(it.name),
      escapeCsv(it.barcode || ''),
      escapeCsv(it.sku || ''),
      escapeCsv(it.supplierName || ''),
      it.currentStock,
      it.minStock,
      it.quantityNeeded,
      Number(it.costPrice || 0).toFixed(2),
      Number(lineTotal).toFixed(2),
      escapeCsv(it.unit || 'pcs')
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...lines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = baseName.endsWith('.csv') ? baseName : `${baseName}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
};

/**
 * Formate un message texte WhatsApp prêt à être envoyé au commercial du fournisseur
 */
export const generateShortagesWhatsAppText = ({
  items,
  supplierName = 'Fournisseur',
  listName = 'Cahier des Manques',
  companyName = 'Mon Magasin'
}: {
  items: ShortageItem[];
  supplierName?: string;
  listName?: string;
  companyName?: string;
}): string => {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantityNeeded || 0), 0);
  const totalValuation = items.reduce((acc, it) => acc + ((it.quantityNeeded || 0) * (it.costPrice || 0)), 0);

  const lines = items.map((it, idx) => {
    const urgentTag = it.priority === 'urgent' ? '🔥 *[URGENT]* ' : '';
    const customTag = it.isCustomProduct ? '⚠️ *[Hors-catalogue]* ' : '';
    const ref = it.barcode ? `(CB: ${it.barcode})` : it.sku ? `(Réf: ${it.sku})` : '';
    const unitPrice = it.costPrice ? `à ${formatDZD(it.costPrice)} DA` : '';
    const noteText = it.notes ? `\n   ↳ 📝 _Note: ${it.notes}_` : '';
    return `${idx + 1}. ${urgentTag}${customTag}*${it.quantityNeeded}x* ${it.name} ${ref} ${unitPrice}${noteText}`.trim();
  });

  return [
    `📋 *COMMANDE DE RÉASSORT — ${companyName.toUpperCase()}*`,
    `📅 *Date :* ${dateStr}`,
    `🏢 *Fournisseur :* ${supplierName}`,
    `🏷️ *Liste :* ${listName}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...lines,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *Total articles :* ${items.length} références (${totalQuantity} unités)`,
    `💰 *Montant estimé :* *${formatDZD(totalValuation)} DA*`,
    `\n_Merci de confirmer la disponibilité et le délai de livraison._`
  ].join('\n');
};

/**
 * Nettoie et formate un numéro de téléphone pour WhatsApp (standard Algérie + international)
 * Exemples :
 * '0555 12 34 56' -> '213555123456'
 * '0661-22-33-44' -> '213661223344'
 * '+213770112233' -> '213770112233'
 */
export const formatAlgerianWhatsAppPhone = (phone?: string): string => {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, ''); // Ne conserve que les chiffres

  if (clean.startsWith('00213')) {
    clean = clean.substring(2); // '213...'
  } else if (clean.startsWith('0') && clean.length === 10) {
    clean = '213' + clean.substring(1);
  } else if (!clean.startsWith('213') && clean.length === 9) {
    clean = '213' + clean;
  }
  return clean;
};

/**
 * Ouvre directement la conversation WhatsApp (Web ou Mobile) avec le message pré-rempli
 */
export const openWhatsAppDirectShare = ({
  text,
  phoneNumber
}: {
  text: string;
  phoneNumber?: string;
}): void => {
  const formattedPhone = formatAlgerianWhatsAppPhone(phoneNumber);
  const encodedText = encodeURIComponent(text);
  const url = formattedPhone 
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

