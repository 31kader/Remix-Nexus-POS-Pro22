import React, { useState, memo } from 'react';
import { Supplier } from '../../types';
import { WeeklySchedule } from './planning/WeeklySchedule';
import { MonthlyCalendar } from './planning/MonthlyCalendar';
import { ReminderForm } from './planning/ReminderForm';
import { ReminderList } from './planning/ReminderList';

interface SupplierPlanningTabProps {
  suppliers: Supplier[];
  setViewingDetailsSupplier: (s: Supplier) => void;
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setIsDetailsModalOpen: (v: boolean) => void;
  newReminderData: {
    supplierId: string;
    title: string;
    notes: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
  };
  setNewReminderData: React.Dispatch<React.SetStateAction<{
    supplierId: string;
    title: string;
    notes: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
  }>>;
  handleAddReminder: (e: React.FormEvent) => void;
  handleDeleteReminder: (supplierId: string, reminderId: string) => void;
  handleToggleReminderComplete: (supplierId: string, reminderId: string, completed: boolean) => void;
}

export const SupplierPlanningTab = memo(function SupplierPlanningTab({
  suppliers,
  setViewingDetailsSupplier,
  setActiveDetailsTab,
  setIsDetailsModalOpen,
  newReminderData,
  setNewReminderData,
  handleAddReminder,
  handleDeleteReminder,
  handleToggleReminderComplete
}: SupplierPlanningTabProps) {
  const [reminderFilter, setReminderFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedReminderDate, setSelectedReminderDate] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const allReminders = suppliers.flatMap(s => 
    (s.reminders || []).map(r => ({ ...r, supplierId: s.id, supplierName: s.name }))
  );

  const formatDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();
    
    let startDayIndex = firstDay.getDay();
    // Shift from Sunday-first to Monday-first
    startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month filler days
    for (let i = startDayIndex; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDay - i + 1),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month filler days to complete 42-day calendar grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <WeeklySchedule
        suppliers={suppliers}
        setViewingDetailsSupplier={setViewingDetailsSupplier}
        setActiveDetailsTab={setActiveDetailsTab}
        setIsDetailsModalOpen={setIsDetailsModalOpen}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mt-10 text-left">
        <MonthlyCalendar
          currentCalendarMonth={currentCalendarMonth}
          setCurrentCalendarMonth={setCurrentCalendarMonth}
          selectedReminderDate={selectedReminderDate}
          setSelectedReminderDate={setSelectedReminderDate}
          calendarDays={calendarDays}
          allReminders={allReminders}
          suppliers={suppliers}
          formatDateKey={formatDateKey}
        />

        <div className="xl:col-span-7 space-y-6 text-white grid grid-cols-1 md:grid-cols-2 lg:gap-8 items-start">
          <ReminderForm
            newReminderData={newReminderData}
            setNewReminderData={setNewReminderData}
            handleAddReminder={handleAddReminder}
            suppliers={suppliers}
          />
          <ReminderList
            allReminders={allReminders}
            reminderFilter={reminderFilter}
            setReminderFilter={setReminderFilter}
            selectedReminderDate={selectedReminderDate}
            setSelectedReminderDate={setSelectedReminderDate}
            handleToggleReminderComplete={handleToggleReminderComplete}
            handleDeleteReminder={handleDeleteReminder}
            suppliers={suppliers}
            setViewingDetailsSupplier={setViewingDetailsSupplier}
            setActiveDetailsTab={setActiveDetailsTab}
            setIsDetailsModalOpen={setIsDetailsModalOpen}
          />
        </div>
      </div>
    </div>
  );
});
