import React from 'react';
import { Truck, RefreshCw, Phone, Mail, Package, Trash2, Wallet } from 'lucide-react';
import { Supplier } from '../../../types';
import { Card } from '../../ui';
import { cn, formatPrice } from '../../../lib/utils';

interface SupplierCardItemProps {
  supplier: Supplier;
  isSyncing: boolean;
  currency?: string;
  avgRating: number;
  handleSync: (supplier: Supplier) => Promise<void> | void;
  onQuickPaySupplier?: (supplier: Supplier) => void;
  onViewPurchases: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
}

export const SupplierCardItem: React.FC<SupplierCardItemProps> = ({
  supplier,
  isSyncing,
  currency = 'DA',
  avgRating,
  handleSync,
  onQuickPaySupplier,
  onViewPurchases,
  onEditSupplier,
  onDeleteSupplier
}) => {
  const debt = Number(supplier.balance) || 0;

  return (
    <Card
      key={supplier.id}
      className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs rounded-2xl hover:border-indigo-500/50 transition-all group overflow-hidden relative flex flex-col justify-between text-left"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* En-tête de la carte : Nom, Note et Badge Dette */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Truck size={22} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight uppercase truncate">
                {supplier.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-amber-500 text-xs font-bold select-none">
                  {"★".repeat(Math.round(avgRating)) + "☆".repeat(5 - Math.round(avgRating))}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                  {avgRating.toFixed(1)}/5
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase truncate mt-0.5">
                {supplier.contactName || 'Contact Principal'}
              </p>
            </div>
          </div>

          {/* Badge Dette / Solde */}
          <div className={cn(
            "px-2.5 py-1.5 rounded-xl border text-right shrink-0",
            debt > 0
              ? "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
          )}>
            <span className="text-[9px] font-black uppercase block leading-none">
              {debt > 0 ? 'Dette à payer' : 'Soldé'}
            </span>
            <span className="text-xs font-financial font-black tabular-nums mt-0.5 block">
              {formatPrice(debt)} {currency}
            </span>
          </div>
        </div>

        {/* Coordonnées Téléphone & Email */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center gap-2.5 min-w-0">
            <Phone size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Téléphone</span>
              <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                {supplier.phone || '—'}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center gap-2.5 min-w-0">
            <Mail size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none">E-mail</span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                {supplier.email || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Agenda Opérationnel */}
        {((supplier.preSaleDays && supplier.preSaleDays.length > 0) || 
          (supplier.deliveryDays && supplier.deliveryDays.length > 0) || 
          (supplier.paymentDays && supplier.paymentDays.length > 0)) && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-1.5 text-left">
            <span className="text-[9px] font-black text-slate-400 uppercase block">📌 Jours de Passage</span>
            <div className="space-y-1 text-[10px]">
              {supplier.preSaleDays && supplier.preSaleDays.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">📝 Commande</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold uppercase">{supplier.preSaleDays.map(d => d.substring(0, 3)).join(', ')}</span>
                </div>
              )}
              {supplier.deliveryDays && supplier.deliveryDays.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">🚚 Livraison</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold uppercase">{supplier.deliveryDays.map(d => d.substring(0, 3)).join(', ')}</span>
                </div>
              )}
              {supplier.paymentDays && supplier.paymentDays.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">💳 Règlement</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold uppercase">{supplier.paymentDays.map(d => d.substring(0, 3)).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pied de carte : Actions Rapides */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => onViewPurchases(supplier)}
            className="px-3 py-2 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase cursor-pointer"
            title="Voir les achats, produits et paiements de ce fournisseur"
          >
            <Package size={15} /> Fiche & Achats
          </button>

          {onQuickPaySupplier && (
            <button
              type="button"
              onClick={() => onQuickPaySupplier(supplier)}
              className="px-3 py-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase cursor-pointer"
              title="Enregistrer un versement / règlement rapide"
            >
              <Wallet size={15} /> Verser
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {supplier.feedUrl && (
            <button 
              type="button"
              onClick={() => handleSync(supplier)}
              disabled={isSyncing}
              className={cn(
                "p-2 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer",
                isSyncing ? "bg-indigo-600 text-white animate-spin" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white"
              )}
              title="Synchroniser le flux"
            >
              <RefreshCw size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditSupplier(supplier)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white text-[10px] font-black uppercase transition-all cursor-pointer"
          >
            Modifier
          </button>
          <button 
            type="button"
            onClick={() => onDeleteSupplier(supplier)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
            title="Supprimer ce fournisseur"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};
