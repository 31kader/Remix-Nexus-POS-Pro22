import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { TpeDriverService } from '../../../services/fintech/tpeDriverService';
import { TpeTransactionResponse } from '../../../services/fintech/tpeConcertationProtocol';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  amountDzd: number;
  onPaymentSuccess: (res: TpeTransactionResponse) => void;
}

export const TpePaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  amountDzd,
  onPaymentSuccess
}) => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TpeTransactionResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleStartPayment();
    } else {
      setError(null);
      setResult(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleStartPayment = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await TpeDriverService.requestPayment(amountDzd, (step) => {
        setStatus(step);
      });

      if (res.isApproved) {
        setResult(res);
        setIsLoading(false);
        setTimeout(() => {
          onPaymentSuccess(res);
        }, 1200);
      } else {
        setError(res.responseLabel || 'Transaction refusée par le TPE');
        setIsLoading(false);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de communication avec le TPE');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Paiement Carte CIB / Dahabia</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Liaison directe terminal SATIM / TPE</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Montant à débiter</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              {amountDzd.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-emerald-600 dark:text-emerald-400 text-xl font-bold">DA</span>
            </div>
          </div>

          {isLoading && (
            <div className="py-6 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-emerald-600 dark:text-emerald-400 animate-spin stroke-1" />
                <CreditCard className="w-6 h-6 text-slate-700 dark:text-slate-300 absolute inset-0 m-auto" />
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 animate-pulse">
                {status}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suivez les instructions sur l'écran du terminal bancaire
              </p>
            </div>
          )}

          {result && (
            <div className="py-4 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-base">Paiement Accepté</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Autorisation : <strong>{result.authorizationNumber || 'SATIM-OK'}</strong>
                {result.cardPanMasked && <span> | {result.cardPanMasked}</span>}
              </p>
            </div>
          )}

          {error && (
            <div className="py-4 space-y-3">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-rose-700 dark:text-rose-400 text-base">Échec Transaction TPE</h4>
              <p className="text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                {error}
              </p>
              <button
                onClick={handleStartPayment}
                className="mt-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Réessayer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
