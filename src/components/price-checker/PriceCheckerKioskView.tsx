import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, AlertCircle, Lock, Barcode as BarcodeIcon, 
  RefreshCw 
} from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { KioskSecurityPinModal } from './KioskSecurityPinModal';
import { KioskFoundProductCard } from './KioskFoundProductCard';

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
            <KioskFoundProductCard
              foundProduct={foundProduct}
              settings={settings}
              resetCountdown={resetCountdown}
              handleAddToRemoteQueue={handleAddToRemoteQueue}
            />
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
      <KioskSecurityPinModal
        showPinModal={showPinModal}
        setShowPinModal={setShowPinModal}
        enteredPin={enteredPin}
        setEnteredPin={setEnteredPin}
        pinError={pinError}
        handlePinDigitPress={handlePinDigitPress}
        handlePinBackspace={handlePinBackspace}
        toggleKioskMode={toggleKioskMode}
        pinDialogTimeout={pinDialogTimeout}
      />
    </div>
  );
};
