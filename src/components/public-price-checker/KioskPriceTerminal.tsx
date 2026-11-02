import React from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  Volume2, VolumeX, Maximize2, Minimize2,
  Lock, Store, Camera, CameraOff
} from 'lucide-react';
import { Product, CompanySettings, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { useKioskPriceLogic } from './useKioskPriceLogic';
import { KioskProductDisplay } from './KioskProductDisplay';
import { KioskPinModal } from './KioskPinModal';

interface KioskPriceTerminalProps {
  products: Product[];
  settings: CompanySettings;
  categories?: Category[];
  brands?: Brand[];
  promotions?: Promotion[];
  onExit?: () => void;
}

export function KioskPriceTerminal({
  products = [],
  settings,
  categories = [],
  brands = [],
  promotions = [],
  onExit,
}: KioskPriceTerminalProps) {
  const {
    currentTime,
    foundProduct,
    notFoundCode,
    voiceEnabled,
    setVoiceEnabled,
    isCameraActive,
    setIsCameraActive,
    isFullscreen,
    toggleFullscreen,
    countdown,
    showPinModal,
    setShowPinModal,
    enteredPin,
    pinError,
    handlePinDigit,
    handlePinDelete,
    openPinModal,
    videoRef,
    storeName
  } = useKioskPriceLogic({
    products,
    settings,
    promotions,
    onExit
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* ── Barre Supérieure de la Borne ── */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {(settings?.logoUrl || (settings as any)?.logo) ? (
            <SafeImage 
              src={settings?.logoUrl || (settings as any)?.logo} 
              alt={storeName} 
              className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 border border-slate-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Store size={22} />
            </div>
          )}
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white line-clamp-1">
              {storeName}
            </h1>
            <p className="text-[11px] text-cyan-400 font-semibold tracking-wider uppercase">
              Borne Prix Rayon • Kiosque Libre-Service
            </p>
          </div>
        </div>

        {/* Centre : Horloge magasin */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300">
          <span>{currentTime}</span>
        </div>

        {/* Droite : Contrôles Borne & Cadenas de Sortie */}
        <div className="flex items-center gap-2">
          {/* Synthèse vocale On/Off */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              voiceEnabled 
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={voiceEnabled ? 'Voix activée' : 'Voix coupée'}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Caméra tablette On/Off */}
          <button
            type="button"
            onClick={() => setIsCameraActive(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isCameraActive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={isCameraActive ? 'Caméra active' : 'Caméra désactivée'}
          >
            {isCameraActive ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>

          {/* Plein écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Mode plein écran"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Cadenas Sortie Borne (Protégé par PIN) */}
          <button
            type="button"
            onClick={openPinModal}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-all ml-1 cursor-pointer"
            title="Sortir du mode kiosque (Réservé au personnel)"
          >
            <Lock size={18} />
          </button>
        </div>
      </header>

      {/* ── Contenu Principal de la Borne ── */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
        <AnimatePresence mode="wait">
          <KioskProductDisplay
            key={foundProduct ? `prod-${foundProduct.id}` : notFoundCode ? `notfound-${notFoundCode}` : 'idle'}
            foundProduct={foundProduct}
            notFoundCode={notFoundCode}
            settings={settings}
            categories={categories}
            brands={brands}
            promotions={promotions}
            countdown={countdown}
            isCameraActive={isCameraActive}
            videoRef={videoRef}
          />
        </AnimatePresence>
      </main>

      {/* Modal Code PIN de Sortie Kiosque */}
      <KioskPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        enteredPin={enteredPin}
        pinError={pinError}
        onDigit={handlePinDigit}
        onDelete={handlePinDelete}
      />
    </div>
  );
}

export default KioskPriceTerminal;
