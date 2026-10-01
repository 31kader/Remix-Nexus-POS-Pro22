import React, { useState } from 'react';
import { Card, Modal } from './ui';
import {
  ShoppingCart,
  Package,
  BarChart3,
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileText,
  Download,
  Printer,
  Database,
  Server,
  KeyRound,
  RefreshCw,
  Keyboard
} from 'lucide-react';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { createBackupArchive } from '../services/backupRestoreService';
import { escapeHtml } from '../lib/utils';
import { toast } from 'sonner';

export function Help() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const products = useCoreStore(s => s.products) || [];
  const settings = useCoreStore(s => s.settings) || ({} as any);
  const transactions = useTransactionStore(s => s.transactions) || [];
  const customers = usePeopleStore(s => s.customers) || [];
  const suppliers = usePeopleStore(s => s.suppliers) || [];
  const auditLogs = useFinanceStore(s => s.auditLogs) || [];

  const handlePrintComplianceCertificate = () => {
    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) return;
    const storeName = escapeHtml(settings.name || 'Établissement Utilisateur Nexus POS Pro');
    const nif = escapeHtml(settings.taxNumber || 'Non renseigné');
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
                <td>${products.length} Produits • ${transactions.length} Ventes • ${customers.length} Clients • ${suppliers.length} Fournisseurs • ${auditLogs.length} Journaux d'Audit</td>
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
  };

  const handleClearImageCacheOnly = async () => {
    try {
      const { del } = await import('idb-keyval');
      await del('nexus_image_blob_cache').catch(() => {});
      toast.success('Cache temporaire des miniatures nettoyé (Vos ventes et produits sont intacts).');
    } catch {
      toast.info('Cache nettoyé.');
    }
  };

  const pillars = [
    {
      title: '1. Propriété Exclusive (100% Marchand)',
      desc: 'Toutes vos données commerciales (prix d’achat, marges, chiffre d’affaires, fichier clients, dettes fournisseurs) vous appartiennent à 100%. Aucune donnée n’est exploitée ni partagée.',
      badge: 'Souveraineté Totale'
    },
    {
      title: '2. Conformité Loi Algérienne n° 18-07',
      desc: 'Traitement strictement limité à la gestion de caisse, facturation et fidélité de votre établissement, conformément à la Loi 18-07 sur la protection des données personnelles.',
      badge: 'Loi 18-07 Algérie'
    },
    {
      title: '3. Résilience Offline-First (Zéro Arrêt)',
      desc: 'Vos données sont d’abord enregistrées sur votre disque local (IndexedDB haute vitesse). Même sans Internet pendant plusieurs jours, la caisse fonctionne à 100%.',
      badge: '100% Autonome'
    },
    {
      title: '4. Chiffrement Militaire Bcrypt & TLS 1.3',
      desc: 'Les mots de passe et codes PIN caissiers sont hachés avec Bcrypt ($2a$/$2b$). Les transferts vers Supabase Cloud utilisent le chiffrement TLS 1.3 (AES-256).',
      badge: 'Bcrypt + TLS 1.3'
    },
    {
      title: '5. Portabilité & Export Ouvert (JSON/Excel)',
      desc: 'Vous n’êtes jamais prisonnier du logiciel : exportez en 1 clic la totalité de vos produits, ventes, clients et écritures en Excel (.xlsx), CSV ou archive JSON.',
      badge: 'Zéro Verrouillage'
    },
    {
      title: '6. Traçabilité & Immuabilité Comptable',
      desc: 'Chaque suppression, remise, retour ou modification de prix est horodaté dans le Journal d’Audit avec possibilité d’annulation (Rollback) par l’administrateur.',
      badge: 'Audit Intégral'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 text-left">
      {/* Bannière Principale : Souveraineté des Données & Confidentialité */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-wider text-white">
              <ShieldCheck size={14} /> Centre de Souveraineté Numérique & Confidentialité
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              Politique de Confidentialité & Souveraineté des Données
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              Vos données commerciales et financières restent sous votre contrôle exclusif. Architecture locale autonome <strong>Offline-First</strong>, chiffrement <strong>Bcrypt</strong> et portabilité complète.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => createBackupArchive()}
              className="px-4 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Download size={15} /> Exporter Archive de Souveraineté (.json)
            </button>
            <button
              type="button"
              onClick={handlePrintComplianceCertificate}
              className="px-4 py-3 bg-indigo-900/60 hover:bg-indigo-900 text-white border border-white/25 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={15} /> Certificat Officiel A4
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText size={15} /> Texte Juridique Complet
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de Bord de l'Empreinte de Vos Données en Direct */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[10px] font-black uppercase">Catalogue Local</span>
            <Package size={16} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{products.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Articles indexés sur PC</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase">Ventes & Tickets</span>
            <ShoppingCart size={16} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{transactions.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Transactions protégées</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] font-black uppercase">Fichier Clients</span>
            <Database size={16} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{customers.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Comptes & Points fidélité</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] font-black uppercase">Fournisseurs</span>
            <Server size={16} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{suppliers.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Partenaires & Soldes</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[10px] font-black uppercase">Chiffrement PIN</span>
            <KeyRound size={16} />
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1.5">Bcrypt $2a$</p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Session isolée active</p>
        </div>
      </div>

      {/* Les 6 Piliers de Souveraineté & Protection des Données */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
              Garanties de Souveraineté & Engagements de Sécurité
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Architecture technique vérifiable garantissant le secret commercial de votre établissement
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearImageCacheOnly}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            <RefreshCw size={13} /> Purger le cache temporaire d'images
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {p.badge}
                </span>
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{p.title}</h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Rapide des Raccourcis Clavier Caisse */}
      <Card className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <Keyboard size={18} className="text-indigo-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
            Aide-Mémoire : Raccourcis Clavier Rapides en Caisse (POS)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-black text-[11px]">F1 / F2</span>
            <p className="font-bold text-slate-800 dark:text-white mt-1.5">Encaissement Rapide</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Valider le ticket en espèces</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-black text-[11px]">Entrée</span>
            <p className="font-bold text-slate-800 dark:text-white mt-1.5">Ajout Code-Barres</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Scan instantané dans le panier</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono font-black text-[11px]">F4</span>
            <p className="font-bold text-slate-800 dark:text-white mt-1.5">Mise en Attente</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Parquer ou reprendre un ticket</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-black text-[11px]">Échap</span>
            <p className="font-bold text-slate-800 dark:text-white mt-1.5">Fermer / Annuler</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Fermer la fenêtre active</p>
          </div>
        </div>
      </Card>

      {/* Modal Texte Juridique Intégral */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="CHARTE JURIDIQUE DE CONFIDENTIALITÉ & SOUVERAINETÉ DES DONNÉES"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5 text-slate-700 dark:text-slate-300 text-xs leading-relaxed max-h-[72vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                Clause de Souveraineté Absolue du Commerçant
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px] mt-0.5">
                L'établissement utilisateur détient la propriété intellectuelle et matérielle exclusive de l'ensemble des enregistrements créés dans Nexus POS Pro.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">
              Article 1 — Conformité à la Loi Algérienne n° 18-07 & RGPD
            </h4>
            <p>
              Conformément aux dispositions de la Loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, les informations des clients et fournisseurs (nom, téléphone, solde, historique d'achats) sont collectées uniquement pour la facturation, le suivi des créances et le programme de fidélité interne du magasin.
            </p>

            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">
              Article 2 — Stockage Local Prioritaire (Offline-First) & Réplication Chiffrée
            </h4>
            <p>
              L'application stocke prioritairement les données dans la base locale chiffrée du poste de caisse (IndexedDB). Lorsque la synchronisation Cloud est activée, les données sont transmises via un tunnel TLS 1.3 chiffré vers la base dédiée Supabase Pro du projet (région sécurisée <code>eu-central-1</code>).
            </p>

            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">
              Article 3 — Protection des Identifiants & Hachage Bcrypt
            </h4>
            <p>
              Aucun code PIN ou mot de passe employé n'est stocké en clair. Tous les secrets d'authentification utilisent le hachage cryptographique salé <strong>bcrypt ($2a$/$2b$)</strong>. Les sessions actives résident en mémoire volatile (<code>sessionStorage</code>) et sont automatiquement purgées à la fermeture.
            </p>

            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">
              Article 4 — Droit de Portabilité, d'Archivage et d'Effacement
            </h4>
            <p>
              Depuis les modules <em>Paramètres</em> et <em>Clôture de Mois</em>, l'administrateur peut à tout moment télécharger une copie intégrale de ses données aux formats standards (JSON, CSV, Excel) ou purger définitivement une période comptable archivée.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={handlePrintComplianceCertificate}
              className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} /> Imprimer Certificat
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
