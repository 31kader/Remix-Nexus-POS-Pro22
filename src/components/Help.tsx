import React, { useState } from 'react';
import { Card, Modal } from './ui';
import { ShoppingCart, Package, BarChart3, ShieldCheck, Lock, CheckCircle2, FileText } from 'lucide-react';

export function Help() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const sections = [
    {
      title: "Point de Vente (POS)",
      icon: <ShoppingCart size={24} className="text-indigo-500" />,
      content: "Utilisez le POS pour effectuer des ventes. Vous pouvez scanner des articles, appliquer des remises et choisir différents modes de paiement."
    },
    {
      title: "Gestion d'Inventaire",
      icon: <Package size={24} className="text-emerald-500" />,
      content: "Gérez vos produits, suivez les niveaux de stock et recevez des alertes de stock faible. Vous pouvez également importer/exporter vos données via CSV/Excel."
    },
    {
      title: "Rapports & Analyses",
      icon: <BarChart3 size={24} className="text-amber-500" />,
      content: "Consultez vos performances de vente, vos bénéfices et vos dépenses en temps réel grâce au tableau de bord analytique."
    },
    {
      title: "Sécurité & Confidentialité",
      icon: <ShieldCheck size={24} className="text-rose-500" />,
      content: "Vos données restent 100% vôtres. Stockage local chiffré (IndexedDB), synchronisation sécurisée TLS vers Supabase Pro, et traçabilité d'audit."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-5">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Centre d'Aide & Confidentialité</h2>
        <p className="text-lg text-slate-500 dark:text-slate-400">Tout ce que vous devez savoir pour maîtriser votre portail et sécuriser vos données.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <Card key={`help-section-${idx}`} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {section.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{section.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{section.content}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-indigo-600 text-white text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
          <Lock size={24} className="text-white" />
        </div>
        <h3 className="text-2xl font-black tracking-tight uppercase">Politique de Confidentialité & Souveraineté des Données</h3>
        <p className="text-indigo-100 max-w-xl mx-auto text-sm">
          Nexus POS Pro est conçu selon les standards les plus stricts de sécurité : architecture Offline-First, chiffrement local, aucune exploitation commerciale de vos données.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <button 
            onClick={() => setIsPrivacyModalOpen(true)}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg active:scale-95"
          >
            <FileText size={16} /> Lire la Politique de Confidentialité
          </button>
        </div>
      </Card>

      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="POLITIQUE DE CONFIDENTIALITÉ & SÉCURITÉ DES DONNÉES"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6 text-slate-300 text-xs leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300 text-sm">Vos données vous appartiennent intégralement</p>
              <p className="text-emerald-400/80 text-[11px] mt-0.5">Nexus POS Pro ne vend, n'exploite, ni ne partage aucune de vos données financières, d'inventaire ou de caisse avec des tiers.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">1. Architecture Hors-Ligne (Offline-First)</h4>
              <p className="text-slate-400">
                Toutes les ventes, catalogues de produits, stocks et mouvements sont stockés localement sur votre poste de travail via une base de données locale chiffrée (IndexedDB / LocalStorage sécurisé). Vous conservez une autonomie complète sans dépendre d'une connexion permanente.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">2. Chiffrement & Synchronisation Sécurisée</h4>
              <p className="text-slate-400">
                La synchronisation avec votre espace Supabase Pro s'effectue exclusivement par des protocoles chiffrés TLS 1.3 / SSL 256 bits. Les mots de passe et codes PIN de caisse sont irréversiblement hachés en utilisant l'algorithme standard bcrypt ($2a$/$2b$).
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">3. Sauvegardes & Traçabilité</h4>
              <p className="text-slate-400">
                Le système enregistre des journaux d'audit horodatés pour chaque opération critique (annulations, suppressions, clôtures de caisse). Vous pouvez à tout moment exporter un instantané complet ou partiel de vos données aux formats Excel (.xlsx), CSV ou JSON.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">4. Conformité & Licence</h4>
              <p className="text-slate-400">
                L'utilisation de Nexus POS Pro est régie par le Contrat de Licence Utilisateur Final accepté lors de l'installation de l'application sur Windows.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setIsPrivacyModalOpen(false)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
