import React, { useState, useEffect } from 'react';
import { 
  diagnosticService, 
  DiagnosticEntry 
} from '../../services/DiagnosticLogService';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Trash2, 
  Search, 
  Terminal, 
  ShieldAlert, 
  Globe, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const DiagnosticMonitorTab: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'network'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = diagnosticService.subscribe((currentLogs) => {
      setLogs(currentLogs);
    });
    return unsubscribe;
  }, []);

  const handleCopyReport = () => {
    try {
      const text = diagnosticService.exportAsText();
      navigator.clipboard.writeText(text);
      toast.success("Rapport de diagnostic copié dans le presse-papiers !");
    } catch (_) {
      toast.error("Impossible de copier automatiquement dans le presse-papiers.");
    }
  };

  const handleClear = () => {
    if (confirm("Voulez-vous réinitialiser le journal des diagnostics ?")) {
      diagnosticService.clearLogs();
      toast.success("Journal des diagnostics vidé.");
    }
  };

  const handleSimulateTest = () => {
    // Injecter un échantillon de diagnostic pour tester
    diagnosticService.captureLog(
      'error',
      'network',
      'POST https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/suppliers?on_conflict=id 409 (Conflict)',
      { table: 'suppliers', id: 'sup_test_sample', on_conflict: 'id' }
    );
    diagnosticService.captureLog(
      'warn',
      'console',
      'The specified value "2026-10-30" does not conform to the required format. The format is "yyyy-MM-ddThh:mm".'
    );
    toast.success("Diagnostics de test générés avec succès !");
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'error' && log.level !== 'error') return false;
    if (filterLevel === 'warn' && log.level !== 'warn') return false;
    if (filterLevel === 'network' && log.source !== 'network' && !log.url) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (
        log.title.toLowerCase() + ' ' +
        log.significance.toLowerCase() + ' ' +
        log.rawMessage.toLowerCase() + ' ' +
        (log.code ? String(log.code).toLowerCase() : '')
      );
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;
  const networkCount = logs.filter(l => l.source === 'network' || l.url).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barre d'Introduction et Actions Clés */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Terminal size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              Journal des Diagnostics & Console F12
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white tracking-wider">
                Temps Réel
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              Toutes les erreurs techniques (conflits 409, sessions expirées 401, pertes de connexion, anomalies de date) sont automatiquement interceptées et traduites en langage clair sans avoir besoin d'ouvrir la console F12.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Copier l'historique complet pour assistance"
          >
            <Copy size={14} />
            <span>Copier le Rapport</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateTest}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Générer deux erreurs types pour tester l'analyseur"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Tester l'Analyseur</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
            title="Vider l'historique des diagnostics"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Cartes Compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterLevel('all')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            filterLevel === 'all' 
              ? "bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/30" 
              : "bg-black/40 border-white/5 hover:border-white/10"
          )}
        >
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Événements</span>
          <span className="text-2xl font-black text-white mt-1 font-mono block">{logs.length}</span>
        </button>

        <button
          onClick={() => setFilterLevel('error')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            filterLevel === 'error' 
              ? "bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/30" 
              : "bg-black/40 border-white/5 hover:border-white/10"
          )}
        >
          <span className="text-[10px] font-black uppercase text-rose-400 block tracking-wider">Erreurs (Critique)</span>
          <span className="text-2xl font-black text-rose-400 mt-1 font-mono block">{errorCount}</span>
        </button>

        <button
          onClick={() => setFilterLevel('warn')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            filterLevel === 'warn' 
              ? "bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/30" 
              : "bg-black/40 border-white/5 hover:border-white/10"
          )}
        >
          <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">Avertissements</span>
          <span className="text-2xl font-black text-amber-400 mt-1 font-mono block">{warnCount}</span>
        </button>

        <button
          onClick={() => setFilterLevel('network')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            filterLevel === 'network' 
              ? "bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/30" 
              : "bg-black/40 border-white/5 hover:border-white/10"
          )}
        >
          <span className="text-[10px] font-black uppercase text-blue-400 block tracking-wider">Échanges Réseau</span>
          <span className="text-2xl font-black text-blue-400 mt-1 font-mono block">{networkCount}</span>
        </button>
      </div>

      {/* Barre de Recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filtrer par code (409, 401), table (suppliers, customers), message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all font-medium"
        />
      </div>

      {/* Liste des Diagnostics */}
      {filteredLogs.length === 0 ? (
        <div className="p-10 text-center bg-black/30 border border-white/5 rounded-2xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={28} />
          </div>
          <h4 className="text-base font-black text-white uppercase tracking-wider">Aucune anomalie détectée</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {logs.length === 0 
              ? "Le système fonctionne parfaitement. Les requêtes réseau et les scripts s'exécutent sans aucune erreur."
              : "Aucun événement ne correspond à vos filtres actuels."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isError = entry.level === 'error';

            return (
              <div 
                key={entry.id}
                className={cn(
                  "rounded-2xl border transition-all p-4.5 space-y-3 shadow-md",
                  isError 
                    ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50" 
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                )}
              >
                {/* En-tête de la carte */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <span 
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-mono font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5",
                        isError ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      )}
                    >
                      {isError ? <AlertTriangle size={12} /> : <Info size={12} />}
                      {entry.code ? String(entry.code) : entry.level.toUpperCase()}
                    </span>

                    <h4 className="text-sm font-black text-white">
                      {entry.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <Clock size={12} className="text-slate-500" />
                    <span>{entry.timeFormatted}</span>
                  </div>
                </div>

                {/* Explication : C'est quoi exactement */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-slate-200 leading-relaxed">
                    <span className="font-bold text-indigo-400 shrink-0">📖 C'est quoi :</span>
                    <span>{entry.significance}</span>
                  </div>

                  <div className="flex items-start gap-2 text-emerald-300/90 leading-relaxed pt-1 border-t border-white/5">
                    <span className="font-bold text-emerald-400 shrink-0">🛡️ Action Nexus :</span>
                    <span>{entry.actionTaken}</span>
                  </div>
                </div>

                {/* Détails techniques dépliables */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>{isExpanded ? "Masquer les détails techniques (F12)" : "Voir le message technique brut (Console F12)"}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-black/80 border border-slate-800 space-y-2 text-[11px] font-mono text-slate-300 overflow-x-auto custom-scrollbar">
                      {entry.url && (
                        <div>
                          <span className="text-slate-500">URL : </span>
                          <span className="text-indigo-400 break-all">{entry.url}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Message brut : </span>
                        <pre className="text-amber-200 whitespace-pre-wrap break-all mt-1">{entry.rawMessage}</pre>
                      </div>
                      {entry.details && (
                        <div>
                          <span className="text-slate-500">Données associées : </span>
                          <pre className="text-slate-400 whitespace-pre-wrap break-all mt-1">{entry.details}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
