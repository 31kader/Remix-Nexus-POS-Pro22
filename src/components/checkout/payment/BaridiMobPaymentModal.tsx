import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, CheckCircle2, X, Copy, Check } from 'lucide-react';
import { generateBaridiMobQrString, getSavedBaridiMobConfig, formatAlgerianRip } from '../../../services/fintech/baridiMobService';
import { broadcastCustomerDisplay } from '../../../services/customerDisplayService';
import { toast } from 'sonner';

interface BaridiMobPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  transactionId?: string;
  onConfirmPayment: () => void;
}

export const BaridiMobPaymentModal: React.FC<BaridiMobPaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  transactionId = 'TX-TEMP',
  onConfirmPayment
}) => {
  const [copied, setCopied] = React.useState(false);
  const config = getSavedBaridiMobConfig();
  const effectiveRip = config.rip || '00799999000000000012';
  const qrString = generateBaridiMobQrString({
    rip: effectiveRip,
    amount: total,
    transactionId,
    merchantName: config.merchantName || 'NEXUS STORE'
  });

  // Diffuser le QR code au 2ème écran client lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      broadcastCustomerDisplay({
        items: [],
        subtotal: total,
        discountAmount: 0,
        total,
        amountPaid: total,
        changeDue: 0,
        isPaid: false
      });
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const handleCopyRip = () => {
    navigator.clipboard.writeText(effectiveRip);
    setCopied(true);
    toast.success('Numéro RIP copié dans le presse-papier');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Paiement BaridiMob</h3>
              <p className="text-[10px] text-slate-400">Algérie Poste & SATIM Sans Contact</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code centralisé */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner">
          <QRCodeSVG value={qrString} size={190} level="M" includeMargin />
          <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-wide">
            Scannez avec l'app BaridiMob
          </p>
        </div>

        {/* Montant & RIP */}
        <div className="space-y-2 text-center">
          <div className="text-3xl font-black font-mono text-emerald-400">
            {total.toFixed(2)} <span className="text-lg font-sans">DA</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 bg-slate-800/80 rounded-xl border border-white/5 text-xs font-mono">
            <span className="text-slate-400 text-[11px] truncate">{formatAlgerianRip(effectiveRip)}</span>
            <button
              type="button"
              onClick={handleCopyRip}
              className="text-indigo-400 hover:text-indigo-300 transition-all p-1"
              title="Copier le RIP"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmPayment();
              onClose();
            }}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 size={16} />
            Valider Reçu
          </button>
        </div>
      </div>
    </div>
  );
};
