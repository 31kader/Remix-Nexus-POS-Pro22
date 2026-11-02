import React from 'react';
import {
  X,
  Package,
  History,
  Wallet,
  AlertTriangle,
  Phone,
  Mail
} from 'lucide-react';
import { Supplier, CompanySettings } from '../../../types';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';

interface SupplierDetailsHeaderProps {
  onClose: () => void;
  viewingDetailsSupplier: Supplier;
  settings: CompanySettings;
  activeDetailsTab: 'products' | 'purchases' | 'payments' | 'damaged';
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  paymentData: any;
  setPaymentData: (d: any) => void;
  setIsPaymentModalOpen: (open: boolean) => void;
}

export function SupplierDetailsHeader({
  onClose,
  viewingDetailsSupplier,
  settings,
  activeDetailsTab,
  setActiveDetailsTab,
  paymentData,
  setPaymentData,
  setIsPaymentModalOpen
}: SupplierDetailsHeaderProps) {
  return (
    <header className="bg-white/5 px-6 pt-10 pb-8 border-b border-white/10 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white z-10 hover:scale-110 active:scale-95 cursor-pointer"
      >
        <X size={24} />
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
        <div className="flex items-center gap-6 text-left">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-3xl font-black shadow-md relative group overflow-hidden">
            <span className="relative z-10">{String(viewingDetailsSupplier?.name || 'F').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2 uppercase font-sans">
              {viewingDetailsSupplier?.name || 'Fournisseur'}
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-emerald-500/20">
                Actif
              </span>
              {viewingDetailsSupplier.hasFullInventoryAccess && (
                <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-indigo-500/20">
                  Accès Total
                </span>
              )}
              <div className="h-4 w-px bg-white/10"></div>
              <span className="text-sm font-bold text-white/40 flex items-center gap-2">
                <Phone size={14} className="text-white/20" /> {viewingDetailsSupplier.phone || 'N/A'}
              </span>
              <span className="text-sm font-bold text-white/40 flex items-center gap-2">
                <Mail size={14} className="text-white/20" /> {viewingDetailsSupplier.email || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-left">
          <div className="bg-white/5 p-5 px-5 rounded-xl border border-white/10 shadow-md flex flex-col justify-center min-w-[200px]">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Dette Globale</p>
            <p className="text-3xl font-black text-rose-500 leading-none font-mono">
              {Number(viewingDetailsSupplier.balance || 0).toFixed(2)} <span className="text-sm font-medium">{settings.currency}</span>
            </p>
          </div>
          <Button
            onClick={() => {
              setPaymentData({ ...paymentData, amount: viewingDetailsSupplier.balance || 0 });
              setIsPaymentModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-20 rounded-xl flex flex-col items-center justify-center shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-1 active:translate-y-0 text-left"
          >
            <span className="text-[10px] font-black uppercase tracking-normal mb-1 opacity-70">Effectuer</span>
            <span className="text-lg font-black whitespace-nowrap">VERSEMENT</span>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-xl w-fit border border-white/10">
        {[
          { id: 'products', label: 'Catalogue', icon: Package },
          { id: 'damaged', label: 'Dommages', icon: AlertTriangle },
          { id: 'purchases', label: 'Réceptions', icon: History },
          { id: 'payments', label: 'Finances', icon: Wallet }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDetailsTab(tab.id as any)}
            className={cn(
              "flex items-center gap-3 px-4 sm:px-5 py-3 rounded-xl text-sm font-black transition-all duration-300 cursor-pointer",
              activeDetailsTab === tab.id
                ? "bg-white dark:bg-zinc-900 text-black shadow-lg"
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
