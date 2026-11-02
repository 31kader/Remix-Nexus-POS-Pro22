import { toast } from 'sonner';
import { BackupData, restoreBackupArchive } from './backup/backupRestoreProcessor';
import { collectCurrentBackupData } from './backup/backupDataCollector';

export type { BackupData };
export { restoreBackupArchive, collectCurrentBackupData };

/**
 * 📦 Exporte l'intégralité de la base de données locale dans un fichier .nexus-backup
 */
export async function createBackupArchive(): Promise<void> {
  try {
    toast.loading("Génération de la sauvegarde de secours en cours...", { id: 'backup-toast' });

    const backupData = await collectCurrentBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `NexusPOS_Backup_${dateFormatted}.nexus-backup`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Sauvegarde créée avec succès : ${backupData.products.length} articles sauvegardés !`, { id: 'backup-toast' });
  } catch (err: any) {
    console.error('Erreur lors de la sauvegarde :', err);
    toast.error(`Échec de la sauvegarde : ${err.message}`, { id: 'backup-toast' });
  }
}
