import React, { useState } from 'react';
import { Printer, Network, Usb, Cpu, CheckCircle2, AlertCircle, RefreshCw, Play } from 'lucide-react';
import { CompanySettings } from '../../../types';
import {
  PrinterHardwareConfig,
  getPrinterHardwareConfig,
  savePrinterHardwareConfig,
  testNetworkPrinterConnection,
  testCashDrawer
} from '../../../services/hardwareService';
import { buildDiagnosticSelfTestTicket } from '../../../services/escposDiagnosticService';
import { sendEscPosToPrinter } from '../../../services/escposPrintService';
import { getTerminalId, getTerminalName } from '../../../services/terminalService';
import { toast } from 'sonner';

interface DirectPrinterConfigCardProps {
  settings: CompanySettings;
}

export const DirectPrinterConfigCard: React.FC<DirectPrinterConfigCardProps> = ({ settings }) => {
  const [config, setConfig] = useState<PrinterHardwareConfig>(getPrinterHardwareConfig());
  const [isTestingNet, setIsTestingNet] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [netStatus, setNetStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  const updateMode = (mode: PrinterHardwareConfig['mode']) => {
    const updated = savePrinterHardwareConfig({ mode });
    setConfig(updated);
    toast.success(`Mode d'impression configuré : ${mode.toUpperCase()}`);
  };

  const updateIp = (networkIp: string) => {
    const updated = savePrinterHardwareConfig({ networkIp });
    setConfig(updated);
    setNetStatus('idle');
  };

  const updatePort = (networkPort: number) => {
    const updated = savePrinterHardwareConfig({ networkPort });
    setConfig(updated);
    setNetStatus('idle');
  };

  const handleTestConnection = async () => {
    if (!config.networkIp) {
      toast.error('Veuillez saisir une adresse IP valide.');
      return;
    }
    setIsTestingNet(true);
    setNetStatus('idle');
    try {
      const res = await testNetworkPrinterConnection(config.networkIp, config.networkPort);
      if (res.success) {
        setNetStatus('ok');
        toast.success(res.message);
      } else {
        setNetStatus('err');
        toast.error(res.message);
      }
    } catch (err: any) {
      setNetStatus('err');
      toast.error(err?.message || 'Erreur réseau inconnue');
    } finally {
      setIsTestingNet(false);
    }
  };

  const handlePrintDiagnosticTicket = async () => {
    setIsPrintingTest(true);
    try {
      const ticketBytes = buildDiagnosticSelfTestTicket(settings, {
        terminalId: getTerminalId(),
        terminalName: getTerminalName(),
        ipAddress: config.networkIp,
        port: config.networkPort,
        openDrawer: config.openDrawerOnCash,
        cutPaper: config.autoCut
      });

      const res = await sendEscPosToPrinter(ticketBytes, {
        mode: config.mode,
        ip: config.networkIp,
        port: config.networkPort
      });

      if (res.success) {
        toast.success(res.message);
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      toast.error(`Échec impression diagnostic : ${err?.message || 'Inconnue'}`);
    } finally {
      setTimeout(() => setIsPrintingTest(false), 500);
    }
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-indigo-500/20 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Cpu size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Moteur d'Impression Thermique ESC/POS Direct</p>
            <p className="text-[10px] text-slate-400">Impression instantanée en caisse sans dialogue navigateur bloquant</p>
          </div>
        </div>
      </div>

      {/* Sélection du mode de connexion */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => updateMode('system')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
            config.mode === 'system'
              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
              : 'bg-slate-850/60 border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Printer size={22} className={config.mode === 'system' ? 'text-indigo-400' : 'text-slate-500'} />
          <span className="text-xs font-bold">Dialogue Système</span>
          <span className="text-[10px] text-slate-500">Par défaut (Navigateur)</span>
        </button>

        <button
          type="button"
          onClick={() => updateMode('network')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
            config.mode === 'network'
              ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
              : 'bg-slate-850/60 border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Network size={22} className={config.mode === 'network' ? 'text-emerald-400' : 'text-slate-500'} />
          <span className="text-xs font-bold">Réseau Local IP</span>
          <span className="text-[10px] text-slate-500">Port TCP 9100 Raw</span>
        </button>

        <button
          type="button"
          onClick={() => updateMode('usb')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
            config.mode === 'usb'
              ? 'bg-amber-600/20 border-amber-500 text-white shadow-md'
              : 'bg-slate-850/60 border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Usb size={22} className={config.mode === 'usb' ? 'text-amber-400' : 'text-slate-500'} />
          <span className="text-xs font-bold">USB Direct</span>
          <span className="text-[10px] text-slate-500">WebSerial / WebUSB</span>
        </button>
      </div>

      {/* Configuration spécifique IP & Réseau */}
      {config.mode === 'network' && (
        <div className="p-4 bg-slate-850/80 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse IP Imprimante</label>
              <input
                type="text"
                value={config.networkIp}
                onChange={e => updateIp(e.target.value)}
                placeholder="192.168.1.200"
                className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Port TCP</label>
              <input
                type="number"
                value={config.networkPort}
                onChange={e => updatePort(Number(e.target.value) || 9100)}
                placeholder="9100"
                className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingNet}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isTestingNet ? 'animate-spin' : ''} />
              {isTestingNet ? 'Test en cours...' : 'Tester la liaison réseau IP'}
            </button>

            {netStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 size={16} /> Imprimante en ligne
              </span>
            )}
            {netStatus === 'err' && (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
                <AlertCircle size={16} /> Imprimante injoignable
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions de test et diagnostic physique */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrintDiagnosticTicket}
          disabled={isPrintingTest}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
        >
          <Play size={14} />
          {isPrintingTest ? 'Impression en cours...' : 'Imprimer Ticket Diagnostic ESC/POS'}
        </button>

        <button
          type="button"
          onClick={async () => {
            const res = await testCashDrawer();
            toast.success(res.message);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all"
        >
          Tester Impulsion Tiroir RJ11
        </button>
      </div>
    </div>
  );
};
