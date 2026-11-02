import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { ShieldCheck, HardDrive, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { 
  getLastAutoBackupInfo, 
  getRollingBackupsList, 
  runDailyAutoBackup,
  LastAutoBackupInfo
} from '../../services/backup/autoDailyBackupService';
import { toast } from 'sonner';

export const DailyAutoBackupCard: React.FC = () => {
  const [backupInfo, setBackupInfo] = useState<LastAutoBackupInfo | null>(null);
  const [rollingList, setRollingList] = useState<{ date: string; productCount: number; txCount: number }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const refreshData = async () => {
    setBackupInfo(getLastAutoBackupInfo());
    const list = await getRollingBackupsList();
    setRollingList(list);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleManualTrigger = async () => {
    setIsRunning(true);
    try {
      const res = await runDailyAutoBackup({ force: true });
      if (res.executed) {
        toast.success(`Sauvegarde quotidienne effectuée avec succès (${res.info?.productCount} produits)`);
        await refreshData();
      } else {
        toast.error(`Échec: ${res.reason}`);
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayDone = backupInfo?.date === todayStr;

  return (
    <Card className="p-6 border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Sauvegarde Quotidienne Automatique
              {isTodayDone ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                  <CheckCircle size={12} /> À jour aujourd'hui
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                  <Clock size={12} /> Prévue aujourd'hui
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Garde un historique des 7 derniers jours sur le disque PC (Electron) ou en stockage local sécurisé.
            </p>
          </div>
        </div>

        <Button
          onClick={handleManualTrigger}
          disabled={isRunning}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 self-start sm:self-auto text-xs font-bold"
        >
          <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Sauvegarde en cours...' : 'Exécuter maintenant'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs">
        <div>
          <span className="text-slate-400 block font-medium">Dernier snapshot</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {backupInfo ? `${backupInfo.date} à ${new Date(backupInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Aucun snapshot'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Volume sauvegardé</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {backupInfo ? `${backupInfo.productCount} produits · ${backupInfo.txCount} transactions` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Emplacement cible</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <HardDrive size={12} />
            {backupInfo?.environment === 'electron' ? 'Documents/NexusPOS_Backups' : 'Stockage Local Sécurisé'}
          </span>
        </div>
      </div>

      {rollingList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Historique Glissant (7 derniers jours)
          </span>
          <div className="flex flex-wrap gap-2">
            {rollingList.map(item => (
              <span 
                key={item.date} 
                className="px-2 py-1 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300"
              >
                📅 {item.date} ({item.productCount} prod.)
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
