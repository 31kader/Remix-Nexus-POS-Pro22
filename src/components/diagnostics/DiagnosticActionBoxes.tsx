import React from 'react';
import { Sparkles, Layers, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, Button } from '../ui';
import { isSupabaseConfigured } from '../../supabase';

interface DiagnosticActionBoxesProps {
  insertDemoData: () => void;
  isInsertingDemo: boolean;
  handleSyncNow: () => void;
  isSyncing: boolean;
  handleCleanupAIStudioFiles: () => void;
  isCleaning: boolean;
}

export function DiagnosticActionBoxes({
  insertDemoData,
  isInsertingDemo,
  handleSyncNow,
  isSyncing,
  handleCleanupAIStudioFiles,
  isCleaning
}: DiagnosticActionBoxesProps) {
  return (
    <div className="space-y-4">
      {/* 2. Interactive action boxes for database sync and demo creation */}
      {isSupabaseConfigured && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border-white/5 bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={18} />
                <h4 className="font-black text-sm uppercase tracking-wider text-white">Insérer les Produits de Démo</h4>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed mt-2 font-medium">
                Vous venez de créer vos tables mais elles sont entièrement vides ? Cliquez pour injecter instantanément des produits modèles (Coca-Cola, Sidi Ali, Yaourt) avec des prix, codes-barres et catégories pour valider que l'interface de caisse fonctionne !
              </p>
            </div>
            <div className="mt-4">
              <Button 
                onClick={insertDemoData} 
                disabled={isInsertingDemo}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white uppercase text-[10px] tracking-widest font-black py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isInsertingDemo ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                Générer Produits Modèles
              </Button>
            </div>
          </Card>

          <Card className="p-5 border-white/5 bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Layers size={18} />
                <h4 className="font-black text-sm uppercase tracking-wider text-white">Pourquoi la base est vide d'origine ?</h4>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed mt-2 font-medium">
                Lorsque vous connectez un tout nouveau projet Supabase, il ne contient aucune donnée. 
                 Si vous avez déjà des produits dans votre historique local, vous pouvez aussi forcer la synchronisation manuelle.
                 Vous êtes connecté en tant qu'<b>Administrateur</b> car vous utilisez l'email d'administration configuré.
              </p>
            </div>
            <div className="mt-4">
              <Button 
                onClick={handleSyncNow} 
                disabled={isSyncing}
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5 text-white uppercase text-[10px] tracking-widest font-black py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Forcer Rafraîchissement Web
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Outils de réparation / nettoyage de cache et images */}
      <Card className="p-5 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              <h4 className="font-black text-sm uppercase tracking-wider text-white">Nettoyer les images AI Studio expirées (Erreurs 401/404)</h4>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed max-w-2xl font-medium">
              Si vous observez des erreurs de chargement d'image (<code className="text-amber-300 font-mono">401 Unauthorized</code> ou <code className="text-rose-300 font-mono">404 Not Found</code>) dans la console de votre navigateur, cela provient d'anciennes illustrations temporaires d'AI Studio qui ont expiré. Cliquez sur ce bouton pour les détecter et supprimer l'URL cassée de vos données (locales et Cloud).
            </p>
          </div>
          <Button
            onClick={handleCleanupAIStudioFiles}
            disabled={isCleaning}
            className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white uppercase text-[10px] tracking-widest font-black py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-600/15"
          >
            {isCleaning ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {isCleaning ? "Nettoyage..." : "DÉTECTER & NETTOYER"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const Loader2: React.FC<{size?: number, className?: string}> = ({ size = 16, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`animate-spin ${className || ''}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
