import React, { useState } from 'react';
import { Scale, CheckCircle2, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { getScaleConfig, saveScaleConfig, ScaleConfig, ScaleProtocol } from '../../../services/hardware/scaleConfigStorage';
import { useScaleWeight } from '../../../hooks/useScaleWeight';
import { toast } from 'sonner';

export const ScaleConfigCard: React.FC = () => {
  const [config, setConfig] = useState<ScaleConfig>(getScaleConfig());
  const { weight, isStable, isConnected, connect, disconnect, tare, zero } = useScaleWeight();
  const [isConnecting, setIsConnecting] = useState(false);

  const updateConfig = (updates: Partial<ScaleConfig>) => {
    const next = saveScaleConfig(updates);
    setConfig(next);
    toast.success('Configuration de la balance mise à jour');
  };

  const handleConnectToggle = async () => {
    if (isConnected) {
      await disconnect();
      toast.info('Balance déconnectée');
    } else {
      setIsConnecting(true);
      try {
        const res = await connect();
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Erreur lors de la connexion à la balance');
      } finally {
        setIsConnecting(false);
      }
    }
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-indigo-500/20 rounded-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <Scale size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Balance Électronique de Comptoir</p>
            <p className="text-[10px] text-slate-400">Pesée directe et injection automatique des articles au kilo</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConnectToggle}
          disabled={isConnecting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          {isConnecting ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
          {isConnected ? 'Déconnecter' : 'Connecter Port COM (Série)'}
        </button>
      </div>

      {/* Afficheur de pesée en direct */}
      <div className="p-4 bg-slate-850 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-black font-mono tracking-tight text-white">
            {weight.toFixed(3)} <span className="text-xl text-cyan-400 font-sans">kg</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {isConnected ? (
                isStable ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Poids Stable
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                    <RefreshCw size={14} className="animate-spin" /> Pesée en cours...
                  </span>
                )
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  <AlertCircle size={14} /> Balance non connectée
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono">Protocole : {config.protocol.toUpperCase()}</span>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await tare();
                if (ok) toast.success('Commande Tare transmise');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
            >
              Tarer (T)
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await zero();
                if (ok) toast.success('Commande Zéro transmise');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
            >
              Remise à Zéro (Z)
            </button>
          </div>
        )}
      </div>

      {/* Paramètres série */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocole Balance</label>
          <select
            value={config.protocol}
            onChange={e => updateConfig({ protocol: e.target.value as ScaleProtocol })}
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-3 text-white text-xs font-medium outline-none focus:border-cyan-500 transition-all"
          >
            <option value="toledo">Toledo Continuous (Mettler Toledo standard)</option>
            <option value="dibal">Dibal / Bizerba (Format ST,GS)</option>
            <option value="cas">CAS / Ohaus</option>
            <option value="nci">NCI Standard POS</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitesse (Baud Rate)</label>
          <select
            value={config.baudRate}
            onChange={e => updateConfig({ baudRate: Number(e.target.value) })}
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-3 text-white text-xs font-medium outline-none focus:border-cyan-500 transition-all font-mono"
          >
            <option value={9600}>9600 bauds (Standard)</option>
            <option value={4800}>4800 bauds</option>
            <option value={2400}>2400 bauds</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Injection Auto en Caisse</label>
          <div className="flex items-center h-11">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={config.autoInjectWeight}
                onChange={e => updateConfig({ autoInjectWeight: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 cursor-pointer"
              />
              Injecter le poids au scan d'article au kg
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
