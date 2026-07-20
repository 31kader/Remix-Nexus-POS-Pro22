import React from 'react';
import { BookOpen, ChevronDown, ChevronUp, Code, Copy, Layers, Lock, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button } from '../ui';

interface DiagnosticSQLGuidesProps {
  activeSection: string | null;
  setActiveSection: (s: string | null) => void;
  sqlCreateTables: string;
  sqlMigrationTables: string;
  sqlDisableRLS: string;
  sqlEnableRLSPublic: string;
  sqlDropTables: string;
  handleCopy: (text: string, description: string) => void;
}

export function DiagnosticSQLGuides({
  activeSection,
  setActiveSection,
  sqlCreateTables,
  sqlMigrationTables,
  sqlDisableRLS,
  sqlEnableRLSPublic,
  sqlDropTables,
  handleCopy
}: DiagnosticSQLGuidesProps) {
  return (
    <Card className="p-6 border-white/5 bg-slate-900/20">
      <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-indigo-400" />
        Guides de Configuration & Scripts SQL Supabase
      </h4>

      <div className="space-y-2">
        {/* Item 1: Create Tables */}
        <div className="border border-white/[0.03] rounded-xl overflow-hidden bg-slate-950/40">
          <button 
            onClick={() => setActiveSection(activeSection === 'tables' ? null : 'tables')}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-white hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Code size={14} className="text-cyan-400" />
              1. Créer les Tables SQL de Base (Nouvelle configuration)
            </span>
            {activeSection === 'tables' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {activeSection === 'tables' && (
            <div className="p-4 border-t border-white/[0.03] space-y-3 bg-slate-950/80">
              <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                Copiez ce script SQL, ouvrez le <b>SQL Editor</b> dans votre tableau de bord Supabase, cliquez sur <b>New Query</b>, collez-le et cliquez sur <b>Run</b> :
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono text-cyan-300 bg-black/60 p-4 rounded-xl overflow-x-auto max-h-60 border border-white/5 whitespace-pre">
                  {sqlCreateTables}
                </pre>
                <Button 
                  onClick={() => handleCopy(sqlCreateTables, 'Script de création de table')}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[9px] font-black uppercase tracking-widest gap-1 flex items-center h-auto"
                >
                  <Copy size={10} /> Copier
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Item 2: Migration (Add missing columns to existing tables) */}
        <div className="border border-indigo-500/20 rounded-xl overflow-hidden bg-indigo-950/20">
          <button 
            onClick={() => setActiveSection(activeSection === 'migration' ? null : 'migration')}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-indigo-300 hover:bg-indigo-950/40"
          >
            <span className="flex items-center gap-2">
              <Layers size={14} className="text-indigo-400" />
              2. SCRIPT DE MIGRATION : Ajouter les colonnes manquantes (Résout les erreurs 400 et 500)
            </span>
            {activeSection === 'migration' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {activeSection === 'migration' && (
            <div className="p-4 border-t border-indigo-500/10 space-y-3 bg-slate-950/80">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-[11px] leading-relaxed">
                💡 <b>Pourquoi cette étape est incontournable ?</b> Si vous obtenez des erreurs <b>400 Bad Request</b>, <b>409 Conflict</b> ou <b>500 Internal Server Error</b> lors de la synchronisation, cela signifie que vos tables réelles n'ont pas encore les bonnes colonnes ou que les index de conflit (ID) sont bloqués. Copiez et exécutez ce script pour mettre à jour la structure sans perdre de données.
              </div>
              <div className="relative">
                <pre className="text-[10px] font-mono text-indigo-300 bg-black/60 p-4 rounded-xl overflow-x-auto max-h-60 border border-white/5 whitespace-pre">
                  {sqlMigrationTables}
                </pre>
                <Button 
                  onClick={() => handleCopy(sqlMigrationTables, 'Script de migration de table')}
                  className="absolute top-2 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase tracking-widest gap-1 flex items-center h-auto"
                >
                  <Copy size={10} /> Copier
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Item 3: Disable RLS for testing */}
        <div className="border border-white/[0.03] rounded-xl overflow-hidden bg-slate-950/40">
          <button 
            onClick={() => setActiveSection(activeSection === 'rls_disable' ? null : 'rls_disable')}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-white hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Lock size={14} className="text-amber-400" />
              3. Désactiver le RLS (Recommandé pour tester)
            </span>
            {activeSection === 'rls_disable' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {activeSection === 'rls_disable' && (
            <div className="p-4 border-t border-white/[0.03] space-y-3 bg-slate-950/80">
              <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                Par défaut, Supabase bloque toutes les requêtes si le RLS est activé mais qu'aucune règle de droit n'est définie. 
                Désactivez temporairement la sécurité (RLS) sur vos tables pour vérifier si les erreurs d'accès proviennent de là :
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono text-amber-300 bg-black/60 p-4 rounded-xl overflow-x-auto border border-white/5">
                  {sqlDisableRLS}
                </pre>
                <Button 
                  onClick={() => handleCopy(sqlDisableRLS, 'Script de désactivation RLS')}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[9px] font-black uppercase tracking-widest gap-1 flex items-center h-auto"
                >
                  <Copy size={10} /> Copier
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Item 4: Enable RLS and add public SELECT */}
        <div className="border border-white/[0.03] rounded-xl overflow-hidden bg-slate-950/40">
          <button 
            onClick={() => setActiveSection(activeSection === 'rls_public' ? null : 'rls_public')}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-white hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              4. Activer RLS avec accès Lecture Publique (Sécurité Production)
            </span>
            {activeSection === 'rls_public' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {activeSection === 'rls_public' && (
            <div className="p-4 border-t border-white/[0.03] space-y-3 bg-slate-950/80">
              <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                Pour sécuriser votre application tout en restant capable de lire et ECRIRE (Update/Upsert) sans blocage, activez les règles RLS permissives. 
                Cela résout généralement l'erreur <b>409 Conflict</b> qui survient lors de l'écrasement (Upsert) de données existantes si la police UPDATE est manquante.
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono text-emerald-300 bg-black/60 p-4 rounded-xl overflow-x-auto border border-white/5 select-all">
                  {sqlEnableRLSPublic}
                </pre>
                <Button 
                  onClick={() => handleCopy(sqlEnableRLSPublic, 'Script RLS public')}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[9px] font-black uppercase tracking-widest gap-1 flex items-center h-auto"
                >
                  <Copy size={10} /> Copier
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Item 5: Drop and Recreate cleanly */}
        <div className="border border-rose-500/20 rounded-xl overflow-hidden bg-rose-950/10">
          <button 
            onClick={() => setActiveSection(activeSection === 'cleanup' ? null : 'cleanup')}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-rose-400 hover:bg-rose-950/20"
          >
            <span className="flex items-center gap-2">
              <XCircle size={14} className="text-rose-500" />
              5. RÉINITIALISATION COMPLÈTE : Vider et supprimer toutes les tables (⚠️ Destructif)
            </span>
            {activeSection === 'cleanup' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {activeSection === 'cleanup' && (
            <div className="p-4 border-t border-rose-500/10 space-y-3 bg-slate-950/80">
              <p className="text-[11px] text-rose-300/80 leading-relaxed font-bold">
                ⚠️ ATTENTION : Cela détruira définitivement toutes les données de votre base Supabase cloud pour ces tables. Copiez, collez dans le SQL editor et exécutez ce script pour tout supprimer, puis vous pourrez ré-exécuter le script "1. Créer les Tables" pour repartir sur de bonnes bases.
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono text-rose-400 bg-black/60 p-4 rounded-xl overflow-x-auto border border-white/5">
                  {sqlDropTables}
                </pre>
                <Button 
                  onClick={() => handleCopy(sqlDropTables, 'Script DROP TABLES')}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black uppercase tracking-widest gap-1 flex items-center h-auto"
                >
                  <Copy size={10} /> Copier
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
