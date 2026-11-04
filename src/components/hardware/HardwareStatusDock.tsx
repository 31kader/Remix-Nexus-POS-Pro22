import React from 'react';
import { Printer, Scale, Bluetooth, CreditCard, Wifi } from 'lucide-react';
import { useScaleWeight } from '../../hooks/useScaleWeight';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import { getPrinterHardwareConfig } from '../../services/hardwareService';

interface HardwareStatusDockProps {
  className?: string;
}

export const HardwareStatusDock: React.FC<HardwareStatusDockProps> = ({ className = '' }) => {
  const { weight, isConnected: isScaleConnected, isStable } = useScaleWeight();
  const { isConnected: isBleConnected, deviceName: bleDeviceName } = useBluetoothPrinter();
  const printerConfig = getPrinterHardwareConfig();
  const isDirectPrinterConfigured = printerConfig.mode === 'network' && !!printerConfig.networkIp;

  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto py-1 px-2.5 bg-slate-900/90 dark:bg-black/80 backdrop-blur-md border border-slate-800 rounded-xl text-xs select-none ${className}`}
      title="Statut du matériel de caisse (Figma Spec Hardware Dock)"
    >
      {/* 🖨️ Imprimante ESC/POS Réseau */}
      <div
        className={`pill-hardware ${
          isDirectPrinterConfigured
            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
        }`}
        title={isDirectPrinterConfigured ? `Imprimante Réseau : ${printerConfig.networkIp}:${printerConfig.networkPort || 9100}` : 'Imprimante Réseau non configurée'}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>{isDirectPrinterConfigured ? 'ESC/POS 9100' : 'ESC/POS OFF'}</span>
      </div>

      {/* ⚖️ Balance Électronique */}
      <div
        className={`pill-hardware ${
          isScaleConnected
            ? isStable
              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/30'
              : 'bg-amber-950/80 text-amber-400 border border-amber-500/30 animate-pulse'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
        }`}
        title={isScaleConnected ? `Balance connectée: ${weight.toFixed(3)} kg (${isStable ? 'Stable' : 'Mouvement'})` : 'Balance déconnectée'}
      >
        <Scale className="w-3.5 h-3.5" />
        <span className="font-financial">
          {isScaleConnected ? `${weight.toFixed(3)} kg` : 'BALANCE OFF'}
        </span>
      </div>

      {/* 💳 Terminal TPE CIB / Dahabia */}
      <div
        className="pill-hardware bg-indigo-950/80 text-indigo-400 border border-indigo-500/30"
        title="Liaison TPE Bancaire CIB / SATIM (Protocole Concertation prêt)"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>TPE CIB</span>
      </div>

      {/* 📱 Mini-Imprimante Bluetooth Mobile */}
      <div
        className={`pill-hardware ${
          isBleConnected
            ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
        }`}
        title={isBleConnected ? `Imprimante Bluetooth connectée : ${bleDeviceName || 'BLE 58mm'}` : 'Bluetooth déconnecté'}
      >
        <Bluetooth className="w-3.5 h-3.5" />
        <span>{isBleConnected ? 'BLE MPOS' : 'BLE OFF'}</span>
      </div>

      {/* ⚡ LAN Sync P2P */}
      <div
        className="pill-hardware bg-slate-800/80 text-emerald-400 border border-emerald-500/20"
        title="Synchronisation P2P Réseau Local Active"
      >
        <Wifi className="w-3.5 h-3.5" />
        <span>LAN P2P</span>
      </div>
    </div>
  );
};
