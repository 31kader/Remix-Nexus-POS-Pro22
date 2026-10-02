import React, { useState, useEffect } from 'react';
import { X, Smartphone, Share, PlusSquare, CheckCircle2, Apple, Download, QrCode, Wifi, Globe, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onAndroidInstall?: () => void;
}

const GITHUB_APK_DIRECT_URL = 'https://github.com/31kader/Remix-Nexus-POS-Pro22/releases/download/v1.2.20/NexusPOSPro-1.2.20.apk';

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onAndroidInstall,
}) => {
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios'>('android');
  const [lanUrl, setLanUrl] = useState<string>('http://192.168.1.100:3000');
  const [apkCloudQrDataUrl, setApkCloudQrDataUrl] = useState<string>('');
  const [lanQrDataUrl, setLanQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('iphone') || ua.includes('ipad')) {
      setActivePlatform('ios');
    } else {
      setActivePlatform('android');
    }

    // 1. Générer le QR Code de téléchargement direct APK Cloud (fonctionne en 4G/5G/Wi-Fi partout)
    QRCode.toDataURL(GITHUB_APK_DIRECT_URL, {
      width: 220,
      margin: 1,
      color: { dark: '#065f46', light: '#ffffff' }
    })
      .then(url => setApkCloudQrDataUrl(url))
      .catch(() => {});

    // 2. Détecter la vraie adresse IP Wi-Fi locale du PC (au lieu de localhost qui échoue sur téléphone)
    const detectLanIp = async () => {
      try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
          const data = await res.json();
          if (data?.lanUrl && !data.lanUrl.includes('127.0.0.1') && !data.lanUrl.includes('localhost')) {
            setLanUrl(data.lanUrl);
            return;
          }
        }
      } catch (_) {}

      // Fallback si window.location n'est pas localhost
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          setLanUrl(window.location.origin);
        }
      }
    };
    detectLanIp();
  }, [isOpen]);

  useEffect(() => {
    if (!lanUrl) return;
    QRCode.toDataURL(lanUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#1e1b4b', light: '#ffffff' }
    })
      .then(url => setLanQrDataUrl(url))
      .catch(() => {});
  }, [lanUrl]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedUrl(text);
    toast.success('Lien copié dans le presse-papiers !');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Installer Nexus POS Pro sur Smartphone (QR Code)
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Téléchargement direct `.APK` (Android 4G/Wi-Fi) & Connexion Réseau Wi-Fi (iPhone / Android)
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
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePlatform === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <Smartphone size={16} />
            1. Smartphone Android (Fichier .APK & Wi-Fi)
          </button>
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
            2. iPhone / iPad (iOS Safari)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-zinc-200">
          {activePlatform === 'android' ? (
            <div className="space-y-4">
              {/* Option A: Direct APK Download via Internet (Works everywhere, 4G/5G/WiFi) */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/40 flex flex-col sm:flex-row items-center gap-4">
                {apkCloudQrDataUrl && (
                  <div className="bg-white p-2 rounded-xl border border-emerald-200 shadow-sm shrink-0 text-center">
                    <img
                      src={apkCloudQrDataUrl}
                      alt="QR Code APK Direct"
                      className="w-32 h-32 mx-auto"
                    />
                    <span className="block text-[10px] font-black text-emerald-700 uppercase mt-1">
                      Scan 4G / 5G / Wi-Fi
                    </span>
                  </div>
                )}
                <div className="flex-1 space-y-2 text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                    <Globe size={12} /> Méthode 1 (Recommandée) — Téléchargement Direct .APK
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Télécharger et installer `NexusPOSPro-1.2.20.apk` (Même en 4G/5G)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Scannez ce QR Code avec l'appareil photo de votre téléphone Android. Il télécharge directement l'application native <strong>NexusPOSPro-1.2.20.apk</strong> depuis le serveur Cloud (aucun réglage Wi-Fi requis).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={GITHUB_APK_DIRECT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs"
                    >
                      <Download size={14} /> Télécharger l'APK sur ce PC
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(GITHUB_APK_DIRECT_URL)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedUrl === GITHUB_APK_DIRECT_URL ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      Copier le lien APK
                    </button>
                  </div>
                </div>
              </div>

              {/* Option B: Local Wi-Fi Connection */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                {lanQrDataUrl && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0 text-center">
                    <img
                      src={lanQrDataUrl}
                      alt="QR Code Wi-Fi Local"
                      className="w-28 h-28 mx-auto"
                    />
                    <span className="block text-[10px] font-black text-indigo-700 uppercase mt-1">
                      Scan Même Wi-Fi
                    </span>
                  </div>
                )}
                <div className="flex-1 space-y-2 text-left w-full">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                    <Wifi size={12} /> Méthode 2 — Connexion Locale Wi-Fi au PC Caisse
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">
                    Si votre téléphone est connecté au <strong>même réseau Wi-Fi</strong> que cet ordinateur, scannez ce QR Code pour ouvrir la caisse en direct :
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lanUrl}
                      onChange={e => setLanUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lanUrl)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              </div>

              {deferredPrompt && onAndroidInstall && (
                <button
                  type="button"
                  onClick={() => {
                    onAndroidInstall();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Download size={18} />
                  Installer Maintenant en 1 Clic sur cet appareil
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Explanation of why iPhone uses Safari WebApp + Local IP */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs leading-relaxed">
                <p className="font-black text-amber-900 dark:text-amber-300 uppercase mb-1">
                  💡 Pourquoi le scan ne marchait pas avant sur iPhone ?
                </p>
                <p className="text-amber-800 dark:text-amber-200/80">
                  1) Apple bloque les fichiers <code>.apk</code> (qui sont réservés à Android).<br />
                  2) L'ancien QR Code pointait vers <code>localhost:3000</code>. Désormais, le QR Code ci-dessous utilise <strong>la vraie adresse IP Wi-Fi de votre PC ({lanUrl})</strong>. Assurez-vous que votre iPhone est connecté au <strong>même Wi-Fi</strong> que ce PC.
                </p>
              </div>

              {/* iPhone QR Code + Editable LAN URL */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-500/40 flex flex-col sm:flex-row items-center gap-4">
                {lanQrDataUrl && (
                  <div className="bg-white p-2 rounded-xl border border-indigo-200 shadow-sm shrink-0 text-center">
                    <img
                      src={lanQrDataUrl}
                      alt="QR Code iPhone Safari"
                      className="w-32 h-32 mx-auto"
                    />
                    <span className="block text-[10px] font-black text-indigo-700 uppercase mt-1">
                      Scanner avec iPhone
                    </span>
                  </div>
                )}
                <div className="flex-1 space-y-2 text-left w-full">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                    <Wifi size={12} /> Adresse Réseau Wi-Fi de votre Caisse
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    Scannez ce QR Code avec l'appareil photo de votre iPhone (connecté au même Wi-Fi que votre PC) ou tapez cette adresse dans <strong>Safari</strong> :
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lanUrl}
                      onChange={e => setLanUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lanUrl)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Steps for iPhone Home Screen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
                  <div className="flex items-center gap-2 font-black text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Ouvrir dans Safari
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                    Scannez le QR Code ci-dessus pour ouvrir <strong>{lanUrl}</strong> dans Safari.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
                  <div className="flex items-center gap-2 font-black text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Bouton Partager <Share size={13} />
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                    Appuyez sur l'icône <strong>Partager</strong> (carré avec flèche vers le haut) en bas de Safari.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
                  <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Sur l'écran d'accueil <PlusSquare size={13} />
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                    Appuyez sur <strong>« Sur l'écran d'accueil »</strong> puis <strong>« Ajouter »</strong>. L'icône Nexus POS Pro est installée !
                  </p>
                </div>
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
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
