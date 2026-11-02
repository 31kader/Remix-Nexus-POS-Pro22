import { ShortageItem } from '../../../types/shortages';
import { exportToExcelSafely } from '../../../lib/excelSecurity';
import { formatDZD } from './shortagePrintHtml';

export type { ShortageExportOptions } from './shortagePrintHtml';
export {
  formatDZD,
  generateShortageA4PrintHtml,
  printShortageHtmlDocument
} from './shortagePrintHtml';

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
