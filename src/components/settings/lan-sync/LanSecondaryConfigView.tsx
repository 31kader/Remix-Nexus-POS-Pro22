import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LanSecondaryConfigViewProps {
  inputMasterIp: string;
  onMasterIpChange: (val: string) => void;
  inputMasterPort: number;
  onMasterPortChange: (val: number) => void;
  onTestConnection: () => void;
  isTesting: boolean;
  isLanConnected: boolean;
  latencyMs: number | null;
  testResult: { success?: boolean; message?: string; latency?: number } | null;
}

export const LanSecondaryConfigView: React.FC<LanSecondaryConfigViewProps> = ({
  inputMasterIp,
  onMasterIpChange,
  inputMasterPort,
  onMasterPortChange,
  onTestConnection,
  isTesting,
  isLanConnected,
  latencyMs,
  testResult
}) => {
  return (
    <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-black text-cyan-900 dark:text-cyan-300 uppercase tracking-widest ml-1">
            Adresse IP de la Caisse Maître
          </label>
          <input
            type="text"
            value={inputMasterIp}
            onChange={e => onMasterIpChange(e.target.value)}
            placeholder="Ex: 192.168.1.50 ou 10.0.0.5"
            className="w-full h-11 bg-white dark:bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-cyan-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-cyan-900 dark:text-cyan-300 uppercase tracking-widest ml-1">
            Port Réseau
          </label>
          <input
            type="number"
            value={inputMasterPort}
            onChange={e => onMasterPortChange(parseInt(e.target.value, 10) || 3000)}
            placeholder="3000"
            className="w-full h-11 bg-white dark:bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-cyan-500 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onTestConnection}
          disabled={isTesting}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={cn(isTesting && "animate-spin")} />
          {isTesting ? 'Test de liaison en cours...' : 'Tester la connexion vers la Caisse Maître'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-zinc-400">Statut actuel :</span>
          {isLanConnected ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} /> Connecté au Maître ({latencyMs || '<5'} ms)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
              <AlertCircle size={14} /> Déconnecté (En attente)
            </span>
          )}
        </div>
      </div>

      {testResult && (
        <div className={cn(
          "p-3 rounded-xl border text-xs font-medium",
          testResult.success
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
            : "bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-800 dark:text-rose-200"
        )}>
          {testResult.message}
        </div>
      )}
    </div>
  );
};
