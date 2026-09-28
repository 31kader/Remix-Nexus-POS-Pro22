import React, { useState, useMemo } from 'react';
import { Calendar, Plus, X, Wallet, Phone } from 'lucide-react';
import { Supplier } from '../../../types';
import { cn, formatPrice } from '../../../lib/utils';
import { localDb } from '../../../services/LocalDatabase';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { toast } from 'sonner';

interface WeeklyScheduleProps {
  suppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
  onQuickPaySupplier?: (s: Supplier) => void;
  currency?: string;
}

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JS_DAYS_MAP = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function WeeklySchedule({
  suppliers,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  onQuickPaySupplier,
  currency = 'DA'
}: WeeklyScheduleProps) {
  const todayName = JS_DAYS_MAP[new Date().getDay()];
  const [activityFilter, setActivityFilter] = useState<'all' | 'presale' | 'delivery' | 'payment'>('all');
  const [focusTodayOnly, setFocusTodayOnly] = useState(false);

  // État pour l'assignation rapide au planning en 1 clic
  const [quickAssignSupplierId, setQuickAssignSupplierId] = useState<string>('');
  const [quickAssignDay, setQuickAssignDay] = useState<string>(todayName);
  const [quickAssignType, setQuickAssignType] = useState<'preSaleDays' | 'deliveryDays' | 'paymentDays'>('deliveryDays');

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssignSupplierId) {
      toast.error("Veuillez choisir un fournisseur à planifier.");
      return;
    }
    const target = suppliers.find(s => s.id === quickAssignSupplierId);
    if (!target) return;

    const currentDays: string[] = Array.isArray((target as any)[quickAssignType]) ? (target as any)[quickAssignType] : [];
    if (currentDays.includes(quickAssignDay)) {
      toast.info(`${target.name} est déjà planifié le ${quickAssignDay} pour cette activité.`);
      return;
    }

    const updatedSupplier = {
      ...target,
      [quickAssignType]: [...currentDays, quickAssignDay],
      updatedAt: new Date().toISOString()
    };

    try {
      await localDb.update(`suppliers/${target.id}`, updatedSupplier);
      usePeopleStore.setState(state => ({
        suppliers: (state.suppliers || []).map(s => s.id === target.id ? updatedSupplier : s)
      }));
      toast.success(`Activité ajoutée au planning (${quickAssignDay}) pour ${target.name} !`);
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour du planning.");
    }
  };

  const handleRemoveDayActivity = async (
    e: React.MouseEvent,
    supplier: Supplier,
    field: 'preSaleDays' | 'deliveryDays' | 'paymentDays',
    day: string
  ) => {
    e.stopPropagation();
    const currentDays: string[] = Array.isArray((supplier as any)[field]) ? (supplier as any)[field] : [];
    const updatedSupplier = {
      ...supplier,
      [field]: currentDays.filter(d => d !== day),
      updatedAt: new Date().toISOString()
    };
    try {
      await localDb.update(`suppliers/${supplier.id}`, updatedSupplier);
      usePeopleStore.setState(state => ({
        suppliers: (state.suppliers || []).map(s => s.id === supplier.id ? updatedSupplier : s)
      }));
      toast.success(`Activité retirée du ${day} pour ${supplier.name}`);
    } catch (_) {}
  };

  const visibleDays = useMemo(() => {
    if (focusTodayOnly) return [todayName];
    return WEEK_DAYS;
  }, [focusTodayOnly, todayName]);

  return (
    <div className="space-y-5 text-left">
      {/* En-tête Tableau de Bord des Activités + Filtres + Planification Rapide */}
      <div className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                TABLEAU DE BORD DES ACTIVITÉS FOURNISSEURS
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                Aujourd'hui : {todayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Suivez et planifiez les visites de pré-vente, les réceptions de marchandises et les échéances de règlement de la semaine.
            </p>
          </div>

          {/* Filtres rapides par type d'activité */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tout voir', color: 'bg-indigo-600 text-white' },
              { id: 'presale', label: '📝 Commandes', color: 'bg-purple-600 text-white' },
              { id: 'delivery', label: '🚚 Livraisons', color: 'bg-emerald-600 text-white' },
              { id: 'payment', label: '💳 Règlements', color: 'bg-rose-600 text-white' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivityFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
                  activityFilter === tab.id
                    ? `${tab.color} border-transparent shadow-xs`
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setFocusTodayOnly(!focusTodayOnly)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
                focusTodayOnly
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              {focusTodayOnly ? '📅 Voir 7 Jours' : `🎯 Focus ${todayName}`}
            </button>
          </div>
        </div>

        {/* Barre d'ajout rapide au planning en 1 clic */}
        <form
          onSubmit={handleQuickAssign}
          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
        >
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider shrink-0 px-1">
            ⚡ Planification Rapide :
          </span>
          <select
            value={quickAssignSupplierId}
            onChange={(e) => setQuickAssignSupplierId(e.target.value)}
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
          >
            <option value="">— Choisir un fournisseur —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {Number(s.balance) > 0 ? `(Dette: ${formatPrice(Number(s.balance))} ${currency})` : ''}
              </option>
            ))}
          </select>

          <select
            value={quickAssignDay}
            onChange={(e) => setQuickAssignDay(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
          >
            {WEEK_DAYS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={quickAssignType}
            onChange={(e) => setQuickAssignType(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
          >
            <option value="preSaleDays">📝 Commande / Pré-vente</option>
            <option value="deliveryDays">🚚 Livraison de marchandise</option>
            <option value="paymentDays">💳 Règlement / Paiement</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus size={14} /> Planifier
          </button>
        </form>
      </div>

      {/* Grille des Jours de la Semaine */}
      <div className={cn(
        "grid gap-4 text-left",
        focusTodayOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {visibleDays.map((day) => {
          const isToday = day === todayName;
          const preSaleSuppliers = (activityFilter === 'all' || activityFilter === 'presale')
            ? suppliers.filter(s => s.preSaleDays?.includes(day))
            : [];
          const deliverySuppliers = (activityFilter === 'all' || activityFilter === 'delivery')
            ? suppliers.filter(s => s.deliveryDays?.includes(day))
            : [];
          const paymentSuppliers = (activityFilter === 'all' || activityFilter === 'payment')
            ? suppliers.filter(s => s.paymentDays?.includes(day))
            : [];

          const totalEvents = preSaleSuppliers.length + deliverySuppliers.length + paymentSuppliers.length;

          return (
            <div
              key={day}
              className={cn(
                "bg-white dark:bg-slate-900/90 border rounded-xl p-4 transition-all flex flex-col justify-between shadow-xs",
                isToday
                  ? "border-indigo-500 ring-2 ring-indigo-500/15"
                  : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
              )}
            >
              <div>
                <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 dark:text-white text-base uppercase">{day}</h4>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                    totalEvents > 0
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                  )}>
                    {totalEvents} {totalEvents <= 1 ? 'Action' : 'Actions'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Commandes / Pré-ventes */}
                  {preSaleSuppliers.map(s => (
                    <div
                      key={`presale-${s.id}`}
                      onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('products'); setIsDetailsModalOpen(true); }}
                      className="bg-purple-500/10 border border-purple-500/25 rounded-xl p-3 hover:bg-purple-500/15 transition-all cursor-pointer group relative"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleRemoveDayActivity(e, s, 'preSaleDays', day)}
                        className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                        title="Retirer de ce jour"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">📝 Commande / Pré-vente</span>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1 pr-5">{s.name}</p>
                      {s.phone && (
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {s.phone}
                        </p>
                      )}
                      {s.planningNotes && (
                        <p className="text-[10px] text-purple-700 dark:text-purple-300/80 font-mono truncate mt-1">
                          "{s.planningNotes}"
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Livraisons */}
                  {deliverySuppliers.map(s => (
                    <div
                      key={`delivery-${s.id}`}
                      onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('purchases'); setIsDetailsModalOpen(true); }}
                      className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 hover:bg-emerald-500/15 transition-all cursor-pointer group relative"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleRemoveDayActivity(e, s, 'deliveryDays', day)}
                        className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                        title="Retirer de ce jour"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">🚚 Livraison</span>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase mt-1 pr-5">{s.name}</p>
                      {s.phone && (
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {s.phone}
                        </p>
                      )}
                      {s.planningNotes && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-mono truncate mt-1">
                          "{s.planningNotes}"
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Règlements */}
                  {paymentSuppliers.map(s => {
                    const debt = Number(s.balance) || 0;
                    return (
                      <div
                        key={`payment-${s.id}`}
                        onClick={() => { setViewingDetailsSupplier(s); setActiveDetailsTab('payments'); setIsDetailsModalOpen(true); }}
                        className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 hover:bg-rose-500/15 transition-all cursor-pointer group relative"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleRemoveDayActivity(e, s, 'paymentDays', day)}
                          className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50"
                          title="Retirer de ce jour"
                        >
                          <X size={12} />
                        </button>
                        <div className="flex items-center justify-between pr-5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">💳 Règlement</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-rose-600 dark:text-rose-400">
                            {formatPrice(debt)} {currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{s.name}</p>
                          {onQuickPaySupplier && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onQuickPaySupplier(s); }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[9px] font-black uppercase flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Wallet size={10} /> Régler
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {totalEvents === 0 && (
                    <div className="py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Jour Libre</p>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">Aucune visite planifiée</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
