import React from 'react';
import { Truck, RefreshCw, Phone, Mail, Package, Trash2 } from 'lucide-react';
import { Supplier } from '../../types';
import { Card, Button } from '../ui';
import { cn } from '../../lib/utils';

interface SupplierListProps {
  suppliers: Supplier[];
  isSyncing: string | null;
  handleSync: (supplier: Supplier) => Promise<void> | void;
  setViewingDetailsSupplier: (supplier: Supplier | null) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (val: boolean) => void;
  setSupplierToDelete: (supplier: Supplier | null) => void;
  setIsDeleteConfirmOpen: (val: boolean) => void;
  setEditingSupplier: (supplier: Supplier | null) => void;
  setIsModalOpen: (val: boolean) => void;
}

export function SupplierList({
  suppliers,
  isSyncing,
  handleSync,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  setSupplierToDelete,
  setIsDeleteConfirmOpen,
  setEditingSupplier,
  setIsModalOpen
}: SupplierListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
      {suppliers.map((supplier: Supplier) => (
        <Card key={supplier.id} className="p-8 bg-white/5 backdrop-blur-md border border-white/5 shadow-2xl rounded-[2.5rem] hover:bg-white/10 transition-all group overflow-hidden relative active:scale-[0.98] text-left">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="flex justify-between items-start mb-8 text-left">
            <div className="flex items-center gap-5 text-left">
              <div className="w-16 h-16 bg-black/60 text-indigo-400 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-2xl">
                <Truck size={28} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h4 className="font-black text-white text-xl tracking-tighter uppercase italic flex flex-wrap items-center gap-3">
                  {supplier.name}
                  {supplier.hasFullInventoryAccess && (
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-neon-indigo border border-indigo-400/50">Nexus Access</span>
                  )}
                </h4>
                
                {/* Dynamic Score badge */}
                {(() => {
                  const avg = ((supplier.ratingQuality ?? 5) + (supplier.ratingDelivery ?? 5) + (supplier.ratingPrice ?? 5)) / 3;
                  return (
                    <div className="flex items-center gap-1.5 mt-1" title={`Qualité: ${supplier.ratingQuality ?? 5}/5 | Délai: ${supplier.ratingDelivery ?? 5}/5 | Prix: ${supplier.ratingPrice ?? 5}/5`}>
                      <div className="flex text-amber-400 select-none">
                        {"★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg))}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-500">{avg.toFixed(1)}/5</span>
                    </div>
                  );
                })()}

                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1.5">{supplier.contactName || 'CONTACT NON DÉFINI'}</p>
              </div>
            </div>
            {supplier.feedUrl && (
              <button 
                onClick={() => handleSync(supplier)}
                disabled={isSyncing === supplier.id}
                className={cn(
                  "w-12 h-12 rounded-2xl transition-all shadow-xl flex items-center justify-center border border-white/5 cursor-pointer",
                  isSyncing === supplier.id ? "bg-indigo-600 text-white animate-spin" : "bg-white/5 text-white/40 hover:bg-indigo-600 hover:text-white hover:border-indigo-500"
                )}
                title="Synchroniser"
              >
                <RefreshCw size={22} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-3 group/item text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover/item:text-indigo-400 transition-colors"><Phone size={14} /></div>
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">TEL</span>
                <span className="text-[11px] font-black text-white/60 tracking-widest truncate">{supplier.phone || '—'}</span>
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-3 group/item text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover/item:text-indigo-400 transition-colors"><Mail size={14} /></div>
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">MAIL</span>
                <span className="text-[11px] font-black text-white/60 tracking-widest truncate uppercase italic">{supplier.email || '—'}</span>
              </div>
            </div>
          </div>

          {((supplier.preSaleDays && supplier.preSaleDays.length > 0) || 
            (supplier.deliveryDays && supplier.deliveryDays.length > 0) || 
            (supplier.paymentDays && supplier.paymentDays.length > 0)) && (
            <div className="mb-8 p-4 bg-black/40 rounded-3xl border border-white/5 space-y-2 text-left">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] block">📌 Agenda opérationnel</span>
              <div className="space-y-1.5 text-[10px]">
                {supplier.preSaleDays && supplier.preSaleDays.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400 uppercase">📝 Commande</span>
                    <span className="font-mono text-white/60 tracking-wider font-semibold uppercase">{supplier.preSaleDays.map(d => d.substring(0, 3)).join(', ')}</span>
                  </div>
                )}
                {supplier.deliveryDays && supplier.deliveryDays.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 uppercase">🚚 Livraison</span>
                    <span className="font-mono text-white/60 tracking-wider font-semibold uppercase">{supplier.deliveryDays.map(d => d.substring(0, 3)).join(', ')}</span>
                  </div>
                )}
                {supplier.paymentDays && supplier.paymentDays.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 uppercase">💳 Règlement</span>
                    <span className="font-mono text-white/60 tracking-wider font-semibold uppercase">{supplier.paymentDays.map(d => d.substring(0, 3)).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-white/5 text-left">
            <div className="flex gap-2">
              <button 
                onClick={() => { setViewingDetailsSupplier(supplier); setActiveDetailsTab('products'); setIsDetailsModalOpen(true); }}
                className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 cursor-pointer"
                title="Voir les détails"
              >
                <Package size={22} />
              </button>
              <button 
                onClick={() => { setSupplierToDelete(supplier); setIsDeleteConfirmOpen(true); }}
                className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                title="Supprimer"
              >
                <Trash2 size={22} />
              </button>
            </div>
            <Button 
              variant="ghost" 
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] px-8 rounded-2xl h-12 group-hover:border-indigo-500/50 transition-all cursor-pointer" 
              onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
            >
              MODIFIER
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
