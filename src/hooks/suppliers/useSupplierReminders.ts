import { useState } from 'react';
import { supabase } from '../../supabase';
import { Supplier } from '../../types';

interface UseSupplierRemindersParams {
  suppliers: Supplier[];
}

export function useSupplierReminders({ suppliers }: UseSupplierRemindersParams) {
  const [newReminderData, setNewReminderData] = useState({
    supplierId: '',
    title: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplier = suppliers.find(s => s.id === newReminderData.supplierId);
      if (!supplier) return;
      
      const newReminder = {
        id: Math.random().toString(36).substring(2, 9),
        title: newReminderData.title,
        notes: newReminderData.notes || '',
        date: newReminderData.date,
        priority: newReminderData.priority,
        isCompleted: false
      };
      
      const currentReminders = supplier.reminders || [];
      try {
        const { error } = await supabase
          .from('suppliers')
          .update({
            reminders: [...currentReminders, newReminder],
            updated_at: new Date().toISOString()
          })
          .eq('id', newReminderData.supplierId);
        if (error && !error.message.includes("schema cache") && !error.message.includes("column")) {
          throw error;
        }
      } catch (e) {
        console.warn("Could not sync reminders to Supabase:", e);
      }
      
      setNewReminderData(prev => ({ 
        ...prev, 
        title: '', 
        notes: '',
        date: new Date().toISOString().split('T')[0]
      }));
    } catch (error: any) {
      console.error("Error adding reminder:", error);
      alert("Erreur: " + error.message);
    }
  };

  const handleToggleReminderComplete = async (supplierId: string, reminderId: string, completed: boolean) => {
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;
      
      const updatedReminders = (supplier.reminders || []).map(r => 
        r.id === reminderId ? { ...r, isCompleted: completed } : r
      );
      
      try {
        const { error } = await supabase
          .from('suppliers')
          .update({
            reminders: updatedReminders,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplierId);
        if (error && !error.message.includes("schema cache") && !error.message.includes("column")) {
          throw error;
        }
      } catch (e) {
        console.warn("Could not sync reminders toggling to Supabase:", e);
      }
    } catch (error: any) {
      console.error("Error toggling reminder:", error);
      alert("Erreur: " + error.message);
    }
  };

  const handleDeleteReminder = async (supplierId: string, reminderId: string) => {
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;
      
      const updatedReminders = (supplier.reminders || []).filter(r => r.id !== reminderId);
      try {
        const { error } = await supabase
          .from('suppliers')
          .update({
            reminders: updatedReminders,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplierId);
        if (error && !error.message.includes("schema cache") && !error.message.includes("column")) {
          throw error;
        }
      } catch (e) {
        console.warn("Could not sync reminders deletion to Supabase:", e);
      }
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      alert("Erreur: " + error.message);
    }
  };

  return {
    newReminderData,
    setNewReminderData,
    handleAddReminder,
    handleToggleReminderComplete,
    handleDeleteReminder
  };
}
