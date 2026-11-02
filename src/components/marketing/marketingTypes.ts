import React from 'react';
import { Tag, Star, Zap, ArrowDown, Award, CheckCircle } from 'lucide-react';

export type PosterType = 'promo' | 'new' | 'flash' | 'clearance' | 'bestseller' | 'premium';
export type PosterFormat = 'a4-portrait' | 'a4-landscape' | 'shelf-tag' | 'social-square';

export interface PosterTheme {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bgGradient: string;
  bgHex: string;
  badgeDefault: string;
  badgeStyle: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
}

export const MARKETING_THEMES: Record<PosterType, PosterTheme> = {
  promo: {
    label: 'Promotion Choc',
    icon: Tag,
    bgGradient: 'from-rose-600 via-rose-700 to-red-800',
    bgHex: '#e11d48',
    badgeDefault: 'OFFRE SPÉCIALE',
    badgeStyle: 'bg-amber-300 text-black border-amber-400 shadow-amber-900/30',
    textPrimary: 'text-white',
    textSecondary: 'text-rose-100',
    accent: 'text-amber-300',
    border: 'border-rose-400/30'
  },
  new: {
    label: 'Nouveauté',
    icon: Star,
    bgGradient: 'from-indigo-600 via-indigo-700 to-purple-800',
    bgHex: '#4f46e5',
    badgeDefault: 'NOUVEL ARRIVAGE',
    badgeStyle: 'bg-white text-indigo-700 border-white/40 shadow-indigo-950/30',
    textPrimary: 'text-white',
    textSecondary: 'text-indigo-100',
    accent: 'text-indigo-200',
    border: 'border-indigo-400/30'
  },
  flash: {
    label: 'Vente Flash',
    icon: Zap,
    bgGradient: 'from-amber-400 via-amber-500 to-yellow-600',
    bgHex: '#f59e0b',
    badgeDefault: 'VENTE FLASH ⚡',
    badgeStyle: 'bg-black text-amber-400 border-black/40 shadow-black/20',
    textPrimary: 'text-slate-950',
    textSecondary: 'text-slate-900',
    accent: 'text-black',
    border: 'border-amber-600/30'
  },
  clearance: {
    label: 'Déstockage',
    icon: ArrowDown,
    bgGradient: 'from-slate-950 via-zinc-900 to-neutral-950',
    bgHex: '#09090b',
    badgeDefault: 'LIQUIDATION TOTALE',
    badgeStyle: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-yellow-300 font-black',
    textPrimary: 'text-white',
    textSecondary: 'text-zinc-400',
    accent: 'text-yellow-400',
    border: 'border-zinc-700'
  },
  bestseller: {
    label: 'Top Vente',
    icon: Award,
    bgGradient: 'from-emerald-600 via-teal-700 to-emerald-900',
    bgHex: '#059669',
    badgeDefault: 'N°1 DES VENTES 🏆',
    badgeStyle: 'bg-white text-emerald-800 border-emerald-200 shadow-emerald-950/20',
    textPrimary: 'text-white',
    textSecondary: 'text-emerald-100',
    accent: 'text-emerald-200',
    border: 'border-emerald-400/30'
  },
  premium: {
    label: '100% Original',
    icon: CheckCircle,
    bgGradient: 'from-cyan-600 via-blue-700 to-slate-900',
    bgHex: '#0284c7',
    badgeDefault: 'PRODUIT CERTIFIÉ CONFORME',
    badgeStyle: 'bg-cyan-300 text-blue-950 border-cyan-200 shadow-cyan-950/20',
    textPrimary: 'text-white',
    textSecondary: 'text-cyan-100',
    accent: 'text-cyan-300',
    border: 'border-cyan-400/30'
  }
};
