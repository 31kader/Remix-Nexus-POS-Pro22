import React from 'react';
import { Modal } from '../ui';
import { CheckCircle2, Printer } from 'lucide-react';

interface PrivacyCharterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintCertificate: () => void;
}

export const PrivacyCharterModal: React.FC<PrivacyCharterModalProps> = ({
  isOpen,
  onClose,
  onPrintCertificate
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
            onClick={onPrintCertificate}
            className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} /> Imprimer Certificat
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
