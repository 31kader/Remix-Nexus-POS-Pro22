import React from 'react';

export interface ElementsConfigSectionProps {
  showName: boolean;
  setShowName: (v: boolean) => void;
  showPrice: boolean;
  setShowPrice: (v: boolean) => void;
  showImage: boolean;
  setShowImage: (v: boolean) => void;
  showSku: boolean;
  setShowSku: (v: boolean) => void;
  showStock: boolean;
  setShowStock: (v: boolean) => void;
  showBarcode: boolean;
  setShowBarcode: (v: boolean) => void;
  showQr: boolean;
  setShowQr: (v: boolean) => void;
  showDescription: boolean;
  setShowDescription: (v: boolean) => void;
  nameFontSize: number;
  setNameFontSize: (s: number) => void;
  priceFontSize: number;
  setPriceFontSize: (s: number) => void;
  imageHeight: number;
  setImageHeight: (h: number) => void;
  barcodeHeight: number;
  setBarcodeHeight: (h: number) => void;
  qrSize: number;
  setQrSize: (s: number) => void;
}

export const ElementsConfigSection: React.FC<ElementsConfigSectionProps> = ({
  showName,
  setShowName,
  showPrice,
  setShowPrice,
  showImage,
  setShowImage,
  showSku,
  setShowSku,
  showStock,
  setShowStock,
  showBarcode,
  setShowBarcode,
  showQr,
  setShowQr,
  showDescription,
  setShowDescription,
  nameFontSize,
  setNameFontSize,
  priceFontSize,
  setPriceFontSize,
  imageHeight,
  setImageHeight,
  barcodeHeight,
  setBarcodeHeight,
  qrSize,
  setQrSize
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
          Éléments Affichés sur chaque Carte Article
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Nom Article', val: showName, set: setShowName },
            { label: 'Prix de Vente', val: showPrice, set: setShowPrice },
            { label: 'Photo Article', val: showImage, set: setShowImage },
            { label: 'Réf / SKU', val: showSku, set: setShowSku },
            { label: 'Stock Restant', val: showStock, set: setShowStock },
            { label: 'Code-Barres 1D', val: showBarcode, set: setShowBarcode },
            { label: 'QR Code Article', val: showQr, set: setShowQr },
            { label: 'Description', val: showDescription, set: setShowDescription }
          ].map((el, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold cursor-pointer"
            >
              <input
                type="checkbox"
                checked={el.val}
                onChange={e => el.set(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded"
              />
              <span>{el.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Police Nom ({nameFontSize}px)
          </label>
          <input
            type="range"
            min={8}
            max={16}
            value={nameFontSize}
            onChange={e => setNameFontSize(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Police Prix ({priceFontSize}px)
          </label>
          <input
            type="range"
            min={10}
            max={22}
            value={priceFontSize}
            onChange={e => setPriceFontSize(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Hauteur Photo ({imageHeight}px)
          </label>
          <input
            type="range"
            min={60}
            max={160}
            value={imageHeight}
            onChange={e => setImageHeight(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Haut. Code-Barres ({barcodeHeight}px)
          </label>
          <input
            type="range"
            min={15}
            max={50}
            value={barcodeHeight}
            onChange={e => setBarcodeHeight(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Taille QR Code ({qrSize}px)
          </label>
          <input
            type="range"
            min={25}
            max={70}
            value={qrSize}
            onChange={e => setQrSize(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
        </div>
      </div>
    </div>
  );
};
