import React, { useState } from 'react';
import { 
  Network, 
  Cloud, 
  CloudOff, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Activity, 
  RefreshCw, 
  Sliders,
  Radio,
  ArrowRightLeft
} from 'lucide-react';
import { useLanSyncStatus } from '../../hooks/useLanSyncStatus';
import { getTerminalId, getTerminalName } from '../../services/terminalService';
import { cn } from '../../lib/utils';

interface LanStatusBadgeProps {
  onOpenSettings?: () => void;
}

export function LanStatusBadge({ onOpenSettings }: LanStatusBadgeProps) {
  const { 
    role, 
    isLanConnected, 
    isInternetConnected, 
    hybridMode, 
    connectedPeers, 
    latencyMs, 
    masterIp,
    reconnect 
  } = useLanSyncStatus();

  const [showModal, setShowModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleManualReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    setTimeout(() => setIsReconnecting(false), 800);
  };

  // Configuration visuelle du badge selon le mode hybride
  const badgeConfig = (() => {
    switch (hybridMode) {
      case 'LAN_AND_CLOUD':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-500 animate-pulse',
          icon: ArrowRightLeft,
          label: 'LAN + Cloud',
          description: 'Câble Ethernet LAN & Supabase Cloud connectés simultanément'
        };
      case 'LAN_ONLY':
        return {
          bg: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
          dot: 'bg-cyan-500 animate-pulse',
          icon: Network,
          label: 'LAN Direct',
          description: 'Synchro locale directe active (sans connexion Internet)'
        };
      case 'CLOUD_ONLY':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-500',
          icon: Cloud,
          label: 'Cloud Seul',
          description: 'Câble LAN débranché — Synchronisation via Internet Cloud'
        };
      case 'OFFLINE_ISOLATED':
      default:
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-500',
          icon: CloudOff,
          label: 'Autonome',
          description: 'Ni Câble ni Internet — Encaissement autonome local garanti'
        };
    }
  })();

  const BadgeIcon = badgeConfig.icon;

  return (
    <>
      {/* Bouton Badge dans la barre d'en-tête */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer select-none",
          badgeConfig.bg
        )}
        title={`Réseau Hybride : ${badgeConfig.description} (Cliquer pour diagnostic)`}
      >
        <span className={cn("w-2 h-2 rounded-full shrink-0", badgeConfig.dot)} />
        <BadgeIcon size={13} className="shrink-0" />
        <span className="hidden sm:inline font-mono tracking-wide">{badgeConfig.label}</span>
        {latencyMs !== null && isLanConnected && (
          <span className="text-[10px] opacity-75 font-mono hidden xl:inline">({latencyMs}ms)</span>
        )}
      </button>

      {/* Modal de Diagnostic Réseau Local & Cloud */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <Network size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    État Réseau & Synchronisation Hybride
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Poste : {getTerminalName()} ({getTerminalId()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corps du modal */}
            <div className="p-5 space-y-4 text-left">
              {/* Carte Statut Hybride Global */}
              <div className={cn("p-4 rounded-xl border flex items-start gap-3.5", badgeConfig.bg)}>
                <div className="mt-0.5">
                  <BadgeIcon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase tracking-wider">{badgeConfig.label}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20">
                      {role === 'MASTER' ? 'Caisse Maître' : role === 'SECONDARY' ? 'Caisse Secondaire' : 'Autonome'}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{badgeConfig.description}</p>
                </div>
              </div>

              {/* Grille des Deux Canaux : Câble LAN vs Internet Cloud */}
              <div className="grid grid-cols-2 gap-3">
                {/* Canal 1 : Câble Ethernet / Wi-Fi Local */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Network size={14} className="text-indigo-500" />
                      Réseau Câble / LAN
                    </span>
                    {isLanConnected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <AlertCircle size={12} /> Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {role === 'MASTER'
                      ? `Hub Local actif (${connectedPeers.length} caisse(s) reliée(s))`
                      : role === 'SECONDARY'
                      ? (isLanConnected ? `Connecté au Maître (${latencyMs || '<5'} ms)` : 'En recherche du Maître...')
                      : 'Non configuré (Mode Autonome)'}
                  </p>
                </div>

                {/* Canal 2 : Connexion Internet Cloud */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Cloud size={14} className="text-blue-500" />
                      Internet Cloud
                    </span>
                    {isInternetConnected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> En Ligne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                        <CloudOff size={12} /> Hors Ligne
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {isInternetConnected 
                      ? 'Sauvegarde distante active vers Supabase'
                      : 'Les ventes sont sécurisées en local'}
                  </p>
                </div>
              </div>

              {/* Caisses connectées en direct sur le réseau local */}
              {role === 'MASTER' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Server size={14} className="text-indigo-500" />
                      Caisses Secondaires Connectées ({connectedPeers.length})
                    </span>
                  </div>
                  {connectedPeers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      Aucune caisse secondaire connectée pour le moment. Branchez le câble Ethernet ou connectez les caisses au même Wi-Fi.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {connectedPeers.map(peer => (
                        <div key={peer.terminalId} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{peer.terminalId}</span>
                            <span className="text-slate-500 dark:text-zinc-400">({peer.terminalName})</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{peer.ip || 'LAN'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Caisse Secondaire : Adresse du Hub */}
              {role === 'SECONDARY' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Adresse de la Caisse Maître</p>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">{masterIp || 'Auto-détection (localhost)'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualReconnect}
                    disabled={isReconnecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={12} className={cn(isReconnecting && "animate-spin")} />
                    Reconnecter
                  </button>
                </div>
              )}
            </div>

            {/* Pied du modal avec raccourci vers les paramètres */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  if (onOpenSettings) onOpenSettings();
                }}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Sliders size={14} />
                Configurer les rôles et adresses IP
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
