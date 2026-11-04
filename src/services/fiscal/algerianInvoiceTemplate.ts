/**
 * 🧾 Modèle de Facture Fiscale A4 Normalisée (Algérie)
 * Intègre les mentions obligatoires : NIF, NIS, RC, AI, ventilation TVA 19% et 9%,
 * droit de timbre fiscal et arrêté en toutes lettres.
 */

import { Transaction, CompanySettings, Customer } from '../../types';
import { computeTaxBreakdown, numberToWordsAlgerianDZD } from './algerianTaxCalculations';

export interface FiscalInvoiceMetadata {
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
}

export function generateAlgerianFiscalInvoiceHtml(
  transaction: Transaction,
  settings: CompanySettings,
  customer?: Customer | null,
  fiscalMeta?: FiscalInvoiceMetadata
): string {
  const currency = settings.currency || 'DA';
  const breakdown = computeTaxBreakdown(
    (transaction.items || []).map(i => ({
      price: i.price,
      quantity: i.quantity,
      taxRate: (i as any).taxRate ?? 19
    })),
    transaction.paymentMethod,
    transaction.discountAmount || 0
  );

  const amountInWords = numberToWordsAlgerianDZD(breakdown.totalTTC);
  const invoiceNumber = `FAC-${transaction.id.slice(0, 10).toUpperCase()}`;
  const dateStr = new Date(transaction.timestamp).toLocaleDateString('fr-DZ', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const rowsHtml = (transaction.items || []).map((item, idx) => {
    const qty = item.quantity || 1;
    const rate = Number((item as any).taxRate ?? 19);
    const lineTotalTTC = (item.price || 0) * qty;
    const lineHT = lineTotalTTC / (1 + rate / 100);
    return `
      <tr>
        <td style="text-align:center; padding: 6px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${item.name || 'Article'}</td>
        <td style="text-align:center; padding: 6px; border-bottom: 1px solid #e2e8f0;">${qty}</td>
        <td style="text-align:right; padding: 6px; border-bottom: 1px solid #e2e8f0;">${(lineHT / qty).toFixed(2)}</td>
        <td style="text-align:center; padding: 6px; border-bottom: 1px solid #e2e8f0;">${rate}%</td>
        <td style="text-align:right; padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight:bold;">${lineHT.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Facture ${invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 25px; color: #1e293b; font-size: 13px; }
    .header-table { width: 100%; margin-bottom: 25px; }
    .company-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 4px; }
    .fiscal-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 11px; margin-top: 8px; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .items-table th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px; padding: 8px; }
    .totals-box { width: 280px; margin-left: auto; margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .grand-total { font-size: 15px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
    .words-box { margin-top: 20px; padding: 10px; background: #f1f5f9; border-left: 4px solid #4f46e5; font-style: italic; font-size: 12px; }
    .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 55%; vertical-align: top;">
        <div class="company-title">${settings.name || 'NEXUS COMMERCE'}</div>
        <div>${settings.address || 'Alger, Algérie'}</div>
        <div>Tél: ${settings.phone || 'Non renseigné'}</div>
        <div class="fiscal-box">
          <div><strong>NIF :</strong> ${fiscalMeta?.nif || settings.taxNumber || '000000000000000'}</div>
          <div><strong>NIS :</strong> ${fiscalMeta?.nis || '0000000000'} | <strong>RC :</strong> ${fiscalMeta?.rc || '16/00-0000000'}</div>
          <div><strong>Article d'Imposition (AI) :</strong> ${fiscalMeta?.ai || '16000000000'}</div>
        </div>
      </td>
      <td style="width: 45%; vertical-align: top; text-align: right;">
        <div style="font-size: 18px; font-weight: 900; color: #4f46e5;">FACTURE COMMERCIALE</div>
        <div style="font-size: 13px; font-weight: bold; margin: 4px 0;">N° : ${invoiceNumber}</div>
        <div>Date d'émission : ${dateStr}</div>
        <div style="margin-top: 15px; padding: 10px; border: 1px dashed #94a3b8; border-radius: 8px; text-align: left; background: #ffffff;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Client :</div>
          <div style="font-weight: bold; font-size: 13px;">${customer?.name || transaction.customerName || 'Client Comptoir'}</div>
          ${customer?.phone ? `<div>Tél : ${customer.phone}</div>` : ''}
          ${customer?.address ? `<div>Adresse : ${customer.address}</div>` : ''}
        </div>
      </td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th style="text-align: left;">Désignation</th>
        <th style="width: 60px;">Qté</th>
        <th style="width: 100px; text-align: right;">Prix Unit. HT</th>
        <th style="width: 60px;">TVA</th>
        <th style="width: 110px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="totals-row"><span>Total HT :</span><strong>${breakdown.totalHT.toFixed(2)} ${currency}</strong></div>
    ${breakdown.vat19 > 0 ? `<div class="totals-row"><span>TVA (19%) :</span><span>${breakdown.vat19.toFixed(2)} ${currency}</span></div>` : ''}
    ${breakdown.vat9 > 0 ? `<div class="totals-row"><span>TVA (9%) :</span><span>${breakdown.vat9.toFixed(2)} ${currency}</span></div>` : ''}
    ${breakdown.stampDuty > 0 ? `<div class="totals-row"><span>Droit de Timbre :</span><span>${breakdown.stampDuty.toFixed(2)} ${currency}</span></div>` : ''}
    <div class="totals-row grand-total"><span>Total TTC à Payer :</span><span>${breakdown.totalTTC.toFixed(2)} ${currency}</span></div>
  </div>

  <div class="words-box">
    <strong>Arrêté la présente facture à la somme de :</strong> ${amountInWords}.
  </div>

  <div class="footer-signatures">
    <div><strong>Cachet & Signature Vendeur :</strong></div>
    <div><strong>Accusé de Réception Client :</strong></div>
  </div>
</body>
</html>
  `;
}
