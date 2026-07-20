import { useState, useRef, useEffect } from 'react';
import { localDb } from '../services/LocalDatabase';
import { Customer } from '../types';

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
        changedBy: profile?.employeeId || user.email,
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
          (c.name.toLowerCase() === order.customerName?.toLowerCase())
        );
        if (found) {
          finalCustomerId = found.id;
          updates.customerId = found.id;
        }
      }

      // Perform transaction logging only if marking as delivered and previously not
      if (newStatus === 'delivered' && order.status !== 'delivered') {
        if (!order.syncedToPos) {
          const txRef = localDb.push('transactions');
          const transaction: any = {
            id: txRef.key,
            items: order.items,
            total: order.total,
            timestamp: order.timestamp || new Date().toISOString(),
            paymentMethod: order.paymentMethod || 'cash',
            status: 'completed',
            employeeName: profile?.displayName || user.email,
            userId: user.uid,
            onlineOrderId: order.id,
            customerId: finalCustomerId || null,
            customerName: order.customerName || null,
            pointsEarned: finalCustomerId ? Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1)) : 0
          };
          await localDb.insert(txRef, transaction);
          updates.syncedToPos = true;
        }

        // Update customer's loyalty points
        if (finalCustomerId) {
          try {
            const customerSnap = await localDb.get(`customers/${finalCustomerId}`);
            if (customerSnap.exists()) {
              const customerData = customerSnap.val();
              const pointsEarned = Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1));
              await localDb.update(`customers/${finalCustomerId}`, {
                loyaltyPoints: (customerData.loyaltyPoints || 0) + pointsEarned,
                totalSpent: (customerData.totalSpent || 0) + order.total,
                lastVisit: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error("Failed to update customer loyalty points:", e);
          }
        }
      }

      await localDb.update(`onlineOrders/${order.id}`, updates);
      
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
      alert('Erreur: impossible de mettre à jour la commande');
    } finally {
      setIsProcessing(null);
    }
  };

  return { isProcessing, handleUpdateStatus };
}
