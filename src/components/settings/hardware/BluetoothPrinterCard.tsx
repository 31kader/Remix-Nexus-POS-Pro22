import React from 'react';
import { useBluetoothPrinter } from '../../../hooks/useBluetoothPrinter';
import { Bluetooth, Printer, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export const BluetoothPrinterCard: React.FC = () => {
  const {
    isSupported,
    isConnected,
    deviceName,
    isConnecting,
    error,
    connect,
    disconnect,
    printTest
  } = useBluetoothPrinter();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Bluetooth className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Imprimante Mobile Bluetooth BLE (mPOS)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Impression thermique sans-fil 58mm / 80mm pour livreurs & vente ambulante
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connecté
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full text-xs font-bold">
              Non connecté
            </span>
          )}
        </div>
      </div>

      {!isSupported && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            Le navigateur actuel ne supporte pas l'API Web Bluetooth native. Le mode simulation ou Chrome sous Android / Windows est recommandé.
          </span>
        </div>
      )}

      {isConnected && deviceName && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{deviceName}</span>
          </div>
          <button
            onClick={disconnect}
            className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Déconnecter
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {!isConnected ? (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recherche Bluetooth...
              </>
            ) : (
              <>
                <Bluetooth className="w-3.5 h-3.5" /> Appairer une Imprimante Bluetooth
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => printTest()}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer un Ticket Test BLE
          </button>
        )}
      </div>
    </div>
  );
};
