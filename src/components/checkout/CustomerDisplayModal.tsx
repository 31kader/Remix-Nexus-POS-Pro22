import React, { useState, useEffect } from 'react';
import { Tv, ExternalLink, Copy, Check, X, QrCode, Sparkles, Wifi, Play, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { getCustomerDisplayUrl, fetchNetworkIp, broadcastCustomerDisplay } from '../../services/customerDisplayService';

interface CustomerDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDisplayModal: React.FC<CustomerDisplayModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [networkIp, setNetworkIp] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkIp().then(ip => {
        if (ip) setNetworkIp(ip);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const localDisplayUrl = getCustomerDisplayUrl();
  const wirelessUrl = (networkIp && networkIp !== 'localhost' && networkIp !== '127.0.0.1')
    ? getCustomerDisplayUrl(networkIp)
    : localDisplayUrl;

  const handleOpenWindow = () => {
    window.open(localDisplayUrl, '_blank', 'width=1024,height=768,menubar=no,toolbar=no,location=no');
  };

  const handleCopy = () => {
    if (navigator.clipboard && wirelessUrl) {
      navigator.clipboard.writeText(wirelessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success('Lien copié dans le presse-papiers !');
    }
  };

  const handleTestSimulation = () => {
    setIsTesting(true);
    broadcastCustomerDisplay({
      items: [
        { id: 'test-1', name: 'Article Démonstration / Test Wi-Fi', price: 350, quantity: 2, barcode: '613123456789' },
        { id: 'test-2', name: 'Pack Boisson Fraîche 1L', price: 150, quantity: 1, barcode: '613987654321' }
      ],
      subtotal: 850,
      discountAmount: 50,
      total: 800,
      amountPaid: 1000,
      changeDue: 200,
      customerName: 'Client VIP Test',
      isPaid: false
    });
    toast.success('Panier test envoyé avec succès sur tous les écrans !');
    setTimeout(() => setIsTesting(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Tv size={22} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Afficheur Client Sans Fil & 2ème Écran
              </h3>
              <p className="text-xs text-slate-400">Synchronisé en temps réel (Wi-Fi Local 0 ms + Câble HDMI)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Option A: Ouvrir nouvelle fenêtre (même PC / Câble HDMI) */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span>Écran Secondaire (Câble HDMI / Même PC)</span>
              </span>
              <p className="text-xs text-slate-400">
                Ouvre l'afficheur dans une nouvelle fenêtre à glisser sur votre 2ème écran.
              </p>
            </div>
            <button
              onClick={handleOpenWindow}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95 shrink-0"
            >
              <ExternalLink size={14} />
              <span>Ouvrir</span>
            </button>
          </div>

          {/* Option B: QR Code pour Smartphone / Tablette sans fil */}
          <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-800/80 to-slate-800/80 border border-indigo-500/20 rounded-2xl flex flex-col items-center text-center space-y-3.5">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                <Wifi size={15} />
                <span>Connexion Sans Fil (Tablette ou Smartphone)</span>
              </span>
              <p className="text-xs text-slate-400 max-w-xs">
                Flashez ce code QR avec la caméra de n'importe quel téléphone ou tablette connecté à votre réseau Wi-Fi :
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-indigo-400/30">
              <QRCodeSVG value={wirelessUrl} size={155} />
            </div>

            {networkIp && networkIp !== 'localhost' && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>IP Réseau Wi-Fi : <strong>{networkIp}:3000</strong></span>
              </div>
            )}

            {/* Copy Link Button */}
            <div className="w-full flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={wirelessUrl}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                title="Copier le lien"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action de test en direct */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
          <span className="text-xs text-slate-400">Vérifier la réception en temps réel :</span>
          <button
            type="button"
            onClick={handleTestSimulation}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20"
          >
            <Play size={12} />
            <span>Tester l'affichage</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
