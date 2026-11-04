import React from 'react';
import { Customer, Transaction } from '../../types';
import { CustomerDebtStatementService } from '../../services/customers/customerDebtStatementService';
import { WhatsappTicketService } from '../../services/whatsapp/whatsappTicketService';
import { X, Printer, MessageSquare, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  storeName?: string;
}

export const CustomerDebtStatementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  storeName = 'NEXUS DISTRIBUTION'
}) => {
  if (!isOpen || !customer) return null;

  const summary = CustomerDebtStatementService.computeDebtSummary(customer, transactions);

  const handlePrint = () => {
    const html = CustomerDebtStatementService.generateStatementHtml(summary, storeName);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer.phone) {
      alert('Aucun numéro de téléphone renseigné pour ce client.');
      return;
    }
    const msg = CustomerDebtStatementService.formatDebtReminderWhatsApp(summary, storeName);
    WhatsappTicketService.sendTicketViaWhatsApp(customer.phone, msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Carnet de Dettes & Crédit : {customer.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suivi des impayés et relevé de compte client
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                  Solde Restant Dû
                </span>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {summary.currentBalance.toFixed(2)} DA
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Plafond Autorisé</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {(customer.creditLimit || (customer as any).credit_limit || 0).toFixed(2)} DA
              </span>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
              Historique des Achats & Tickets Concernés
            </div>
            {summary.unpaidTransactions.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 italic">Aucune transaction à crédit enregistrée</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summary.unpaidTransactions.map((t) => (
                      <tr key={t.id} className="dark:text-slate-200">
                        <td className="p-2.5 font-mono text-[11px]">#{t.id.slice(-8).toUpperCase()}</td>
                        <td className="p-2.5 text-slate-500">
                          {new Date((t as any).date || t.timestamp || t.created_at || Date.now()).toLocaleDateString('fr-DZ')}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {(t.total || 0).toFixed(2)} DA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimer A4
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={!customer.phone}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Rappel WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
