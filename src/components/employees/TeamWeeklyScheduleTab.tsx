import React, { useState } from 'react';
import { Sun, Moon, Clock } from 'lucide-react';
import { CompanySettings } from '../../types';
import { Card } from '../ui';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export const DAYS_OF_WEEK = [
  { key: 'dim', label: 'Dimanche', short: 'DIM' },
  { key: 'lun', label: 'Lundi', short: 'LUN' },
  { key: 'mar', label: 'Mardi', short: 'MAR' },
  { key: 'mer', label: 'Mercredi', short: 'MER' },
  { key: 'jeu', label: 'Jeudi', short: 'JEU' },
  { key: 'ven', label: 'Vendredi', short: 'VEN' },
  { key: 'sam', label: 'Samedi', short: 'SAM' }
];

export type ShiftSlot = 'matin' | 'soir' | 'journee' | 'repos';

export const SHIFT_META: Record<ShiftSlot, { label: string; hours: string; badgeClass: string; next: ShiftSlot }> = {
  matin: {
    label: '🌅 Matin',
    hours: '08h00 - 16h00',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    next: 'soir'
  },
  soir: {
    label: '🌆 Soir',
    hours: '16h00 - 00h00',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    next: 'journee'
  },
  journee: {
    label: '☀️ Journée',
    hours: '09h00 - 18h00',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    next: 'repos'
  },
  repos: {
    label: '🏖️ Repos',
    hours: 'Congé / Off',
    badgeClass: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
    next: 'matin'
  }
};

const SCHEDULE_STORAGE_KEY = 'nexus_team_weekly_schedule_v1';

export function printWeeklyScheduleDocument(
  staffMembers: Array<{ id: string; name: string; role: string }>,
  schedule: Record<string, Record<string, ShiftSlot>>,
  companyName: string
) {
  const getSlot = (memberId: string, dayKey: string): ShiftSlot => {
    return schedule[memberId]?.[dayKey] || (dayKey === 'ven' ? 'repos' : 'journee');
  };

  const rowsHtml = staffMembers
    .map(m => {
      const cells = DAYS_OF_WEEK.map(d => {
        const slot = getSlot(m.id, d.key);
        const meta = SHIFT_META[slot];
        return `<td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-size:12px;">
          <strong>${meta.label}</strong><br/><span style="font-size:10px;color:#64748b;">${meta.hours}</span>
        </td>`;
      }).join('');
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:10px;font-weight:bold;">${m.name}<br/><span style="font-size:11px;color:#4f46e5;">${m.role}</span></td>
        ${cells}
      </tr>`;
    })
    .join('');

  let iframe = document.getElementById('nexus-planning-print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'nexus-planning-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Planning Hebdomadaire — ${companyName || 'Nexus POS Pro'}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: system-ui, sans-serif; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #1e1b4b; color: white; padding: 10px; font-size: 12px; border: 1px solid #1e1b4b; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f46e5;padding-bottom:10px;">
          <div>
            <h1 style="margin:0;font-size:22px;">PLANNING HEBDOMADAIRE DES ÉQUIPES</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#475569;">${companyName || 'Magasin'} — Semaine en cours (Dimanche au Samedi)</p>
          </div>
          <div style="font-size:12px;color:#64748b;">Imprimé le ${new Date().toLocaleDateString('fr-DZ')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">EMPLOYÉ / POSTE</th>
              ${DAYS_OF_WEEK.map(d => `<th>${d.label.toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (_) {}
  }, 150);
}

interface TeamWeeklyScheduleTabProps {
  staffMembers: Array<{ id: string; name: string; role: string; phone?: string }>;
  settings: CompanySettings;
  schedule: Record<string, Record<string, ShiftSlot>>;
  onScheduleChange: (updated: Record<string, Record<string, ShiftSlot>>) => void;
}

export const TeamWeeklyScheduleTab: React.FC<TeamWeeklyScheduleTabProps> = ({
  staffMembers,
  schedule,
  onScheduleChange
}) => {
  const getMemberSlot = (memberId: string, dayKey: string): ShiftSlot => {
    return schedule[memberId]?.[dayKey] || (dayKey === 'ven' ? 'repos' : 'journee');
  };

  const cycleMemberSlot = (memberId: string, dayKey: string) => {
    const current = getMemberSlot(memberId, dayKey);
    const nextSlot = SHIFT_META[current].next;
    const updated = {
      ...schedule,
      [memberId]: {
        ...(schedule[memberId] || {}),
        [dayKey]: nextSlot
      }
    };
    onScheduleChange(updated);
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const applyTemplateToMember = (memberId: string, template: ShiftSlot) => {
    const row: Record<string, ShiftSlot> = {};
    for (const d of DAYS_OF_WEEK) {
      row[d.key] = d.key === 'ven' ? 'repos' : template;
    }
    const updated = { ...schedule, [memberId]: row };
    onScheduleChange(updated);
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
      toast.success('Planning mis à jour pour cet employé.');
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Legend & Help Bar */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-700 dark:text-zinc-200">
          <strong className="text-indigo-600 dark:text-indigo-400 uppercase">À quoi sert cet écran ?</strong> Cliquez sur n'importe quelle case d'un jour pour changer le créneau horaire de l'employé (<strong>Matin 08h-16h → Soir 16h-00h → Journée 09h-18h → Repos</strong>), puis imprimez la feuille A4 pour l'afficher en magasin.
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(Object.keys(SHIFT_META) as ShiftSlot[]).map(k => (
            <span key={k} className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border", SHIFT_META[k].badgeClass)}>
              {SHIFT_META[k].label} ({SHIFT_META[k].hours})
            </span>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800">
                <th className="p-4 text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase min-w-[200px]">
                  Membre de l'Équipe
                </th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day.key} className="p-3 text-center text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase min-w-[115px]">
                    {day.label}
                  </th>
                ))}
                <th className="p-3 text-right text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase min-w-[130px]">
                  Affectation Rapide
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {staffMembers.map(member => {
                const activeDaysCount = DAYS_OF_WEEK.filter(d => getMemberSlot(member.id, d.key) !== 'repos').length;
                return (
                  <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                          {String(member?.name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white">{member.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">{member.role}</span>
                            <span className="text-[10px] text-slate-400">• {activeDaysCount}j/7 travaillés</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {DAYS_OF_WEEK.map(day => {
                      const slot = getMemberSlot(member.id, day.key);
                      const meta = SHIFT_META[slot];
                      return (
                        <td key={day.key} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => cycleMemberSlot(member.id, day.key)}
                            className={cn(
                              "w-full py-2 px-2 rounded-xl border text-center transition-transform active:scale-95 cursor-pointer",
                              meta.badgeClass
                            )}
                            title="Cliquez pour changer le créneau horaire"
                          >
                            <div className="text-xs font-black">{meta.label}</div>
                            <div className="text-[10px] opacity-80 font-medium mt-0.5">{meta.hours}</div>
                          </button>
                        </td>
                      );
                    })}

                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyTemplateToMember(member.id, 'matin')}
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white text-[10px] font-bold cursor-pointer"
                          title="Tout passer en équipe du Matin (Ven. repos)"
                        >
                          <Sun size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplateToMember(member.id, 'soir')}
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] font-bold cursor-pointer"
                          title="Tout passer en équipe du Soir (Ven. repos)"
                        >
                          <Moon size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplateToMember(member.id, 'journee')}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-bold cursor-pointer"
                          title="Tout passer en Journée complète (Ven. repos)"
                        >
                          <Clock size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
