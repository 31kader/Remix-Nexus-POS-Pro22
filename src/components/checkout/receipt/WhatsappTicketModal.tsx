import React, { useState } from 'react';
import { MessageSquare, Send, X, Phone, Check } from 'lucide-react';
import { WhatsappTicketService } from '../../../services/whatsapp/whatsappTicketService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    total: number;
    paymentMethod: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  } | null;
  defaultPhone?: string;
  storeName?: string;
}

export const WhatsappTicketModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaction,
  defaultPhone = '',
  storeName = 'NEXUS DISTRIBUTION'
}) => {
  if (!isOpen || !transaction) return null;

  const [phone, setPhone] = useState(defaultPhone);
  const [isSent, setIsSent] = useState(false);

  const message = WhatsappTicketService.formatTicketMessage({
    transactionId: transaction.id,
    storeName,
    items: transaction.items,
    totalAmount: transaction.total,
    paymentMethod: transaction.paymentMethod
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    WhatsappTicketService.sendTicketViaWhatsApp(phone, message);
    setIsSent(true);
    setTimeout(() => {
      onClose();
      setIsSent(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">E-Ticket WhatsApp</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Reçu sans papier écologique</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form & Preview */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Numéro WhatsApp du client</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 0550 12 34 56"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aperçu du message</label>
            <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {message}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!phone.trim() || isSent}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              {isSent ? (
                <>
                  <Check className="w-4 h-4" /> Envoyé !
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Envoyer sur WhatsApp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
