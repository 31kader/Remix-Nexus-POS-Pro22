import React from 'react';
import { ShieldAlert, Copy } from 'lucide-react';
import { Card, Button } from '../ui';
import { isSupabaseConfigured } from '../../supabase';

interface DiagnosticWarningPanelProps {
  missingTables: string[];
  sqlCreateTables: string;
  handleCopy: (text: string, description: string) => void;
}

export function DiagnosticWarningPanel({
  missingTables,
  sqlCreateTables,
  handleCopy
}: DiagnosticWarningPanelProps) {
  if (!isSupabaseConfigured || missingTables.length === 0) return null;

  return (
    <Card className="p-5 border-rose-500/30 bg-rose-950/20 border-l-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Tables Manquantes sur Supabase !</h3>
          <p className="text-[11px] text-rose-200/80 leading-relaxed font-medium">
            Votre base de données cloud est connectée mais les tables suivantes sont introuvables : 
            <span className="text-white bg-rose-500/20 px-2 py-0.5 rounded ml-1 font-mono">{missingTables.join(', ')}</span>.
          </p>
          <div className="p-2 mt-1 bg-black/30 rounded border border-rose-500/10">
            <p className="text-[9px] text-rose-300 leading-tight">
              <b>Où coller ?</b> Connectez-vous à app.supabase.com → Choisissez votre projet → Cliquez sur l'icône <b>SQL Editor</b> (menu de gauche) → Cliquez sur <b>+ New query</b> → Collez et cliquez sur <b>RUN</b>.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button 
              onClick={() => handleCopy(sqlCreateTables, 'Script de création de table')}
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded shadow-md group"
            >
              <Copy size={12} className="mr-1.5 group-hover:scale-110 transition-transform" />
              Copier le Script SQL de Création
            </Button>
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-[9px] text-rose-300 font-bold uppercase tracking-widest">Collez-le dans le SQL Editor de Supabase</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
