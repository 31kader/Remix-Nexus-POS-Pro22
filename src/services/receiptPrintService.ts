import { calculateItemPrice, formatPrice } from '../lib/utils';
import { CompanySettings } from '../types';
import QRCode from 'qrcode';
import { escapeHtml, buildReceiptA4Html } from './receipt/receiptA4Html';
import { buildReceiptThermalHtml } from './receipt/receiptThermalHtml';
import { buildDebtPaymentReceiptHtml, DebtPaymentReceiptData } from './receipt/receiptDebtPaymentHtml';

export { escapeHtml };
export type { DebtPaymentReceiptData };

export async function generateReceiptQrCode(url: string): Promise<string> {
  if (!url) return '';
  return await QRCode.toDataURL(url, {
    margin: 1,
    width: 120,
    errorCorrectionLevel: 'M'
  });
}

function getOrCreatePrintIframe(): HTMLIFrameElement {
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
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
  return iframe;
}

function triggerPrint(doc: Document, useSilent: boolean, iframe: HTMLIFrameElement | null, printWindow: Window | null) {
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
}

export const printReceipt = async (t: any, settings: CompanySettings) => {
  const useSilent = settings?.silentPrinting ?? false;
  
  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  if (useSilent) {
    iframe = getOrCreatePrintIframe();
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
  
  // 🛡️ Ventilation fiscale : TVA issue des paramètres (défaut 0%)
  const taxRate = typeof settings.taxRate === 'number' ? settings.taxRate : (Number(settings.taxRate) || 0);
  const totalTTC = Number(t.total) || 0;
  const totalHT = taxRate > 0 ? (totalTTC / (1 + taxRate / 100)) : totalTTC;
  const totalTVA = taxRate > 0 ? (totalTTC - totalHT) : 0;

  // Largeur utile réelle des imprimantes thermiques : 72mm (pour rouleau 80mm) et 48mm (pour rouleau 58/60mm)
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
    doc.write(buildReceiptA4Html({
      receiptId,
      t,
      settings,
      itemsHtml,
      subtotalBeforeDiscounts,
      totalSavings,
      totalHT,
      taxRate,
      totalTVA,
      totalTTC
    }));
  } else {
    doc.write(buildReceiptThermalHtml({
      receiptId,
      t,
      settings,
      itemsHtml,
      subtotalBeforeDiscounts,
      totalSavings,
      paperWidth,
      pageSizeRule,
      socialQrDataUrl
    }));
  }

  triggerPrint(doc, useSilent, iframe, printWindow);
};

export const printDebtPaymentReceipt = async (data: DebtPaymentReceiptData, settings: CompanySettings) => {
  const useSilent = settings?.silentPrinting ?? false;
  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  if (useSilent) {
    iframe = getOrCreatePrintIframe();
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
  doc.write(buildDebtPaymentReceiptHtml({
    data,
    settings,
    paperWidth,
    pageSizeRule,
    currency
  }));

  triggerPrint(doc, useSilent, iframe, printWindow);
};
