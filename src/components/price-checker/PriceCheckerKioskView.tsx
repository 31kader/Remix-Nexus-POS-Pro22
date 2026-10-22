import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, AlertCircle, Package, Lock, Barcode as BarcodeIcon, 
  RefreshCw, Tag, ShieldCheck 
} from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui/SafeImage';

export interface PriceCheckerKioskViewProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  focusScannerInput: () => void;
  handleAttemptExit: () => void;
  foundProduct: Product | null;
  notFoundCode: string | null;
  isScanning: boolean;
  setIsScanning: React.Dispatch<React.SetStateAction<boolean>>;
  facingMode: 'environment' | 'user';
  setFacingMode: React.Dispatch<React.SetStateAction<'environment' | 'user'>>;
  cameraError: string | null;
  settings: CompanySettings;
  resetCountdown: number;
  handleAddToRemoteQueue: (p: Product, qty: number, silent?: boolean) => void;
  showPinModal: boolean;
  setShowPinModal: (show: boolean) => void;
  enteredPin: string;
  setEnteredPin: (pin: string) => void;
  pinError: boolean;
  handlePinDigitPress: (digit: string) => void;
  handlePinBackspace: () => void;
  toggleKioskMode: (enabled: boolean) => void;
  pinDialogTimeout: number;
}

export const PriceCheckerKioskView: React.FC<PriceCheckerKioskViewProps> = ({
  inputRef,
  searchTerm,
  setSearchTerm,
  focusScannerInput,
  handleAttemptExit,
  foundProduct,
  notFoundCode,
  isScanning,
  setIsScanning,
  facingMode,
  setFacingMode,
  cameraError,
  settings,
  resetCountdown,
  handleAddToRemoteQueue,
  showPinModal,
  setShowPinModal,
  enteredPin,
  setEnteredPin,
  pinError,
  handlePinDigitPress,
  handlePinBackspace,
  toggleKioskMode,
  pinDialogTimeout
}) => {
  return (
    <div 
      onClick={focusScannerInput}
      className="fixed inset-0 z-[9999] bg-[#060913] text-white flex flex-col select-none overflow-hidden font-sans"
    >
      {/* Champ de scan invisible constamment focalisé pour la douchette */}
      <input
        ref={inputRef}
        id="price-checker-kiosk-input"
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="absolute -top-96 opacity-0 pointer-events-none"
        autoFocus
      />

      {/* Bouton Cadenas Discret pour le Personnel */}
      <div className="absolute top-4 right-4 z-40">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAttemptExit();
          }}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-slate-600 hover:text-slate-300 opacity-15 hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm"
          title="Accès Personnel : Quitter ou déverrouiller la borne"
        >
          <Lock size={18} />
        </button>
      </div>

      {/* Zone Centrale Dynamique (Plein Écran Total) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Lueur d'ambiance d'arrière-plan */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* A. ÉTAT D'ACCUEIL */}
          {!foundProduct && !notFoundCode && (
            <motion.div
              key="idle-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl text-center flex flex-col items-center justify-center space-y-6 z-10"
            >
              {isScanning ? (
                <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden border-2 border-emerald-500 bg-black shadow-[0_0_60px_rgba(16,185,129,0.35)] flex items-center justify-center">
                  <video id="camera-reader-price" className="w-full h-full object-cover" playsInline muted autoPlay></video>
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)] animate-bounce" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md rounded-xl text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    title="Changer de caméra (avant/arrière)"
                  >
                    <RefreshCw size={13} />
                    <span>{facingMode === 'environment' ? 'Caméra Arrière' : 'Caméra Avant'}</span>
                  </button>
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-emerald-500/90 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Scan Caméra Actif
                  </div>
                </div>
              ) : (
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 shadow-2xl flex items-center justify-center p-6 overflow-hidden">
                  <BarcodeIcon size={120} className="text-slate-300/40" />
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,1)] animate-bounce" />
                  <div className="absolute bottom-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/40">
                    Douchette Active
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 max-w-md">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
                  👋 Bonjour !
                </h2>
                <p className="text-lg md:text-2xl font-bold text-emerald-400">
                  {isScanning ? "Présentez le code-barres devant la caméra" : "Présentez votre article devant le lecteur"}
                </p>
                <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto">
                  {isScanning 
                    ? "Cadrez le code-barres dans le rectangle vert pour entendre et afficher son prix."
                    : "Passez le code-barres sous le lecteur ou activez la caméra de l'appareil."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScanning(prev => !prev);
                    focusScannerInput();
                  }}
                  className={cn(
                    "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-95 border",
                    isScanning 
                      ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400/50 shadow-rose-900/30" 
                      : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40 hover:border-emerald-400"
                  )}
                >
                  <Camera size={18} />
                  <span>{isScanning ? "Désactiver la Caméra" : "📷 Scanner avec la Caméra de l'Appareil"}</span>
                </button>

                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Douchette USB / Bluetooth Prête
                </div>
              </div>
            </motion.div>
          )}

          {/* B. ÉTAT ARTICLE TROUVÉ */}
          {foundProduct && (
            <motion.div
              key={foundProduct.id}
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-2 border-emerald-500/60 rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(16,185,129,0.25)] backdrop-blur-xl z-10 relative flex flex-col md:flex-row items-center gap-8"
            >
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                <SafeImage 
                  src={foundProduct.imageUrl} 
                  alt={foundProduct.name} 
                  className="w-full h-full object-contain drop-shadow-xl" 
                  fallback={<Package size={80} className="text-emerald-400/60" />} 
                />
              </div>

              <div className="flex-1 w-full text-center md:text-left space-y-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-widest mb-2">
                    ✅ Article Vérifié • En Rayon
                  </span>
                  <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-snug">
                    {foundProduct.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Code: {foundProduct.barcode || foundProduct.sku || 'N/A'}
                  </p>
                </div>

                <div className="py-4 px-6 md:px-8 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl flex items-baseline justify-center md:justify-start gap-3 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                  <span className="text-6xl md:text-8xl font-black text-emerald-400 font-mono tracking-tight">
                    {Number(foundProduct.price || 0).toFixed(2)}
                  </span>
                  <span className="text-3xl md:text-4xl font-black text-emerald-300 uppercase">
                    {settings?.currency || 'DA'}
                  </span>
                </div>

                <div className="pt-2">
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${(resetCountdown / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-between">
                    <span>Prochain article à tout moment...</span>
                    <span className="text-emerald-400 font-mono font-bold">Retour accueil dans {resetCountdown}s</span>
                  </p>
                </div>
              </div>

              <div className="absolute top-4 right-4 md:bottom-4 md:right-4 md:top-auto z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToRemoteQueue(foundProduct, 1, true);
                  }}
                  className="opacity-30 hover:opacity-100 transition-opacity duration-300 px-3 py-2 bg-slate-900/90 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
                  title="Réservé Personnel : Ajouter à la file d'étiquettes à imprimer sur le poste principal"
                >
                  <Tag size={13} className="text-indigo-400" />
                  <span>+1 File Étiquette</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* C. ÉTAT ARTICLE NON TROUVÉ */}
          {notFoundCode && !foundProduct && (
            <motion.div
              key="not-found-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl p-8 bg-rose-950/80 border-2 border-rose-500/60 rounded-3xl text-center space-y-4 backdrop-blur-xl shadow-2xl z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                <AlertCircle size={44} />
              </div>
              <h3 className="text-2xl font-black text-rose-300 uppercase">
                Article Non Répertorié
              </h3>
              <p className="text-sm text-rose-200/80 max-w-md mx-auto">
                Le code <span className="font-mono font-bold text-white">« {notFoundCode} »</span> n'a pas été trouvé. Veuillez vous adresser à un conseiller ou au personnel de caisse.
              </p>
              <div className="pt-2">
                <span className="text-xs font-mono text-rose-300">Retour automatique dans {resetCountdown}s...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Pied de page épuré */}
      <footer className="py-3 px-6 text-center text-xs text-slate-500/70 shrink-0">
        <span>Merci de votre visite • Paiement et encaissement en caisse centrale</span>
      </footer>

      {/* MODALE DE SÉCURITÉ PIN */}
      {showPinModal && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-7 w-full max-w-sm flex flex-col items-center shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Lock size={28} />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black uppercase text-white tracking-wide">Accès Réservé au Personnel</h4>
              <p className="text-xs text-slate-400">Entrez votre code PIN pour déverrouiller la borne</p>
            </div>

            <div className={cn(
              "flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border transition-all",
              pinError ? "border-rose-500 bg-rose-500/10 animate-bounce" : "border-slate-800"
            )}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all",
                    enteredPin.length > idx 
                      ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] scale-110" 
                      : "bg-slate-800 border border-slate-700"
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigitPress(digit)}
                  className="py-3.5 bg-slate-800/80 hover:bg-indigo-600 rounded-xl font-black text-lg text-white transition-colors cursor-pointer border border-slate-700/60 active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinBackspace}
                className="py-3.5 bg-slate-800/50 hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/40"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={() => handlePinDigitPress('0')}
                className="py-3.5 bg-slate-800/80 hover:bg-indigo-600 rounded-xl font-black text-lg text-white transition-colors cursor-pointer border border-slate-700/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleKioskMode(false);
                  setShowPinModal(false);
                  setEnteredPin('');
                }}
                className="py-3.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl font-black text-[10px] uppercase transition-colors cursor-pointer border border-indigo-500/40"
                title="Passer en mode gestion rayon"
              >
                Gestion
              </button>
            </div>

            <div className="w-full pt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Anti-intrusion
              </span>
              <span className="text-indigo-400 font-mono font-bold">Retour borne dans {pinDialogTimeout}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
