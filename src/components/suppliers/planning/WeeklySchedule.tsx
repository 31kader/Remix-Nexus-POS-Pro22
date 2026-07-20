import React from 'react';
import { Supplier } from '../../../types';

interface WeeklyScheduleProps {
  suppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
}

export function WeeklySchedule({
  suppliers,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen
}: WeeklyScheduleProps) {
  return (
    <>
      <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] backdrop-blur-md">
        <h4 className="text-xl font-black text-indigo-400 uppercase tracking-widest mb-2 italic font-sans">TABLEAU DE BORD DES ACTIVITÉS FOURNISSEURS</h4>
        <p className="text-xs text-slate-400 font-mono uppercase">
          Visualisez l'agenda des visites de pré-vente, des livraisons de stock et des règlements de factures pour toute la semaine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
          const preSaleSuppliers = suppliers.filter(s => s.preSaleDays?.includes(day));
          const deliverySuppliers = suppliers.filter(s => s.deliveryDays?.includes(day));
          const paymentSuppliers = suppliers.filter(s => s.paymentDays?.includes(day));
          const totalEvents = preSaleSuppliers.length + deliverySuppliers.length + paymentSuppliers.length;

          return (
            <div key={day} className="bg-white/5 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 hover:border-indigo-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
                  <h4 className="font-black text-white text-lg tracking-wider uppercase italic font-sans">{day}</h4>
                  {totalEvents > 0 && (
                    <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-indigo-500/30">
                      {totalEvents} {totalEvents === 1 ? 'Action' : 'Actions'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {preSaleSuppliers.map(s => (
                    <div 
                      key={`presale-${s.id}`}
                      onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('products'); setIsDetailsModalOpen(true); }}
                      className="bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-2xl p-4 hover:bg-purple-500/20 transition-all cursor-pointer group flex flex-col gap-1.5"
                      title="Modifier ou voir les détails"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">📝 Commande / Pré-vente</span>
                      </div>
                      <p className="text-sm font-black text-white group-hover:text-purple-200 transition-colors uppercase">{s.name}</p>
                      {s.planningNotes && (
                        <p className="text-[10px] text-purple-300/60 font-mono italic truncate mt-1">
                          "{s.planningNotes}"
                        </p>
                      )}
                    </div>
                  ))}

                  {deliverySuppliers.map(s => (
                    <div 
                      key={`delivery-${s.id}`}
                      onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('products'); setIsDetailsModalOpen(true); }}
                      className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-4 hover:bg-emerald-500/20 transition-all cursor-pointer group flex flex-col gap-1.5"
                      title="Modifier ou voir les détails"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">🚚 Livraison</span>
                      </div>
                      <p className="text-sm font-black text-white group-hover:text-emerald-200 transition-colors uppercase">{s.name}</p>
                      {s.planningNotes && (
                        <p className="text-[10px] text-emerald-300/60 font-mono italic truncate mt-1">
                          "{s.planningNotes}"
                        </p>
                      )}
                    </div>
                  ))}

                  {paymentSuppliers.map(s => (
                    <div 
                      key={`payment-${s.id}`}
                      onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('payments'); setIsDetailsModalOpen(true); }}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-4 hover:bg-rose-500/20 transition-all cursor-pointer group flex flex-col gap-1.5"
                      title="Gérer les règlements"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">💳 Règlement</span>
                      </div>
                      <p className="text-sm font-black text-white group-hover:text-rose-200 transition-colors uppercase">{s.name}</p>
                      {s.planningNotes && (
                        <p className="text-[10px] text-rose-300/60 font-mono italic truncate mt-1">
                          "{s.planningNotes}"
                        </p>
                      )}
                    </div>
                  ))}

                  {totalEvents === 0 && (
                    <div className="py-8 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Jour Libre</p>
                      <span className="text-[9px] text-white/10 font-mono mt-1">AUCUNE ACTION</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
