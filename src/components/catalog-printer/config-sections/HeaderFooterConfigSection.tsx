import React from 'react';
import { cn } from '../../../lib/utils';
import { THEME_PRESETS } from '../types';

export interface HeaderFooterConfigSectionProps {
  themeColor: string;
  setThemeColor: (t: string) => void;
  title: string;
  setTitle: (t: string) => void;
  subtitle: string;
  setSubtitle: (s: string) => void;
  contactPhone: string;
  setContactPhone: (p: string) => void;
  validityBanner: string;
  setValidityBanner: (b: string) => void;
  headerQrLink: string;
  setHeaderQrLink: (l: string) => void;
  showHeaderQr: boolean;
  setShowHeaderQr: (v: boolean) => void;
  footerText: string;
  setFooterText: (t: string) => void;
  showHeader: boolean;
  setShowHeader: (v: boolean) => void;
  showFooter: boolean;
  setShowFooter: (v: boolean) => void;
  showDate: boolean;
  setShowDate: (v: boolean) => void;
  showLogo: boolean;
  setShowLogo: (v: boolean) => void;
}

export const HeaderFooterConfigSection: React.FC<HeaderFooterConfigSectionProps> = ({
  themeColor,
  setThemeColor,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  contactPhone,
  setContactPhone,
  validityBanner,
  setValidityBanner,
  headerQrLink,
  setHeaderQrLink,
  showHeaderQr,
  setShowHeaderQr,
  footerText,
  setFooterText,
  showHeader,
  setShowHeader,
  showFooter,
  setShowFooter,
  showDate,
  setShowDate,
  showLogo,
  setShowLogo
}) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
          Couleur Thème du Catalogue A4
        </label>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeColor(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-transform',
                t.class,
                themeColor === t.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'opacity-80'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Titre du Catalogue</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sous-titre / Slogan</label>
          <input
            type="text"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tél / WhatsApp Commandes</label>
          <input
            type="text"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
          Bannière Promo / Validité (Optionnelle)
        </label>
        <input
          type="text"
          value={validityBanner}
          onChange={e => setValidityBanner(e.target.value)}
          placeholder="Ex: OFFRES VALABLES JUSQU'AU 31 DÉCEMBRE — DANS LA LIMITE DES STOCKS DISPONIBLES"
          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
        />
      </div>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
            Lien QR Code En-Tête (WhatsApp ou Boutique)
          </label>
          <input
            type="checkbox"
            checked={showHeaderQr}
            onChange={e => setShowHeaderQr(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
        </div>
        {showHeaderQr && (
          <input
            type="text"
            value={headerQrLink}
            onChange={e => setHeaderQrLink(e.target.value)}
            placeholder="https://wa.me/213xxxxxxxxx ou lien catalogue"
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
          />
        )}
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Texte Pied de Page A4</label>
        <input
          type="text"
          value={footerText}
          onChange={e => setFooterText(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {[
          { label: 'Afficher En-tête', val: showHeader, set: setShowHeader },
          { label: 'Afficher Pied', val: showFooter, set: setShowFooter },
          { label: 'Afficher Date', val: showDate, set: setShowDate },
          { label: 'Afficher Logo', val: showLogo, set: setShowLogo }
        ].map((t, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold cursor-pointer"
          >
            <input
              type="checkbox"
              checked={t.val}
              onChange={e => t.set(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded"
            />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
