import { escapeHtml } from '../../lib/utils';
import { CompanySettings, Product, Transaction, Customer, Supplier } from '../../types';

interface ComplianceCertificateData {
  settings: CompanySettings;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  auditLogsCount: number;
}

export function printComplianceCertificate({
  settings,
  products,
  transactions,
  customers,
  suppliers,
  auditLogsCount
}: ComplianceCertificateData) {
  const win = window.open('', '_blank', 'width=950,height=800');
  if (!win) return;
  const storeName = escapeHtml(settings?.name || 'Établissement Utilisateur Nexus POS Pro');
  const nif = escapeHtml(settings?.taxNumber || 'Non renseigné');
  win.document.write(`
    <html>
      <head>
        <title>Certificat de Souveraineté des Données — ${storeName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 35px; line-height: 1.6; }
          .box { border: 3px double #312e81; padding: 30px; border-radius: 12px; }
          h1 { color: #312e81; font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
          .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; font-weight: bold; font-size: 11px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; text-align: left; }
          th { background: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="box">
          <span class="badge">CERTIFICAT OFFICIEL DE CONFORMITÉ & SOUVERAINETÉ NUMÉRIQUE</span>
          <h1>Politique de Confidentialité & Souveraineté des Données</h1>
          <p style="margin-top:0;color:#475569;font-size:13px;">
            Conforme à la <strong>Loi Algérienne n° 18-07</strong> relative à la protection des personnes physiques dans le traitement des données à caractère personnel & aux standards internationaux RGPD.
          </p>
          <table>
            <tr>
              <th>Titulaire Exclusif des Données</th>
              <td><strong>${storeName}</strong> (NIF : ${nif})</td>
            </tr>
            <tr>
              <th>Architecture de Stockage</th>
              <td>Hybride <strong>Offline-First (Base Locale IndexedDB)</strong> + Réplication Chiffrée Cloud Privé (Supabase Pro TLS 1.3)</td>
            </tr>
            <tr>
              <th>Chiffrement & Authentification</th>
              <td>Hachage irréversible <strong>Bcrypt ($2a$/$2b$)</strong> des codes PIN et mots de passe + Isolation SessionStorage</td>
            </tr>
            <tr>
              <th>Inventaire des Données Détenues</th>
              <td>${products.length} Produits • ${transactions.length} Ventes • ${customers.length} Clients • ${suppliers.length} Fournisseurs • ${auditLogsCount} Journaux d'Audit</td>
            </tr>
            <tr>
              <th>Engagement de Non-Exploitation</th>
              <td><strong>100% Propriété Marchand :</strong> Aucune revente, aucun partage publicitaire, aucune lecture par des tiers.</td>
            </tr>
          </table>
          <p style="font-size:12px;">
            Le commerçant dispose d'un droit permanent et inconditionnel d'exportation intégrale (JSON/CSV/Excel), de rectification, d'archivage et de purge définitive de ses bases locales et distantes.
          </p>
          <div style="margin-top:35px;display:flex;justify-content:space-between;font-size:12px;">
            <div>Fait le : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
            <div>Cachet & Signature de l'Établissement : _______________________</div>
          </div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `);
  win.document.close();
}
