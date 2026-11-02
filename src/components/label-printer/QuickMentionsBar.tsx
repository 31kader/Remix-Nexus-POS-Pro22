import React from 'react';
import { Store, Tag, Calendar } from 'lucide-react';
import { A4_STICKER_SHEETS } from './a4StickerSheets';

export interface QuickMentionsBarProps {
  printMedium: 'thermal' | 'a4_sheet';
  selectedA4Sheet: string;
  setSelectedA4Sheet: (sheet: string) => void;
  startOffset: number;
  setStartOffset: (offset: number) => void;
  packDate: string;
  setPackDate: (date: string) => void;
  expDate: string;
  setExpDate: (date: string) => void;
  applyQuickMention: (type: 'store' | 'dates' | 'promo') => void;
}

export function QuickMentionsBar({
  printMedium,
  selectedA4Sheet,
  setSelectedA4Sheet,
  startOffset,
  setStartOffset,
  packDate,
  setPackDate,
  expDate,
  setExpDate,
  applyQuickMention
}: QuickMentionsBarProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
      {printMedium === 'a4_sheet' ? (
        <div className="lg:col-span-7 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
              Format de la Planche A4 Autocollante
            </label>
            <select
              value={selectedA4Sheet}
              onChange={e => setSelectedA4Sheet(e.target.value)}
              className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              {A4_STICKER_SHEETS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
              Commencer à la case N°
            </label>
            <input
              type="number"
              min={1}
              max={65}
              value={startOffset}
              onChange={e => setStartOffset(Math.max(1, Number(e.target.value) || 1))}
              className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-black text-slate-900 dark:text-white"
              title="Permet de réutiliser une feuille A4 dont les premières étiquettes ont déjà été décollées"
            />
          </div>
        </div>
      ) : (
        <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 mr-1">
            Ajouts Rapides :
          </span>
          <button
            type="button"
            onClick={() => applyQuickMention('store')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Store size={13} /> + Nom du Magasin
          </button>
          <button
            type="button"
            onClick={() => applyQuickMention('promo')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Tag size={13} /> + Bandeau PROMO
          </button>
        </div>
      )}

      {/* FAB / EXP Date Stamp Generator for Repackaged Goods */}
      <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={packDate}
          onChange={e => setPackDate(e.target.value)}
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white"
          title="Date d'emballage (FAB)"
        />
        <input
          type="date"
          value={expDate}
          onChange={e => setExpDate(e.target.value)}
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white"
          title="Date d'expiration (EXP)"
        />
        <button
          type="button"
          onClick={() => applyQuickMention('dates')}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Calendar size={13} /> Appliquer FAB/EXP
        </button>
      </div>
    </div>
  );
}
