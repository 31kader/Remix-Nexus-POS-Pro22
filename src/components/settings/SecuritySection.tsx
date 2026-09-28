import React, { useState } from 'react';
import {
  AlertTriangle,
  Globe,
  MessageCircle,
  Database,
  Shield,
  Lock,
  BellOff,
  EyeOff,
  Camera,
  Download,
  UploadCloud
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { sanitizePlainPasswords } from '../../scripts/sanitizePlainPasswords';
import { createBackupArchive, restoreBackupArchive } from '../../services/backupRestoreService';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function SecuritySection({ formData, setFormData }: SectionProps) {
  const [isSanitizing, setIsSanitizing] = useState(false);
  const anyData = formData as any;

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSanitizePasswords = async () => {
    setIsSanitizing(true);
    try {
      const stats = await sanitizePlainPasswords();
      const totalUpdated = stats.reduce((acc, curr) => acc + curr.updated, 0);
      toast.success(`Hachage des mots de passe terminé. ${totalUpdated} compte(s) mis à jour.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur de hachage: ${err.message || err}`);
    } finally {
      setIsSanitizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloc 1 : Contrôle des Notifications en bas à droite & Affichage du Studio de Synchro */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
            Synchronisation Automatique & Notifications Écran
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Contrôlez la discrétion des notifications en bas à droite et des modules techniques
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Toggle 1 : Mode Silencieux en bas à droite */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <BellOff size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Masquer les notifications en bas à droite
                </p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  Mode silencieux : n'affiche aucun badge de synchro tant que tout fonctionne.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={anyData.silentSyncNotifications !== false}
                onChange={e => updateField('silentSyncNotifications', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Toggle 2 : Masquer Studio de Synchro */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <EyeOff size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Masquer « Studio de Synchro » du menu
                </p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  La synchro étant 100% automatique, vous pouvez cacher ce bouton du menu latéral.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(anyData.hideSyncStudioInSidebar)}
                onChange={e => updateField('hideSyncStudioInSidebar', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Toggle 3 : Portail Audit Caméra */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Camera size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Activer le Module Audit Caméra
                </p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  Affiche l'onglet de surveillance vidéo et contrôle des tickets par caméra.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.enableCameraPortal !== false}
                onChange={e => updateField('enableCameraPortal', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Sauvegarde & Restauration Locale Instantanée */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Sauvegarde & Restauration Locale (.nexus-backup)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Exportez ou restaurez un instantané complet de votre magasin sur clé USB ou disque externe
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => createBackupArchive()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download size={15} /> Télécharger Sauvegarde
            </button>
            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs">
              <UploadCloud size={15} /> Restaurer Fichier
              <input
                type="file"
                accept=".json,.nexus-backup"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await restoreBackupArchive(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bloc 3 : Rétention & Gouvernance des données */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
          <Lock size={17} className="text-indigo-500" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Rétention & Gouvernance des Données</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Database size={13} className="text-indigo-500" /> Rétention des Journaux d'Audit (Jours)
            </label>
            <input
              type="number"
              value={formData.auditLogRetentionDays ?? 90}
              onChange={e => updateField('auditLogRetentionDays', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Shield size={13} className="text-emerald-500" /> Verrouillage Comptable des Ventes (Jours)
            </label>
            <input
              type="number"
              value={formData.lockingPeriodDays ?? 0}
              onChange={e => updateField('lockingPeriodDays', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bloc 4 : Sécurité des Comptes (Bcrypt) & Clés API */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Hachage Cryptographique Bcrypt ($2a$) des Comptes</p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Vérifie et chiffre automatiquement tous les PINs et mots de passe en clair dans la base locale.
            </p>
          </div>
          <button
            type="button"
            disabled={isSanitizing}
            onClick={handleSanitizePasswords}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            {isSanitizing ? 'Sécurisation...' : 'Sécuriser les Comptes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Globe size={13} className="text-blue-500" /> Clé API Google Maps (Optionnel)
            </label>
            <input
              type="password"
              value={formData.apiKeys?.googleMapsKey || ''}
              onChange={e => setFormData({ ...formData, apiKeys: { ...formData.apiKeys!, googleMapsKey: e.target.value } })}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-indigo-500"
              placeholder="AIza..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <MessageCircle size={13} className="text-emerald-500" /> Twilio SID WhatsApp (Optionnel)
            </label>
            <input
              type="text"
              value={formData.apiKeys?.twilioSid || ''}
              onChange={e => setFormData({ ...formData, apiKeys: { ...formData.apiKeys!, twilioSid: e.target.value } })}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-indigo-500"
              placeholder="AC..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
