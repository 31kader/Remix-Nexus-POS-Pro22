import React, { useState } from 'react';
import { Card } from './ui';
import { ShieldCheck, Download, Printer, FileText, Keyboard } from 'lucide-react';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { createBackupArchive } from '../services/backupRestoreService';
import { toast } from 'sonner';
import { printComplianceCertificate } from './help/printComplianceCertificate';
import { PrivacyPillarsSection } from './help/PrivacyPillarsSection';
import { PrivacyCharterModal } from './help/PrivacyCharterModal';
import { HelpDataFootprintKpis } from './help/HelpDataFootprintKpis';

export function Help() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const products = useCoreStore(s => s.products) || [];
  const settings = useCoreStore(s => s.settings) || ({} as any);
  const transactions = useTransactionStore(s => s.transactions) || [];
  const customers = usePeopleStore(s => s.customers) || [];
  const suppliers = usePeopleStore(s => s.suppliers) || [];
  const auditLogs = useFinanceStore(s => s.auditLogs) || [];

  const handlePrintCertificate = () => {
    printComplianceCertificate({
      settings,
      products,
      transactions,
      customers,
      suppliers,
      auditLogsCount: auditLogs.length
    });
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
              onClick={handlePrintCertificate}
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
      <HelpDataFootprintKpis
        productsCount={products.length}
        transactionsCount={transactions.length}
        customersCount={customers.length}
        suppliersCount={suppliers.length}
      />

      {/* Les 6 Piliers de Souveraineté & Protection des Données */}
      <PrivacyPillarsSection onClearImageCacheOnly={handleClearImageCacheOnly} />

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
      <PrivacyCharterModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onPrintCertificate={handlePrintCertificate}
      />
    </div>
  );
}

export default Help;
