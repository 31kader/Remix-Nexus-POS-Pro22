import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';
import { enqueueSync } from '../services/SyncService';
import { destockOrder } from '../services/orderStockService';
import { supabase, isSupabaseConfigured } from '../supabase';
import { convertKeysToSnake } from '../lib/db-converters';
import { Customer } from '../types';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';

interface UseDeliveryActionsParams {
  user: any;
  profile: any;
  settings: any;
  customers: Customer[];
  pendingOrders: any[];
}

export function useDeliveryActions({ user, profile, settings, customers, pendingOrders }: UseDeliveryActionsParams) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Sound notification for new assignments
  const pendingCountRef = useRef(pendingOrders.length);
  useEffect(() => {
    if (pendingOrders.length > pendingCountRef.current) {
      // New order assigned!
      const playAssignmentSound = () => {
        try {
          const AudioContextCls = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (typeof AudioContextCls !== 'function') return;
          const canUseNew = AudioContextCls.prototype && typeof AudioContextCls.prototype === 'object';
          const audioCtx = canUseNew ? new AudioContextCls() : (typeof AudioContextCls === 'function' ? AudioContextCls() : null);
          if (!audioCtx) return;
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
        } catch(e) {
          console.warn("AudioContext failed:", e);
        }
      };
      playAssignmentSound();
    }
    pendingCountRef.current = pendingOrders.length;
  }, [pendingOrders.length]);

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    setIsProcessing(order.id);
    try {
      const historyEntry = {
        status: newStatus,
        changedBy: profile?.employeeId || user?.email || 'system',
        timestamp: new Date().toISOString()
      };
      
      const updates: any = {
        status: newStatus,
        statusHistory: [...(order.statusHistory || []), historyEntry]
      };

      // Find customer ID if null but we have their phone or name
      let finalCustomerId = order.customerId;
      if (!finalCustomerId && customers) {
        const found = customers.find((c: Customer) => 
          (order.customerPhone && c.phone && c.phone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, '')) || 
          (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())
        );
        if (found) {
          finalCustomerId = found.id;
          updates.customerId = found.id;
        }
      }

      // Perform transaction logging and destocking only if marking as delivered and previously not
      if (newStatus === 'delivered' && order.status !== 'delivered') {
        const freshOrders = useTransactionStore.getState().onlineOrders || [];
        const currentOrder = freshOrders.find(o => String(o.id) === String(order.id)) || order;
        if (!currentOrder.syncedToPos && !order.syncedToPos) {
          const destockResult = await destockOrder(
            { ...order, customerId: finalCustomerId || order.customerId },
            { user, settings, customers }
          );
          if (destockResult && !destockResult.success && destockResult.reason === 'stock_shortage') {
            setIsProcessing(null);
            return;
          }
          updates.syncedToPos = true;
        }
      }

      await localDb.update(`onlineOrders/${order.id}`, updates);
      useTransactionStore.getState().setOnlineOrders(prev =>
        (prev || []).map(o => (o.id === order.id ? { ...o, ...updates } : o))
      );
      if (isSupabaseConfigured) {
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const snakeUpdates = convertKeysToSnake({ ...updates, updatedAt: new Date().toISOString() });
            const { error: supaErr } = await supabase.from('online_orders').update(snakeUpdates).eq('id', order.id);
            if (supaErr) {
              enqueueSync('online_orders', order.id, 'UPSERT', { ...order, ...updates });
            }
          } catch (_) {
            enqueueSync('online_orders', order.id, 'UPSERT', { ...order, ...updates });
          }
        } else {
          enqueueSync('online_orders', order.id, 'UPSERT', { ...order, ...updates });
        }
      }
      
      // Play a small success sound
      try {
        const AudioContextCls = (window as any).AudioContext || (window as any).webkitAudioContext; 
        if (typeof AudioContextCls === 'function') {
          const audioCtx = new AudioContextCls();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        }
      } catch(e) {
         console.warn("Success sound audio failed:", e);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur: impossible de mettre à jour la commande');
    } finally {
      setIsProcessing(null);
    }
  };

  return { isProcessing, handleUpdateStatus };
}
