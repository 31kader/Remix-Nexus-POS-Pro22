import React from 'react';
import { Database, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card, Button } from '../ui';
import { isSupabaseConfigured } from '../../supabase';

interface DiagnosticHeaderProps {
  runDiagnostics: () => void;
  handleSyncNow: () => void;
  isSyncing: boolean;
  tablesLoading: boolean;
}

export function DiagnosticHeader({
  runDiagnostics,
  handleSyncNow,
  isSyncing,
  tablesLoading
}: DiagnosticHeaderProps) {
  return (
    <Card className="p-6 border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${isSupabaseConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Database size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Console de Diagnostic Supabase</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                isSupabaseConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isSupabaseConfigured ? 'Actif' : 'Non Configuré'}
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium mt-1">
              Vérification en temps réel de votre connexion cloud, de la structure des schémas SQL PostgreSQL et des verrous de sécurité RLS.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={!isSupabaseConfigured}
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-xs text-white uppercase font-black tracking-widest gap-2 py-2"
          >
            <RefreshCw size={14} className={tablesLoading ? 'animate-spin' : ''} />
            Re-Tester
          </Button>
          <Button 
            onClick={handleSyncNow}
            disabled={!isSupabaseConfigured || isSyncing}
            className="industrial-button-primary uppercase font-black text-[10px] tracking-widest gap-2 py-2 px-4 shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Forcer Synchro
          </Button>
        </div>
      </div>

      {/* Credentials Status alert if unconfigured */}
      {!isSupabaseConfigured && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <p className="font-bold text-xs">Clés de Securité d'Environnement Manquantes</p>
          </div>
          <p className="text-[11px] leading-relaxed">
            L'application tourne actuellement en mode <b>Émulateur hors-ligne local (Local Storage)</b>. Vos données ne sont pas sauvegardées sur le Cloud de Supabase.
          </p>
          <div className="pt-1 text-[11px] space-y-1">
            <p>👉 Pour lier l'application à votre compte Supabase :</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Allez dans le menu <b>Settings</b> d'AI Studio (icône d'engrenage en haut à droite).</li>
              <li>Ajoutez deux clés secrètes d'environnement :
                <ul className="list-disc pl-4 mt-0.5 font-mono text-white/70">
                  <li><code className="text-indigo-300">VITE_SUPABASE_URL</code> : URL de votre projet Supabase.</li>
                  <li><code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code> : Clé d'API publique ("anon").</li>
                </ul>
              </li>
              <li>Cliquez sur <b>Restart Dev Server</b> si nécessaire pour appliquer.</li>
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
}
