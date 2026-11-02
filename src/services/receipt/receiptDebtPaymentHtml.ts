import { CompanySettings } from '../../types';
import { escapeHtml } from './receiptA4Html';

export interface DebtPaymentReceiptData {
  customerName: string;
  customerPhone?: string;
  date: string;
  previousBalance: number;
  paymentAmount: number;
  newBalance: number;
  paymentMethod?: string;
  note?: string;
  operatorName?: string;
}

export interface DebtPaymentHtmlOptions {
  data: DebtPaymentReceiptData;
  settings: CompanySettings;
  paperWidth: string;
  pageSizeRule: string;
  currency: string;
}

export function buildDebtPaymentReceiptHtml(opts: DebtPaymentHtmlOptions): string {
  const { data, settings, paperWidth, pageSizeRule, currency } = opts;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reçu de Règlement - ${escapeHtml(data.customerName)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: ${pageSizeRule}; margin: 0mm; }
          html, body {
            font-family: 'Courier New', monospace;
            font-weight: 800;
            width: ${paperWidth};
            max-width: ${paperWidth};
            height: auto;
            margin: 0 !important;
            padding: 1.5mm !important;
            overflow-x: hidden;
            color: #000;
            background: #fff;
            box-sizing: border-box;
            text-transform: uppercase;
            font-size: 10px;
          }
          .center { text-align: center; }
          .header { margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 6px; }
          .title { font-size: 13px; font-weight: 900; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .highlight { font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 6px 0; }
          .footer { margin-top: 10px; border-top: 2px dashed #000; padding-top: 6px; text-align: center; font-size: 9px; }
          .signature-box { margin-top: 14px; border: 1px dashed #000; height: 38px; display: flex; align-items: flex-end; justify-content: center; font-size: 8px; padding-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="header center">
          <div style="font-size: 14px; font-weight: 900;">${escapeHtml(settings.name || 'NEXUS POS')}</div>
          ${settings.address ? `<div style="font-size: 9px;">${escapeHtml(settings.address)}</div>` : ''}
          ${settings.phone ? `<div style="font-size: 9px;">TÉL: ${escapeHtml(settings.phone)}</div>` : ''}
          <div class="title">REÇU DE RÈGLEMENT</div>
          <div style="font-size: 9px;">${escapeHtml(data.date)}</div>
        </div>

        <div style="margin-bottom: 6px;">
          <div class="row"><span>CLIENT :</span><span style="font-weight: 900;">${escapeHtml(data.customerName)}</span></div>
          ${data.customerPhone ? `<div class="row"><span>TÉLÉPHONE :</span><span>${escapeHtml(data.customerPhone)}</span></div>` : ''}
          ${data.operatorName ? `<div class="row"><span>CAISSE / OPÉRATEUR :</span><span>${escapeHtml(data.operatorName)}</span></div>` : ''}
        </div>

        <div style="border-top: 1px dashed #000; padding-top: 6px;">
          <div class="row"><span>ANCIEN SOLDE DÛ :</span><span>${Math.abs(data.previousBalance).toFixed(2)} ${currency}</span></div>
          <div class="row highlight"><span>MONTANT REÇU :</span><span>${data.paymentAmount.toFixed(2)} ${currency}</span></div>
          <div class="row"><span>MODE DE RÈGLEMENT :</span><span>${escapeHtml(data.paymentMethod || 'ESPÈCES')}</span></div>
          <div class="row" style="font-size: 12px; font-weight: 900; margin-top: 4px;">
            <span>NOUVEAU SOLDE RESTANT :</span>
            <span>${Math.abs(data.newBalance).toFixed(2)} ${currency}</span>
          </div>
        </div>

        ${data.note ? `<div style="margin-top: 6px; font-size: 9px; font-style: italic;">NOTE: ${escapeHtml(data.note)}</div>` : ''}

        <div class="signature-box">
          SIGNATURE / CACHET COMMERÇANT
        </div>

        <div class="footer">
          <div>CONSERVEZ CE REÇU COMME JUSTIFICATIF</div>
          <div>MERCI DE VOTRE CONFIANCE</div>
        </div>
      </body>
    </html>
  `;
}
