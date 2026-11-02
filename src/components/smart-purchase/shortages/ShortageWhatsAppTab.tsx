import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '../../ui';
import { 
  openWhatsAppDirectShare, 
  formatAlgerianWhatsAppPhone 
} from './shortageExportHelpers';
import { cn } from '../../../lib/utils';

interface ShortageWhatsAppTabProps {
  hasItems: boolean;
  recipientPhone: string;
  onRecipientPhoneChange: (phone: string) => void;
  whatsAppText: string;
}

export const ShortageWhatsAppTab: React.FC<ShortageWhatsAppTabProps> = ({
  hasItems,
  recipientPhone,
  onRecipientPhoneChange,
  whatsAppText
}) => {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch (err) {
      console.error('Échec de la copie dans le presse-papier:', err);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Carte d'envoi direct WhatsApp */}
      <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-mono uppercase text-emerald-300 font-bold block mb-1">
              Numéro WhatsApp du Fournisseur / Commercial :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => onRecipientPhoneChange(e.target.value)}
                placeholder="Ex: 0555 12 34 56 ou +213 661 ..."
                className="bg-industrial-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400 w-full sm:w-72"
              />
              {recipientPhone && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-500/20">
                  +{formatAlgerianWhatsAppPhone(recipientPhone) || 'Invalide'}
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            disabled={!hasItems}
            onClick={() => openWhatsAppDirectShare({ text: whatsAppText, phoneNumber: recipientPhone })}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <MessageSquare size={16} />
            <span>Ouvrir sur WhatsApp</span>
            <ExternalLink size={13} />
          </Button>
        </div>

        <p className="text-[11px] text-emerald-400/80 font-mono">
          Ouvre instantanément WhatsApp Web sur PC ou l'application WhatsApp sur smartphone avec le message pré-rempli.
        </p>
      </div>

      {/* Aperçu du message et bouton de copie */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-industrial-400">
            Aperçu du texte de commande :
          </span>
          <Button
            type="button"
            onClick={handleCopyWhatsApp}
            className={cn(
              "text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
              copiedWhatsApp
                ? "bg-emerald-600 text-white"
                : "bg-industrial-900 border border-industrial-700 hover:border-emerald-500 text-emerald-400 hover:text-white"
            )}
          >
            {copiedWhatsApp ? (
              <>
                <Check size={14} />
                <span>Copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copier le message</span>
              </>
            )}
          </Button>
        </div>

        <textarea
          readOnly
          value={whatsAppText}
          rows={9}
          className="w-full bg-industrial-950 border border-industrial-800 rounded-2xl p-4 font-mono text-xs text-industrial-200 leading-relaxed focus:outline-none resize-none"
        />
      </div>
    </div>
  );
};
