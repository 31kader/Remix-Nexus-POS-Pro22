import { formatSafe, parseCashierNotes } from '../../lib/utils';
import { Customer, Transaction, CompanySettings } from '../../types';
import { executePrint } from './documentPrintCore';

export const printCustomerStatement = (
  customer: Customer,
  transactions: Transaction[],
  settings: CompanySettings
) => {
  const custName = customer.name || 'Client sans nom';
  const custPhone = customer.phone || 'Non renseigné';
  const custEmail = customer.email || 'Non renseigné';
  const custCard = customer.loyaltyCardNumber || 'Non assigné';
  const balance = Number(customer.balance || 0);
  const points = customer.loyaltyPoints || 0;
  const totalSpent = Number(customer.totalSpent || 0);
  const currency = settings.currency || 'DA';

  // Filter transactions for this customer
  const targetId = String(customer.id || '');
  const targetName = custName.toLowerCase().trim();
  const custTxs = (transactions || [])
    .filter(t => {
      if (!t) return false;
      const cId = String(t.customerId || (t as any).customer_id || '');
      const cName = String(t.customerName || (t as any).customer_name || '').toLowerCase().trim();
      return (targetId && cId === targetId) || (targetName && cName === targetName);
    })
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 25);

  const txRows = custTxs.map(t => {
    const dStr = formatSafe(t.timestamp || (t as any).created_at, 'dd/MM/yyyy HH:mm');
    const idShort = String(t.id || '').slice(-6).toUpperCase();
    const tot = Number(t.total || 0).toFixed(2);
    const method = String(t.paymentMethod || 'Espèces').toUpperCase();
    const isDebt = (t.paymentMethod as string) === 'debt' || (t as any).isDebt;
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: 700; font-size: 11px;">${dStr}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: 800; font-size: 11px;">#${idShort}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-size: 11px; text-transform: uppercase;">${isDebt ? '<span style="color:#b91c1c; font-weight:900;">À Crédit</span>' : method}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 900; font-size: 12px;">${tot} ${currency}</td>
      </tr>
    `;
  }).join('');

  // Cashier notes (payments and top-ups)
  const safeNotes = parseCashierNotes(customer.cashierNotes || (customer as any).cashier_notes);
  const notesRows = safeNotes
    .slice()
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 10)
    .map(n => {
      const d = formatSafe(n.timestamp, 'dd/MM/yyyy HH:mm');
      return `
        <div style="padding: 8px 10px; background: #f8fafc; border-left: 3px solid #6366f1; margin-bottom: 6px; font-size: 11px; border-radius: 4px;">
          <div style="font-weight: 700; color: #1e293b;">${n.note}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Enregistré par: ${n.author || 'Direction'} • ${d}</div>
        </div>
      `;
    }).join('');

  const isDebtor = balance < 0;
  const isCreditor = balance > 0;
  const balanceLabel = isDebtor ? 'SOLDE DÉBITEUR (DETTE À RÉGLER)' : (isCreditor ? 'SOLDE CRÉDITEUR (AVOIR DISPONIBLE)' : 'SOLDE DU COMPTE');
  const balanceColor = isDebtor ? '#b91c1c' : (isCreditor ? '#047857' : '#1e293b');
  const balanceBg = isDebtor ? '#fef2f2' : (isCreditor ? '#ecfdf5' : '#f8fafc');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relevé de Compte - ${custName}</title>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { margin: 15mm; size: auto; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
            color: #0f172a;
            background: #fff;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
          }
          .header-block {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .store-name {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .store-details {
            font-size: 11px;
            color: #475569;
            margin-top: 4px;
            font-weight: 600;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #4338ca;
          }
          .doc-date {
            font-size: 10px;
            color: #64748b;
            font-weight: 700;
            margin-top: 4px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            background: #f8fafc;
          }
          .card-title {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748b;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .info-label { font-weight: 600; color: #64748b; }
          .info-val { font-weight: 800; color: #0f172a; }
          .balance-card {
            border: 2px solid ${balanceColor};
            background: ${balanceBg};
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
          }
          .balance-label {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: ${balanceColor};
          }
          .balance-amount {
            font-size: 32px;
            font-weight: 900;
            color: ${balanceColor};
            margin-top: 6px;
            letter-spacing: -0.5px;
          }
          .sub-stats {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11px;
            font-weight: 800;
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 900;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 10px 8px;
            border-bottom: 2px solid #cbd5e1;
            text-align: left;
          }
          .section-heading {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin-top: 24px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .signatures {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .sig-box {
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            height: 90px;
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="header-block">
          <div>
            <div class="store-name">${settings.name || 'NEXUS POS PRO'}</div>
            <div class="store-details">
              ${settings.address ? `<span>${settings.address}</span> • ` : ''}
              ${settings.phone ? `<span>Tél: ${settings.phone}</span>` : ''}
              ${settings.taxNumber ? `<br/><span>NIF/RC: ${settings.taxNumber}</span>` : ''}
            </div>
          </div>
          <div class="doc-badge">
            <div class="doc-title">RELEVÉ DE COMPTE</div>
            <div class="doc-date">Date d'édition : ${formatSafe(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">Fiche Client</div>
            <div class="info-row"><span class="info-label">Nom Complet:</span> <span class="info-val">${custName}</span></div>
            <div class="info-row"><span class="info-label">Téléphone:</span> <span class="info-val">${custPhone}</span></div>
            <div class="info-row"><span class="info-label">Email:</span> <span class="info-val">${custEmail}</span></div>
            <div class="info-row"><span class="info-label">N° Carte Fidélité:</span> <span class="info-val">${custCard}</span></div>
          </div>
          <div class="card">
            <div class="card-title">Synthèse d'Activité</div>
            <div class="info-row"><span class="info-label">Total Achats Cumulés:</span> <span class="info-val">${totalSpent.toFixed(2)} ${currency}</span></div>
            <div class="info-row"><span class="info-label">Nombre de Transactions:</span> <span class="info-val">${customer.purchaseCount || custTxs.length}</span></div>
            <div class="info-row"><span class="info-label">Points Fidélité Actuels:</span> <span class="info-val" style="color: #d97706;">${points} PTS</span></div>
            <div class="info-row"><span class="info-label">Dernier Passage:</span> <span class="info-val">${customer.lastVisit ? formatSafe(customer.lastVisit, 'dd/MM/yyyy') : 'Aucun'}</span></div>
          </div>
        </div>

        <div class="balance-card">
          <div class="balance-label">${balanceLabel}</div>
          <div class="balance-amount">${Math.abs(balance).toFixed(2)} ${currency}</div>
          <div class="sub-stats">
            <div>Points Fidélité : <span style="color:#d97706">${points} PTS</span></div>
            <div>Total Dépensé : <span>${totalSpent.toFixed(2)} ${currency}</span></div>
          </div>
        </div>

        <div class="section-heading">
          <span>Historique Récent des Achats & Opérations</span>
          <span style="font-size: 10px; color: #64748b;">${custTxs.length} dernière(s) opération(s)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Référence</th>
              <th>Mode / Type</th>
              <th style="text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${txRows || '<tr><td colspan="4" style="text-align:center; padding: 16px; color: #94a3b8;">Aucune transaction enregistrée</td></tr>'}
          </tbody>
        </table>

        ${notesRows ? `
          <div class="section-heading" style="margin-top: 24px;">
            <span>Derniers Règlements & Mémos Comptables</span>
          </div>
          <div>${notesRows}</div>
        ` : ''}

        <div class="signatures">
          <div class="sig-box">
            Cachet et Signature du Magasin
          </div>
          <div class="sig-box">
            Signature et Accord du Client ${isDebtor ? '(Bon pour reconnaissance de dette)' : ''}
          </div>
        </div>

        <div class="footer">
          Document certifié conforme émis par le système Nexus POS Pro • ${settings.name || 'Système de Caisse'}
        </div>
      </body>
    </html>
  `;

  executePrint(html);
};
