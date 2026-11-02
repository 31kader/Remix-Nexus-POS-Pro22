import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { localDb } from '../../services/LocalDatabase';
import { Transaction, UserProfile } from '../../types';
import { logAction } from '../../lib/utils';
import { toast } from 'sonner';

export function useCameraPortalLogic(user: UserProfile) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'suspicious' | 'pending' | 'anomaly'>('all');
  const [currentView, setCurrentView] = useState<'archive' | 'live'>('archive');
  const [timeSpent, setTimeSpent] = useState(0);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeAiZone, setActiveAiZone] = useState<string | null>(null);

  const sendMessageToCashier = async (message: string) => {
    if (!selectedTransaction || !selectedTransaction.userId) return;
    try {
      const newId = Math.random().toString(36).substring(2, 10);
      await localDb.insert(`cashier_alerts/${newId}`, {
        id: newId,
        userId: selectedTransaction.userId,
        message,
        type: 'discrete',
        timestamp: new Date().toISOString(),
        read: false,
        from: user.displayName
      });
      toast.info(`Alerte envoyée au caissier : "${message}"`);
    } catch (e) {
      console.error("Error sending alert:", e);
    }
  };

  // Timer for session
  useEffect(() => {
    let interval: any;
    if (selectedTransaction) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } else {
      setTimeSpent(0);
    }
    return () => clearInterval(interval);
  }, [selectedTransaction]);

  // Live session drafts
  useEffect(() => {
    if (currentView === 'live') {
      const fetchCartDrafts = async () => {
        const { data, error } = await supabase
          .from('cart_drafts')
          .select('id, user_id, sessions, active_session_id')
          .limit(10);
        
        if (error) {
          console.error("Error fetching cart drafts:", error);
          setLiveSessions([]);
        } else {
          const mapped = (data || []).map((draft: any) => {
            const sessionsList = Array.isArray(draft.sessions) ? draft.sessions : [];
            const activeSessId = draft.active_session_id;
            const activeSess = sessionsList.find((s: any) => s.id === activeSessId) || sessionsList[0];
            const items = activeSess ? (activeSess.cart || []) : [];
            const empId = draft.user_id || "Caisse";
            const employeeName = `Caisse (ID: ${empId.slice(-4).toUpperCase()})`;

            return {
              id: draft.id || draft.userId || Math.random().toString(),
              employeeName,
              items
            };
          });
          setLiveSessions(mapped.filter((s: any) => Array.isArray(s?.items) && s.items.length > 0));
        }
      };
      
      fetchCartDrafts();
    }
  }, [currentView]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fetchTransactions = async () => {
      let result = await supabase
        .from('transactions')
        .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status, audited_by, audited_at, audit_duration, audit_note')
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: false });

      if (result.error) {
        console.warn("Retrying fetch with basic columns due to missing columns on Supabase:", result.error);
        result = await supabase
          .from('transactions')
          .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status')
          .gte('timestamp', today.toISOString())
          .order('timestamp', { ascending: false });
      }

      if (result.error) {
        console.error("Error fetching transactions for camera portal:", result.error);
      } else {
        setTransactions(result.data || []);
      }
    };
    
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        (tx.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        tx.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || (tx.auditStatus || 'pending') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  const handleAudit = async (txId: string, status: 'verified' | 'suspicious') => {
    try {
      await localDb.update(`transactions/${txId}`, {
        auditStatus: status,
        auditedBy: user.displayName,
        auditedAt: new Date().toISOString(),
        auditDuration: timeSpent
      });
      
      if (selectedTransaction?.id === txId) {
        setSelectedTransaction(prev => prev ? { ...prev, auditStatus: status, auditedBy: user.displayName, auditedAt: new Date().toISOString(), auditDuration: timeSpent } : null);
      }

      if (status === 'suspicious') {
        await logAction(
          user.id!,
          user.displayName!,
          `SUSPICIOUS_TRANSACTION_REPORTED`,
          `CAMERA_AUDIT`,
          `Transaction ${txId} marked as suspicious by camera agent.`,
          'critical'
        );
      }
    } catch (error) {
      console.error("Error auditing transaction:", error);
    }
  };

  const callManager = async () => {
    if (!selectedTransaction) return;
    try {
      await logAction(
        user.id!,
        user.displayName!,
        `MANAGER_CALL_REQUEST`,
        `EMERGENCY_BIP`,
        `AGENT CAMERA ${user.displayName} demande une intervention urgente sur la vente ${selectedTransaction.id}.`,
        'critical'
      );
      toast.info("Manager appelé ! Son écran va vibrer.");
    } catch (e) {
      console.error("Error calling manager:", e);
    }
  };

  const handleAddNote = async (txId: string, note: string) => {
    try {
      await localDb.update(`transactions/${txId}`, {
        auditNote: note
      });
    } catch (error) {
      console.error("Error adding audit note:", error);
    }
  };

  return {
    transactions,
    selectedTransaction,
    setSelectedTransaction,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentView,
    setCurrentView,
    timeSpent,
    aiAnalysisLoading,
    setAiAnalysisLoading,
    liveSessions,
    activeAiZone,
    setActiveAiZone,
    sendMessageToCashier,
    filteredTransactions,
    handleAudit,
    callManager,
    handleAddNote
  };
}
