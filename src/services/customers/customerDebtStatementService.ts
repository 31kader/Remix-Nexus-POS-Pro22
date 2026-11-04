import { Customer, Transaction } from '../../types';
import { escapeHtml } from '../../lib/utils';

export interface CustomerDebtSummary {
  customer: Customer;
  unpaidTransactions: Transaction[];
  totalCreditSales: number;
  totalPaid: number;
  currentBalance: number; // Montant restant dû
}

export class CustomerDebtStatementService {
  /**
   * Calcule le récapitulatif des dettes pour un client donné
   */
  static computeDebtSummary(customer: Customer, transactions: Transaction[]): CustomerDebtSummary {
    const customerTransactions = transactions.filter(
      (t) => (t.customerId === customer.id || (t as any).customer_id === customer.id)
    );

    // Ventes à crédit ou avec solde non soldé
    const unpaidTransactions = customerTransactions.filter(
      (t) => t.paymentMethod === 'balance' || (t.total > 0 && t.status === 'completed')
    );

    const totalCreditSales = unpaidTransactions.reduce((acc, t) => acc + (t.total || 0), 0);
    const currentBalance = customer.balance || 0;
    const totalPaid = Math.max(0, totalCreditSales - currentBalance);

    return {
      customer,
      unpaidTransactions,
      totalCreditSales,
      totalPaid,
      currentBalance
    };
  }

  /**
   * Génère le relevé de compte au format HTML A4 pour impression officielle
   */
  static generateStatementHtml(summary: CustomerDebtSummary, storeName: string = 'NEXUS DISTRIBUTION'): string {
    const { customer, unpaidTransactions, currentBalance } = summary;

    const rows = unpaidTransactions
      .map(
        (t, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px;">${new Date((t as any).date || t.timestamp || t.created_at || Date.now()).toLocaleDateString('fr-DZ')}</td>
          <td style="padding: 8px; font-family: monospace;">#${t.id.slice(-8).toUpperCase()}</td>
          <td style="padding: 8px;">${t.items ? t.items.length : 0} article(s)</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${(t.total || 0).toFixed(2)} DA</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relevé de Compte - ${escapeHtml(customer.name)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
          .balance-card { background: #fef2f2; border: 2px solid #f87171; border-radius: 8px; padding: 15px; text-align: right; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 25px; }
          th { background: #0f172a; color: white; padding: 8px; text-align: left; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin: 0; color: #0f172a;">${escapeHtml(storeName)}</h2>
            <p style="margin: 4px 0; color: #64748b;">SERVICE SUIVI CLIENTS & CRÉDITS (CARNET KHEDDAM)</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: #e11d48;">RELEVÉ DE DETTES & CRÉDITS</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">Date d'édition : ${new Date().toLocaleDateString('fr-DZ')}</p>
          </div>
        </div>

        <div style="margin-top: 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a;">Informations Client</h4>
          <p style="margin: 2px 0;"><strong>Nom / Raison Sociale :</strong> ${escapeHtml(customer.name)}</p>
          <p style="margin: 2px 0;"><strong>Téléphone :</strong> ${escapeHtml(customer.phone || 'Non renseigné')}</p>
          <p style="margin: 2px 0;"><strong>Crédit Max Autorisé :</strong> ${(customer.creditLimit || (customer as any).credit_limit || 0).toFixed(2)} DA</p>
        </div>

        <div class="balance-card">
          <div style="font-size: 12px; font-weight: bold; color: #991b1b; text-transform: uppercase;">Solde Restant Dû au Commerçant</div>
          <div style="font-size: 28px; font-weight: 900; color: #b91c1c; margin-top: 5px;">
            ${currentBalance.toFixed(2)} DA
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">N°</th>
              <th style="width: 100px;">Date</th>
              <th style="width: 130px;">N° Ticket</th>
              <th>Détails</th>
              <th style="width: 120px; text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8;">Aucun achat récent à crédit</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
          Document édité par Nexus POS Pro. Pour toute régularisation, merci de vous rapprocher de la caisse.
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Formate un message WhatsApp de rappel de solde pour le client
   */
  static formatDebtReminderWhatsApp(summary: CustomerDebtSummary, storeName: string = 'NEXUS DISTRIBUTION'): string {
    const { customer, currentBalance } = summary;
    let msg = `Bonjour *${customer.name}*,\n\n`;
    msg += `Voici votre relevé de situation auprès de *${storeName}* au ${new Date().toLocaleDateString('fr-DZ')} :\n\n`;
    msg += `💰 *Solde restant dû :* *${currentBalance.toFixed(2)} DA*\n\n`;
    msg += `Merci de bien vouloir passer en caisse ou d'effectuer votre virement BaridiMob dès que possible.\n\n`;
    msg += `Cordialement,\n_${storeName}_`;
    return msg;
  }
}
