import React from 'react';
import { FileText, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { Supplier, CompanySettings } from '../../../types';
import { Button } from '../../ui';
import { cn, formatSafe } from '../../../lib/utils';
import { fr } from 'date-fns/locale';
import { handleDeletePurchaseDb } from '../../smart-purchase/purchaseDbOperations';

interface SupplierPurchasesTabProps {
  viewingDetailsSupplier: Supplier;
  purchases: any[];
  settings: CompanySettings;
  paymentData: any;
  setPaymentData: (d: any) => void;
  setIsPaymentModalOpen: (open: boolean) => void;
  onClose: () => void;
  setViewingPurchaseVoucher: (p: any) => void;
}

export function SupplierPurchasesTab({
  viewingDetailsSupplier,
  purchases,
  settings,
  paymentData,
  setPaymentData,
  setIsPaymentModalOpen,
  onClose,
  setViewingPurchaseVoucher
}: SupplierPurchasesTabProps) {
  const supplierNameNorm = (viewingDetailsSupplier.name || '').trim().toLowerCase();
  const matchedPurchases = (purchases || [])
    .filter(p => {
      const sId = p.supplierId || p.supplier_id || '';
      const sName = (p.supplierName || p.supplier_name || '').trim().toLowerCase();
      return sId === viewingDetailsSupplier.id || (supplierNameNorm && sName === supplierNameNorm);
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const totalPurchasesAmount = matchedPurchases.reduce((acc, p) => acc + Number(p.total ?? p.totalAmount ?? p.total_amount ?? 0), 0);
  const totalPurchasesPaid = matchedPurchases.reduce((acc, p) => acc + Number(p.paidAmount ?? p.paid_amount ?? 0), 0);
  const totalPurchasesRemaining = Math.max(0, totalPurchasesAmount - totalPurchasesPaid);
  const currentSupplierBalance = Math.max(0, Number(viewingDetailsSupplier.balance || 0));
  const unlinkedBalance = Math.max(0, currentSupplierBalance - totalPurchasesRemaining);

  return (
    <div className="space-y-5 text-left">
      {/* Bandeau KPI Réceptions du Fournisseur */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-white/40">Bons Enregistrés</p>
          <p className="text-2xl font-black text-white mt-1 font-mono">{matchedPurchases.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-white/40">Volume Total Acheté</p>
          <p className="text-2xl font-black text-indigo-400 mt-1 font-mono">{totalPurchasesAmount.toFixed(2)} {settings.currency}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-white/40">Total Déjà Réglé</p>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{totalPurchasesPaid.toFixed(2)} {settings.currency}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-rose-300">Dette Actuelle Fournisseur</p>
          <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{currentSupplierBalance.toFixed(2)} {settings.currency}</p>
        </div>
      </div>

      {/* Carte Solde Antérieur / Dette hors-bon si le solde dépasse les bons listés */}
      {unlinkedBalance > 0.5 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-300 uppercase">
                Solde Antérieur / Dette d'Ouverture Enregistrée : {unlinkedBalance.toFixed(2)} {settings.currency}
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Ce montant fait partie du solde impayé du fournisseur ({currentSupplierBalance.toFixed(2)} {settings.currency}) enregistré hors bon détaillé.
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setPaymentData({ ...paymentData, amount: currentSupplierBalance }); setIsPaymentModalOpen(true); }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2.5 rounded-xl shrink-0"
          >
            Régler ce solde
          </Button>
        </div>
      )}

      {matchedPurchases.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center space-y-2">
          <FileText size={38} className="mx-auto text-white/25" />
          <p className="text-base font-black text-white">Aucun bon de réception trouvé pour {viewingDetailsSupplier.name}</p>
          <p className="text-xs text-white/50">
            Les nouveaux bons créés dans « Approvisionnements » avec ce fournisseur apparaîtront automatiquement ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matchedPurchases.map(p => {
            const totalVal = Number(p.total ?? p.totalAmount ?? p.total_amount ?? 0);
            const paidVal = Number(p.paidAmount ?? p.paid_amount ?? 0);
            const remaining = Math.max(0, totalVal - paidVal);
            const invNum = p.invoiceNumber || p.invoice_number || `BR-${String(p.id || '').slice(-6).toUpperCase()}`;
            const itemCount = Array.isArray(p.items) ? p.items.length : 0;
            return (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={26} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none font-sans">
                        {invNum}
                      </p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                        #{String(p.id || '').slice(-6).toUpperCase()}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        remaining <= 0
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      )}>
                        {remaining <= 0 ? 'Payé' : 'Non Payé / Crédit'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                        • {itemCount} article(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                        <Calendar size={13} className="text-indigo-400" /> {formatSafe(p.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                      </div>
                      {p.notes && (
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
                          — {p.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-5 sm:gap-8 self-end md:self-auto text-left">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Total Bon</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                      {totalVal.toFixed(2)} {settings.currency}
                    </p>
                  </div>
                  <div className="text-right pr-4 border-r border-slate-200 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Reste à Payer</p>
                    <p className={cn("text-base sm:text-lg font-black font-mono", remaining > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {remaining.toFixed(2)} {settings.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => { onClose(); setViewingPurchaseVoucher({ ...p, total: totalVal, totalAmount: totalVal }); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-11 px-4 shadow-sm text-xs cursor-pointer"
                    >
                      VOIR LE BON
                    </Button>
                    <button
                      type="button"
                      title="Supprimer ce bon et réajuster automatiquement le stock et la dette"
                      onClick={async () => {
                        if (window.confirm(`Voulez-vous vraiment supprimer le bon "${invNum}" ?\nLes quantités reçues seront automatiquement déduites du stock et la dette fournisseur sera réajustée.`)) {
                          await handleDeletePurchaseDb({
                            purchaseId: p.id,
                            setIsProcessing: () => {},
                            setPurchaseToDelete: () => {}
                          });
                        }
                      }}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
