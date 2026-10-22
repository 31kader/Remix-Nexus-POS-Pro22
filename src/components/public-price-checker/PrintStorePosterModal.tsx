import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, X, QrCode, Smartphone, Store, Check, Copy, ExternalLink,
  Sparkles, ShieldCheck, Tag, Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { CompanySettings } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { toast } from 'sonner';

interface PrintStorePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
}

export function PrintStorePosterModal({
  isOpen,
  onClose,
  settings,
}: PrintStorePosterModalProps) {
  const storeName = settings?.name || 'Notre Magasin';
  
  // URL encodée par défaut : domaine actuel avec ?mode=client_scan
  const defaultScanUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?mode=client_scan` 
    : 'https://votre-magasin.com/?mode=client_scan';

  const [targetUrl, setTargetUrl] = useState<string>(defaultScanUrl);
  const [paperFormat, setPaperFormat] = useState<'a4' | 'a5'>('a4');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const posterRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setIsCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {
      toast.error("Impossible de copier automatiquement");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-6 text-white my-auto max-h-[95vh] overflow-y-auto"
        >
          {/* ── Entête de la Modale ── */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <QrCode size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Affiche QR Code Magasin pour Clients
                </h3>
                <p className="text-xs text-slate-400">
                  Imprimez et affichez ce poster en rayon pour permettre aux clients de scanner les prix avec leur téléphone.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Configuration & Aperçu ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche : Réglages */}
            <div className="lg:col-span-5 space-y-5">
              {/* Choix Format */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Format du papier d'impression :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperFormat('a4')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paperFormat === 'a4'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Format A4 (Mural / Entrée)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperFormat('a5')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paperFormat === 'a5'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Format A5 (Présentoir Rayon)
                  </button>
                </div>
              </div>

              {/* URL cible */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  URL ciblée par le QR Code :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                    title="Copier le lien"
                  >
                    {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-slate-500">
                    💡 <b>Astuce Wi-Fi local :</b> Si votre caisse tourne sur un réseau local sans Internet public, vous pouvez mettre l'IP de la caisse (ex: <code className="text-emerald-400">http://192.168.1.50:3000/?mode=client_scan</code>) pour que les clients connectés au Wi-Fi scannent en local.
                  </p>
                </div>
              </div>

              {/* Raccourci tester sur ce navigateur */}
              <div className="pt-2">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <ExternalLink size={14} /> Tester le scanner client dans un nouvel onglet
                </a>
              </div>

              {/* Bouton d'Impression */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Printer size={18} />
                  Imprimer l'Affiche ({paperFormat.toUpperCase()})
                </button>
              </div>
            </div>

            {/* Colonne Droite : Prévisualisation Affiche (Rendu Print) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-400 mb-2">
                Aperçu avant impression :
              </span>

              {/* Conteneur imprimable */}
              <div
                id="nexus-printable-store-poster"
                ref={posterRef}
                className={`bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 border-emerald-500 flex flex-col items-center justify-between text-center transition-all ${
                  paperFormat === 'a4' 
                    ? 'w-full max-w-sm aspect-[1/1.414]' 
                    : 'w-full max-w-xs aspect-[1/1.414]'
                }`}
              >
                {/* Haut Affiche */}
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    {(settings?.logoUrl || (settings as any)?.logo) ? (
                      <SafeImage src={settings?.logoUrl || (settings as any)?.logo} alt={storeName} className="h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl">
                        {storeName.charAt(0)}
                      </div>
                    )}
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {storeName}
                    </h2>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-emerald-800 text-[11px] font-extrabold uppercase tracking-wide">
                    Service Client Gratuit
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Vérifiez vos prix en un instant !
                  </h3>
                  <p className="text-xs font-semibold text-slate-600" dir="rtl">
                    امسح الرمز بهاتفك لمعرفة أسعار المنتجات
                  </p>
                </div>

                {/* QR Code Central */}
                <div className="my-3 p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-md">
                  <QRCodeSVG
                    value={targetUrl}
                    size={paperFormat === 'a4' ? 180 : 140}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Instructions 3 Étapes */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1.5 text-[11px] text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                    <span><b>Scannez ce QR Code</b> avec votre appareil photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                    <span><b>Pointez le code-barres</b> de n'importe quel article</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                    <span><b>Le prix en DA</b> s'affiche directement sur votre écran !</span>
                  </div>
                </div>

                {/* Bas Affiche */}
                <div className="w-full text-center pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-medium">
                  Aucune application à installer • 100% Gratuit & Instantané
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Style CSS d'impression dédié pour n'imprimer QUE l'affiche sans le reste de l'interface */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #nexus-printable-store-poster, #nexus-printable-store-poster * {
            visibility: visible !important;
          }
          #nexus-printable-store-poster {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: ${paperFormat === 'a4' ? '190mm' : '135mm'} !important;
            height: ${paperFormat === 'a4' ? '270mm' : '190mm'} !important;
            box-shadow: none !important;
            border-width: 6px !important;
            padding: 25mm 15mm !important;
            margin: 0 !important;
            z-index: 999999 !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

export default PrintStorePosterModal;
