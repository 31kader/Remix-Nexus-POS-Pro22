import React, { useState, useMemo } from 'react';
import { Supplier } from '../../../types';
import { cn } from '../../../lib/utils';
import { localDb } from '../../../services/LocalDatabase';
import { usePeopleStore } from '../../../store/usePeopleStore';
import { toast } from 'sonner';
import { WeeklyScheduleHeader, WEEK_DAYS } from './WeeklyScheduleHeader';
import { WeeklyDayCard } from './WeeklyDayCard';

interface WeeklyScheduleProps {
  suppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
  onQuickPaySupplier?: (s: Supplier) => void;
  currency?: string;
}

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
      <WeeklyScheduleHeader
        todayName={todayName}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        focusTodayOnly={focusTodayOnly}
        setFocusTodayOnly={setFocusTodayOnly}
        quickAssignSupplierId={quickAssignSupplierId}
        setQuickAssignSupplierId={setQuickAssignSupplierId}
        quickAssignDay={quickAssignDay}
        setQuickAssignDay={setQuickAssignDay}
        quickAssignType={quickAssignType}
        setQuickAssignType={setQuickAssignType}
        handleQuickAssign={handleQuickAssign}
        suppliers={suppliers}
        currency={currency}
      />

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

          return (
            <WeeklyDayCard
              key={day}
              day={day}
              isToday={isToday}
              preSaleSuppliers={preSaleSuppliers}
              deliverySuppliers={deliverySuppliers}
              paymentSuppliers={paymentSuppliers}
              setViewingDetailsSupplier={setViewingDetailsSupplier}
              setActiveDetailsTab={setActiveDetailsTab}
              setIsDetailsModalOpen={setIsDetailsModalOpen}
              onQuickPaySupplier={onQuickPaySupplier}
              currency={currency}
              handleRemoveDayActivity={handleRemoveDayActivity}
            />
          );
        })}
      </div>
    </div>
  );
}
