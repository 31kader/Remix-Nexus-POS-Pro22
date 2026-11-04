import { G50MonthlySummary } from './g50ExportService';
import { escapeHtml } from '../../lib/utils';

export interface CompanyFiscalData {
  companyName: string;
  nif: string;
  nis: string;
  rc: string;
  ai: string;
  wilaya?: string;
  taxInspection?: string;
  taxReceiptOffice?: string;
}

export class G50OfficialPdfTemplate {
  /**
   * Génère le HTML A4 officiel calqué sur la déclaration G50 de la DGI Algérie
   */
  static generateOfficialG50Html(
    summary: G50MonthlySummary,
    fiscalData: CompanyFiscalData
  ): string {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const periodLabel = `${monthNames[summary.month - 1] || summary.month} ${summary.year}`;

    const tvaNet = summary.tvaNetToPay;
    const isCredit = tvaNet < 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Déclaration Fiscale G50 - ${periodLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #0f172a; font-size: 11px; }
          .header-dgi { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .title-box { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 6px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
          .info-block { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1e293b; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .total-row { background: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a; }
          .summary-card { margin-top: 15px; padding: 12px; border-radius: 6px; border: 2px solid ${isCredit ? '#2563eb' : '#059669'}; background: ${isCredit ? '#eff6ff' : '#ecfdf5'}; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 35px; }
          .sig-box { border-top: 1px dashed #64748b; padding-top: 6px; text-align: center; font-weight: bold; }
          @media print {
            body { margin: 10mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-dgi">
          <div style="font-size: 12px; font-weight: bold;">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>
          <div style="font-size: 11px; color: #475569;">MINISTÈRE DES FINANCES — DIRECTION GÉNÉRALE DES IMPÔTS</div>
          <div style="font-size: 14px; font-weight: 900; margin-top: 4px;">DÉCLARATION SÉRIE G N° 50 (RÉGIME RÉEL)</div>
        </div>

        <div class="title-box">
          <div>
            <strong>PÉRIODE D'IMPOSITION :</strong> <span style="font-size: 13px; font-weight: bold; color: #0284c7;">${periodLabel}</span>
          </div>
          <div>
            <strong>DATE D'ÉDITION :</strong> ${new Date().toLocaleDateString('fr-DZ')}
          </div>
        </div>

        <div class="grid-2">
          <div class="info-block">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Identification du Contribuable</div>
            <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${escapeHtml(fiscalData.companyName)}</div>
            <div style="margin-top: 4px;"><strong>NIF :</strong> ${escapeHtml(fiscalData.nif || 'Non renseigné')}</div>
            <div><strong>NIS :</strong> ${escapeHtml(fiscalData.nis || 'Non renseigné')}</div>
            <div><strong>RC :</strong> ${escapeHtml(fiscalData.rc || 'Non renseigné')} | <strong>AI :</strong> ${escapeHtml(fiscalData.ai || 'Non renseigné')}</div>
          </div>
          <div class="info-block">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Structure Fiscale de Rattachement</div>
            <div style="margin-top: 4px;"><strong>Wilaya :</strong> ${escapeHtml(fiscalData.wilaya || 'Alger')}</div>
            <div><strong>Inspection :</strong> ${escapeHtml(fiscalData.taxInspection || 'Inspection des Impôts')}</div>
            <div><strong>Recette des Impôts :</strong> ${escapeHtml(fiscalData.taxReceiptOffice || 'Recette Centrale')}</div>
          </div>
        </div>

        <!-- TABLEAU A : TVA COLLECTÉE -->
        <table style="margin-top: 15px;">
          <thead>
            <tr>
              <th colspan="4" style="background: #0f172a; text-transform: uppercase;">Tableau A : Chiffre d'Affaires et TVA Brute Collectée</th>
            </tr>
            <tr style="background: #334155; color: white;">
              <th>Nature des Opérations</th>
              <th class="text-right">Chiffre d'Affaires HT (DA)</th>
              <th class="text-right">Taux</th>
              <th class="text-right">Montant de TVA (DA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Opérations imposables au taux normal</td>
              <td class="text-right">${summary.salesNormalRateHt.toFixed(2)}</td>
              <td class="text-right">19 %</td>
              <td class="text-right font-bold">${summary.tvaNormalRate.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Opérations imposables au taux réduit</td>
              <td class="text-right">${summary.salesReducedRateHt.toFixed(2)}</td>
              <td class="text-right">9 %</td>
              <td class="text-right font-bold">${summary.tvaReducedRate.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Ventes exonérées ou franchise de taxe</td>
              <td class="text-right">${summary.salesExemptHt.toFixed(2)}</td>
              <td class="text-right">0 %</td>
              <td class="text-right">0.00</td>
            </tr>
            <tr class="total-row">
              <td>TOTAL DU CHIFFRE D'AFFAIRES & TVA BRUTE</td>
              <td class="text-right font-bold">${summary.totalSalesHt.toFixed(2)}</td>
              <td></td>
              <td class="text-right font-bold" style="color: #0284c7;">${summary.totalTvaCollected.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- TABLEAU B : DÉDUCTIONS -->
        <table>
          <thead>
            <tr>
              <th colspan="3" style="background: #0f172a; text-transform: uppercase;">Tableau B : Déductions autorisées (TVA sur Achats)</th>
            </tr>
            <tr style="background: #334155; color: white;">
              <th>Désignation des Déductions</th>
              <th class="text-right">Base Achats HT (DA)</th>
              <th class="text-right">TVA Déductible (DA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TVA déductible sur achats de marchandises et biens</td>
              <td class="text-right">${summary.purchasesNormalRateHt.toFixed(2)}</td>
              <td class="text-right font-bold">${summary.totalTvaDeductible.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>TOTAL TVA DÉDUCTIBLE DU MOIS</td>
              <td></td>
              <td class="text-right font-bold" style="color: #16a34a;">${summary.totalTvaDeductible.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- TABLEAU C : DROITS DE TIMBRE -->
        <table>
          <thead>
            <tr>
              <th colspan="2" style="background: #0f172a; text-transform: uppercase;">Tableau C : Droits de Timbre Fiscal (Règlement Espèces)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Droits de timbre fiscaux perçus au cours du mois</td>
              <td class="text-right font-bold" style="width: 140px;">${summary.totalStampDuty.toFixed(2)} DA</td>
            </tr>
          </tbody>
        </table>

        <!-- RÉCAPITULATIF NET -->
        <div class="summary-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: bold; color: ${isCredit ? '#1e40af' : '#065f46'};">
                ${isCredit ? 'CRÉDIT DE TVA À REPORTER SUR LE MOIS SUIVANT :' : 'MONTANT NET DE TVA À ACQUITTER AU TRÉSOR :'}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                (TVA Collectée : ${summary.totalTvaCollected.toFixed(2)} DA - TVA Déductible : ${summary.totalTvaDeductible.toFixed(2)} DA)
              </div>
            </div>
            <div style="font-size: 20px; font-weight: 900; color: ${isCredit ? '#1d4ed8' : '#047857'};">
              ${Math.abs(tvaNet).toFixed(2)} DA
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">Cachet & Signature de l'Entreprise / Déclarant</div>
          <div class="sig-box">Quittance de Paiement & Visa de la Recette des Impôts</div>
        </div>
      </body>
      </html>
    `;
  }
}
