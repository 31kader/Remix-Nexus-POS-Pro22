import { format } from 'date-fns';
import { CompanySettings, Employee, AdvanceRecord } from '../../types';
import { formatSafe } from '../../lib/utils';

export interface ComputedPayrollData {
  employee: Employee;
  role: string;
  salaryTypeLabel: string;
  salaryBasisText: string;
  calculatedSalary: number;
  workedDays: number;
  totalHoursWorked: number;
  latenessCount: number;
  advancesTotal: number;
  empAdvances: AdvanceRecord[];
}

export function printPayslip(
  computedPayroll: ComputedPayrollData,
  settings: CompanySettings,
  bonusAmount: number,
  bonusReason: string,
  penaltyAmount: number,
  penaltyReason: string,
  selectedMonth: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres contextuelles pour imprimer la fiche de paie.");
    return;
  }
  const empName = computedPayroll.employee.name;
  const netAmount = (computedPayroll.calculatedSalary + bonusAmount - (computedPayroll.advancesTotal + penaltyAmount)).toFixed(2);
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Fiche de Paie - ${empName.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 10px; color: #222; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 45px; border-bottom: 2px solid #111; padding-bottom: 25px; }
          .header h1 { margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900; }
          .header p { margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 1px; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
          .details-table td { padding: 10px 8px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
          .details-table td.label { font-weight: 800; text-transform: uppercase; color: #555; width: 160px; }
          .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
          .salary-table th { background-color: #111; color: #fff; border-bottom: 1px solid #111; padding: 14px 12px; font-size: 11px; text-transform: uppercase; text-align: left; letter-spacing: 1px; }
          .salary-table td { padding: 14px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
          .salary-table td.number { text-align: right; font-family: monospace; font-size: 13px; font-weight: bold; }
          .salary-table th.number { text-align: right; }
          .total-row { font-weight: bold; background-color: #fafafa; font-size: 14px; }
          .total-row td { border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 18px 12px; }
          .footer { margin-top: 80px; display: flex; justify-content: space-between; font-size: 11px; text-transform: uppercase; color: #666; }
          .signature-box { border-top: 1px solid #aaa; width: 220px; text-align: center; padding-top: 12px; margin-top: 60px; font-weight: bold; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BULLETIN DE PAIE</h1>
          <p>${settings.name || 'NEXUS AUTOMATION'} - SYSTEME DE POINTAGE & PAIE</p>
        </div>
        
        <table class="details-table">
          <tr>
            <td class="label">Bénéficiaire</td>
            <td><strong>${empName.toUpperCase()}</strong></td>
            <td class="label">Période de Paie</td>
            <td><strong>${selectedMonth}</strong></td>
          </tr>
          <tr>
            <td class="label">Rôle / Poste</td>
            <td>${computedPayroll.role.toUpperCase()}</td>
            <td class="label">Date d'édition</td>
            <td>${new Date().toLocaleDateString('fr-FR')}</td>
          </tr>
          <tr>
            <td class="label">Mode Contrat</td>
            <td>${computedPayroll.salaryTypeLabel.toUpperCase()}</td>
            <td class="label">Devise de compte</td>
            <td>${settings.currency.toUpperCase()}</td>
          </tr>
          <tr>
            <td class="label">Mail / Contact</td>
            <td>${computedPayroll.employee.email || 'N/A'}</td>
            <td class="label">Téléphone</td>
            <td>${computedPayroll.employee.phone || 'N/A'}</td>
          </tr>
        </table>

        <table class="salary-table">
          <thead>
            <tr>
              <th>Rubrique de Paie</th>
              <th class="number" style="width: 140px;">Gains / Brut (${settings.currency})</th>
              <th class="number" style="width: 140px;">Retenues (${settings.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Salaire de base (${computedPayroll.salaryBasisText})</td>
              <td class="number">${computedPayroll.calculatedSalary.toFixed(2)}</td>
              <td class="number">-</td>
            </tr>
            ${bonusAmount > 0 ? `
            <tr>
              <td>Primes & Indemnités (${bonusReason || 'Bonus Exceptionnel'})</td>
              <td class="number">${bonusAmount.toFixed(2)}</td>
              <td class="number">-</td>
            </tr>
            ` : ''}
            ${computedPayroll.advancesTotal > 0 ? `
            <tr>
              <td>Acompte perçu déduit (Avance sur salaire)</td>
              <td class="number">-</td>
              <td class="number">${computedPayroll.advancesTotal.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${penaltyAmount > 0 ? `
            <tr>
              <td>Retenue sur salaire (${penaltyReason || 'Pénalité / Heures manquantes'})</td>
              <td class="number">-</td>
              <td class="number">${penaltyAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>NET À PAYER TOTAL (VIREMENT NET)</td>
              <td class="number" colspan="2" style="text-align: right; color: #111; font-size: 18px; font-family: monospace;">${netAmount} ${settings.currency}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 40px; font-size: 11px; color: #444; font-style: italic; background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 3px solid #111;">
          <strong>MÉTRIQUES DE POINTAGE ARCHIVÉES :</strong><br/>
          • Total heures travaillées : <strong>${computedPayroll.totalHoursWorked.toFixed(2)} Heures</strong><br/>
          • Jours de présence enregistrés : <strong>${computedPayroll.workedDays} Jours</strong><br/>
          • Retards cumulés de la période : <strong>${computedPayroll.latenessCount} Fois</strong>
        </div>

        <div class="footer">
          <div class="signature-box">Signature du Salarié<br/><span style="font-size:9px; font-weight:normal; color:#777;">(Précédé de la mention "Lu et approuvé")</span></div>
          <div class="signature-box">Cachet de l'Employeur</div>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function generateWhatsAppMessage(
  computedPayroll: ComputedPayrollData,
  settings: CompanySettings,
  bonusAmount: number,
  bonusReason: string,
  penaltyAmount: number,
  penaltyReason: string,
  selectedMonth: string
): string {
  const empName = computedPayroll.employee.name;
  const netAmount = (computedPayroll.calculatedSalary + bonusAmount - (computedPayroll.advancesTotal + penaltyAmount)).toFixed(2);
  
  return `*NEXUS POS - BULLETIN DE PAIE* 🧾\n` +
    `*Employé(e) :* ${empName.toUpperCase()}\n` +
    `*Période :* ${selectedMonth}\n` +
    `----------------------------------------\n` +
    `*Contrat :* ${computedPayroll.salaryTypeLabel}\n` +
    `*Présences :* ${computedPayroll.workedDays} jours (${computedPayroll.totalHoursWorked.toFixed(2)}h)\n` +
    `*Retards cumulés :* ${computedPayroll.latenessCount} fois\n\n` +
    `*COMPOSITION DU SALAIRE :*\n` +
    `• Salaire de base : ${computedPayroll.calculatedSalary.toFixed(2)} ${settings.currency}\n` +
    (bonusAmount > 0 ? `• Prime / Indemnité : +${bonusAmount.toFixed(2)} ${settings.currency} (${bonusReason || 'Bonus'})\n` : '') +
    (computedPayroll.advancesTotal > 0 ? `• Acomptes reçus : -${computedPayroll.advancesTotal.toFixed(2)} ${settings.currency}\n` : '') +
    (penaltyAmount > 0 ? `• Retenues sur paie : -${penaltyAmount.toFixed(2)} ${settings.currency} (${penaltyReason || 'Retenue'})\n` : '') +
    `----------------------------------------\n` +
    `*SOLDE NET À PAYER :* *${netAmount} ${settings.currency}*\n` +
    `----------------------------------------\n` +
    `_Généré par le système Nexus POS Pro_ ⚡`;
}
