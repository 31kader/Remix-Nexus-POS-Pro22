import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, CheckCircle2 } from 'lucide-react';
import { MobileCartonReception } from '../../mobile/MobileCartonReception';
import { Product, Supplier } from '../../../types';

interface CartonReceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDirectIntakeOpen: boolean;
  setIsDirectIntakeOpen: (v: boolean) => void;
  lanIp: string;
  products: Product[];
  suppliers: Supplier[];
  addToCart: (item: any) => void;
}

export const CartonReceptionModal: React.FC<CartonReceptionModalProps> = ({
  isOpen,
  onClose,
  isDirectIntakeOpen,
  setIsDirectIntakeOpen,
  lanIp,
  products,
  suppliers,
  addToCart
}) => {
  const qrUrl = `http://${lanIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')}:${typeof window !== 'undefined' ? (window.location.port || '3000') : '3000'}/#carton-reception`;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-md w-full bg-industrial-900 border border-industrial-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
                <Smartphone size={18} />
                <span>Réception Cartons Mobile</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-industrial-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center mx-auto shadow-inner w-56 h-56">
              <QRCodeSVG
                value={qrUrl}
                size={192}
                level="M"
                includeMargin={true}
              />
            </div>

            {/* URL & Instructions */}
            <div className="space-y-2 text-center">
              <p className="text-xs text-industrial-300 font-medium">
                Scannez ce QR Code avec l'appareil photo du smartphone Android de l'agent :
              </p>
              <div className="p-2 rounded-lg bg-industrial-950 border border-industrial-800 text-[11px] font-mono text-amber-400 select-all break-all">
                {qrUrl}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-industrial-950/70 border border-industrial-800/80 space-y-1.5 text-[11px] text-industrial-400">
              <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                1. Aucun scan de code-barres requis
              </p>
              <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                2. L'agent prend la photo du carton physique (12 pcs)
              </p>
              <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                3. Le produit et son prix sortent directement dans ce panier !
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsDirectIntakeOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-industrial-950 font-black text-xs uppercase tracking-wider transition-all"
              >
                Tester sur cet écran
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de test direct Réception Cartons */}
      {isDirectIntakeOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-industrial-950 border border-industrial-700 shadow-2xl">
            <MobileCartonReception
              products={products}
              suppliers={suppliers}
              onBackToPos={() => setIsDirectIntakeOpen(false)}
              onAddToCartDirectly={(item) => {
                addToCart(item);
                setIsDirectIntakeOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
