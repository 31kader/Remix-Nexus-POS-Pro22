import React from 'react';
import { Copy, Check } from 'lucide-react';

interface LanMasterConfigViewProps {
  primaryDetectedIp: string;
  inputMasterPort: number;
  detectedIps: Array<{ name: string; ip: string }>;
  isCopied: boolean;
  onCopyMasterAddress: () => void;
  connectedPeers: Array<{ terminalId: string; terminalName: string }>;
}

export const LanMasterConfigView: React.FC<LanMasterConfigViewProps> = ({
  primaryDetectedIp,
  inputMasterPort,
  detectedIps,
  isCopied,
  onCopyMasterAddress,
  connectedPeers
}) => {
  return (
    <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Adresse IP de ce poste sur le réseau local :
          </p>
          <p className="text-base font-mono font-black text-emerald-950 dark:text-emerald-100 mt-0.5">
            http://{primaryDetectedIp}:{inputMasterPort}
          </p>
          {detectedIps.length > 1 && (
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              Autres interfaces détectées : {detectedIps.map(i => `${i.name} (${i.ip})`).join(', ')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCopyMasterAddress}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? 'Copié !' : 'Copier l\'adresse'}
        </button>
      </div>

      {/* Caisses Secondaires Actuellement Connectées */}
      <div className="pt-2 border-t border-emerald-500/20">
        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2">
          Caisses Secondaires Connectées en Direct ({connectedPeers.length}) :
        </p>
        {connectedPeers.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-zinc-400 italic">
            Aucune caisse secondaire n'est connectée actuellement. Sur les autres caisses, sélectionnez « Caisse Secondaire » et entrez l'adresse IP ci-dessus.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {connectedPeers.map(peer => (
              <div key={peer.terminalId} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{peer.terminalId}</span>
                  <span className="text-slate-500 dark:text-zinc-400">({peer.terminalName})</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Connecté</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
