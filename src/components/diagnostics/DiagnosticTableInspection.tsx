import React from 'react';
import { CheckCircle, HelpCircle, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Card } from '../ui';
import { isSupabaseConfigured } from '../../supabase';
import { TableStatus } from '../useSupabaseDiagnosticsLogic';

interface DiagnosticTableInspectionProps {
  tables: TableStatus[];
  anyError: boolean;
}

export function DiagnosticTableInspection({ tables, anyError }: DiagnosticTableInspectionProps) {
  if (!isSupabaseConfigured) return null;

  return (
    <Card className="p-6 border-white/5 bg-slate-900/40">
      <h4 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">Inspection des Tables Cloud (Supabase)</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {tables.map(t => (
          <div 
            key={t.mappedName} 
            className={`p-3 rounded-xl border flex flex-col justify-between h-24 transition-all duration-300 ${
              t.loading 
                ? 'border-white/5 bg-slate-900/10 animate-pulse'
                : t.error
                  ? 'border-rose-500/20 bg-rose-500/5'
                  : t.count !== null && t.count > 0
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-white/5 bg-slate-900/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black text-white leading-tight">{t.name}</p>
                <p className="text-[9px] font-mono text-white/40 mt-0.5">{t.mappedName}</p>
              </div>
              {t.loading ? (
                <RefreshCw size={12} className="animate-spin text-indigo-400 mt-1" />
              ) : t.error ? (
                <XCircle size={14} className="text-rose-400 mt-1" />
              ) : t.count !== null && t.count > 0 ? (
                <CheckCircle size={14} className="text-emerald-400 mt-1" />
              ) : (
                <HelpCircle size={14} className="text-amber-400/50 mt-1" />
              )}
            </div>

            <div className="mt-2">
              {t.loading ? (
                <span className="text-[10px] text-white/30 font-medium">Chargement...</span>
              ) : t.error ? (
                <div className="group relative">
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded truncate cursor-help block max-w-full">
                    Erreur Table ❌
                  </span>
                  <div className="absolute bottom-6 left-0 right-0 z-50 p-2 bg-slate-950 text-white text-[8px] rounded-lg border border-rose-500/20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal leading-normal max-h-24 overflow-y-auto no-scrollbar">
                    {t.error}
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className={`text-base font-black font-mono leading-none ${t.count !== null && t.count > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {t.count}
                  </span>
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-wide">Ligne(s)</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {anyError && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-300">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-xs uppercase tracking-tight">Problème d'Accés Détecté !</p>
              <p className="text-[11px] leading-relaxed text-rose-300/80">
                Une ou plusieurs tables rapportent une erreur. Cela signifie généralement deux choses :
              </p>
              <ul className="text-[10px] list-disc pl-4 mt-1 leading-relaxed text-rose-400 font-bold space-y-0.5">
                <li>La table n'a pas encore été créée dans votre console Supabase SQL Editor.</li>
                <li>Le Row Level Security (RLS) est activé, mais aucune politique d'accès n'existe pour autoriser l'API publique à y accéder.</li>
              </ul>
              <p className="text-[11px] mt-2 font-medium">👇 Déroulez la section d'aide ci-dessous pour résoudre l'erreur instantanément avec l'éditeur SQL de Supabase.</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
