import React from 'react';
import { Button, Modal } from '../../ui';
import { SafeImage } from '../../ui/SafeImage';

export interface VoucherImageZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
  productName: string;
}

export const VoucherImageZoomModal: React.FC<VoucherImageZoomModalProps> = ({
  imageUrl,
  onClose,
  productName
}) => {
  if (!imageUrl) return null;

  return (
    <Modal
      isOpen={!!imageUrl}
      onClose={onClose}
      title="📸 Photo Scannée du Bon d'Achat (Achat Intelligent)"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-center">
        <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-2">
          <SafeImage
            src={imageUrl}
            alt="Photo du bon d'achat scanné"
            className="max-w-full h-auto mx-auto rounded-lg"
            optimizeWidth={1200}
          />
        </div>
        <div className="flex justify-end gap-3">
          <a
            href={imageUrl}
            download={`Bon_Achat_${productName}.jpg`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Télécharger l'image
          </a>
          <Button onClick={onClose} variant="secondary">
            Fermer l'aperçu
          </Button>
        </div>
      </div>
    </Modal>
  );
};
