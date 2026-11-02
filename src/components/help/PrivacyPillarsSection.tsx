import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export const PILLARS = [
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

interface PrivacyPillarsSectionProps {
  onClearImageCacheOnly: () => Promise<void>;
}

export const PrivacyPillarsSection: React.FC<PrivacyPillarsSectionProps> = ({
  onClearImageCacheOnly
}) => {
  return (
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
          onClick={onClearImageCacheOnly}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 cursor-pointer"
        >
          <RefreshCw size={13} /> Purger le cache temporaire d'images
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILLARS.map((p, idx) => (
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
  );
};
