import React from 'react';
import { Modal } from '../ui';
import { History, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Promotion, Transaction, CompanySettings } from '../../types';

interface PromotionPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingPerformancePromo: Promotion | null;
  transactions: Transaction[];
  settings: CompanySettings;
}

export function PromotionPerformanceModal({
  isOpen,
  onClose,
  viewingPerformancePromo,
  transactions,
  settings
}: PromotionPerformanceModalProps) {
  if (!viewingPerformancePromo) return null;

  const promoTransactions = transactions.filter(t => t.promotionId === viewingPerformancePromo.id);
  const totalDiscounted = promoTransactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0);
  const totalRevenue = promoTransactions.reduce((sum, t) => sum + t.total, 0);
  const usageCount = promoTransactions.length;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Performance: ${viewingPerformancePromo.name}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Utilisations</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{usageCount}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Remises</p>
            <p className="text-xl font-bold text-rose-600">{totalDiscounted.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires</p>
            <p className="text-xl font-bold text-emerald-600">{totalRevenue.toFixed(2)} {settings.currency}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <History size={18} /> Historique d'utilisation
          </h4>
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {promoTransactions
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map(t => (
                <div key={t.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Ticket #{t.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{format(new Date(t.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{t.total.toFixed(2)} {settings.currency}</p>
                    <p className="text-xs font-bold text-rose-500">-{t.discountAmount?.toFixed(2)} {settings.currency}</p>
                  </div>
                </div>
              ))}
            {usageCount === 0 && (
              <div className="text-center py-12 text-slate-400 italic">
                Cette promotion n'a pas encore été utilisée.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
