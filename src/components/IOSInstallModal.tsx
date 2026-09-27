import React, { useState, useEffect } from 'react';
import { X, Smartphone, Share, PlusSquare, CheckCircle2, Apple, Download, QrCode, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onAndroidInstall?: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onAndroidInstall,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (!isOpen) return;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('android')) {
      setActivePlatform('android');
    } else {
      setActivePlatform('ios');
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Installer Nexus POS Pro sur Smartphone
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Compatible iPhone (iOS Plein Écran) & Android (APK / PWA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Switcher */}
        <div className="p-3 bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActivePlatform('ios')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePlatform === 'ios'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <Apple size={16} />
            iPhone / iPad (iOS)
          </button>
          <button
            type="button"
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePlatform === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <Smartphone size={16} />
            Android (APK / Direct)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-zinc-200">
          {activePlatform === 'ios' ? (
            <>
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-slate-900 dark:text-white mb-0.5">
                    Mode Application Native iOS (Sans App Store)
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Sur iPhone, Nexus POS Pro s'installe en mode <strong>Plein Écran Natif (WebClip iOS)</strong> avec icône sur l'écran d'accueil, caméra scanner code-barres et base de données Hors-Ligne (IndexedDB).
                  </p>
                </div>
              </div>

              <a
                href="/NexusPOSPro-iPhone.mobileconfig"
                download="NexusPOSPro-iPhone.mobileconfig"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download size={16} />
                Télécharger le Profil d'Installation iPhone (.mobileconfig)
              </a>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Ouvrez ce lien dans <span className="text-indigo-600 dark:text-indigo-400">Safari</span> sur votre iPhone
                    </p>
                    <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                      Scannez le QR Code ci-dessous avec l'appareil photo de votre iPhone.
                    </p>
                  </div>
                  <ExternalLink size={18} className="text-indigo-500 shrink-0" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Appuyez sur le bouton <span className="text-indigo-600 dark:text-indigo-400">Partager</span> en bas de Safari
                    </p>
                    <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                      L'icône carrée avec une flèche vers le haut située dans la barre inférieure de l'iPhone.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Share size={18} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Choisissez <span className="text-emerald-600 dark:text-emerald-400">« Sur l'écran d'accueil »</span> puis <span className="text-emerald-600 dark:text-emerald-400">« Ajouter »</span>
                    </p>
                    <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                      L'application <strong>Nexus POS Pro</strong> apparaît sur votre iPhone comme une application native plein écran !
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <PlusSquare size={18} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-slate-900 dark:text-white mb-0.5">
                    Double Option Android : Fichier `.APK` Natif ou Installation Directe
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Vous pouvez installer le fichier <strong>`NexusPOSPro-1.2.14.apk`</strong> directement sur votre téléphone Android, ou l'installer en 1 clic depuis Chrome.
                  </p>
                </div>
              </div>

              {deferredPrompt && onAndroidInstall && (
                <button
                  type="button"
                  onClick={() => {
                    onAndroidInstall();
                    onClose();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Download size={18} />
                  Installer Maintenant en 1 Clic sur cet appareil
                </button>
              )}
            </div>
          )}

          {/* QR Code for scanning from Smartphone */}
          {qrDataUrl && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={qrDataUrl}
                alt="QR Code Installation Smartphone"
                className="w-28 h-28 rounded-xl border border-slate-200 bg-white p-1.5 shrink-0"
              />
              <div className="text-center sm:text-left text-xs space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <QrCode size={15} className="text-indigo-500" />
                  Scanner avec votre iPhone ou Android
                </div>
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Pointez l'appareil photo de votre iPhone ou smartphone Android sur ce QR Code pour ouvrir et installer instantanément <strong>Nexus POS Pro</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
