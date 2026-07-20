
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  CreditCard, 
  Banknote,
  Package,
  Eye,
  Filter,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  FileText,
  Activity,
  Check,
  LayoutGrid,
  Bell,
  Cpu,
  History,
  Zap,
  Timer
} from 'lucide-react';
import { supabase } from '../supabase';
import { localDb } from '../services/LocalDatabase';
import { Transaction, CompanySettings, UserProfile, AuditLog } from '../types';
import { cn, logAction } from '../lib/utils';
import { Card, Button } from './ui';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { CameraSidebar } from './camera-portal/CameraSidebar';
import { CameraMainFeed } from './camera-portal/CameraMainFeed';
import { CameraActionSidebar } from './camera-portal/CameraActionSidebar';

interface CameraPortalProps {
  settings: CompanySettings;
  user: UserProfile;
}

export function CameraPortal({ settings, user }: CameraPortalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'suspicious' | 'pending' | 'anomaly'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState<'archive' | 'live'>('archive');
  const [timeSpent, setTimeSpent] = useState(0);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeAiZone, setActiveAiZone] = useState<string | null>(null);
  const [showImageMatch, setShowImageMatch] = useState(false);
  const [replayPosition, setReplayPosition] = useState(0);

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
      alert(`Alerte envoyée au caissier : "${message}"`);
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

  // Live session mock (could be real-time cart drafts in production)
  useEffect(() => {
    if (currentView === 'live') {
      const fetchCartDrafts = async () => {
        const { data, error } = await supabase
          .from('cart_drafts')
          .select('id, userId, sessions, activeSessionId, user_id, active_session_id')
          .limit(10);
        
        if (error) {
          console.error("Error fetching cart drafts:", error);
          setLiveSessions([]);
        } else {
          const mapped = (data || []).map((draft: any) => {
            const sessionsList = Array.isArray(draft.sessions) ? draft.sessions : [];
            const activeSessId = draft.activeSessionId || draft.active_session_id;
            const activeSess = sessionsList.find((s: any) => s.id === activeSessId) || sessionsList[0];
            const items = activeSess ? (activeSess.cart || []) : [];
            const empId = draft.user_id || draft.userId || "Caisse";
            const employeeName = `Caisse (ID: ${empId.slice(-4).toUpperCase()})`;

            return {
              id: draft.id || draft.userId || Math.random().toString(),
              employeeName,
              items
            };
          });
          // Filter drafts with active items in cart so we only display ongoing non-empty client sessions
          setLiveSessions(mapped.filter((s: any) => s.items && s.items.length > 0));
        }
      };
      
      fetchCartDrafts();
    }
  }, [currentView]);

  // Session stats
  const sessionStats = useMemo(() => {
    const sessionTxs = transactions.filter(tx => tx.auditedBy === user.displayName);
    return {
      total: sessionTxs.length,
      verified: sessionTxs.filter(tx => tx.auditStatus === 'verified').length,
      suspicious: sessionTxs.filter(tx => tx.auditStatus === 'suspicious').length,
    };
  }, [transactions, user.displayName]);

  useEffect(() => {
    // Listen to today's transactions
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
    
    // For now, simpler than real-time subscription.
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search filter
      const matchesSearch = 
        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tx.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
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

      // If suspicious, create an audit log to alert manager
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
      alert("Manager appelé ! Son écran va vibrer.");
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

  return (
    <div className="flex flex-col h-full bg-nardo text-slate-100 overflow-hidden font-sans">
      {/* Control Header */}
      <header className="h-20 border-b border-white/5 bg-workspace/80 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-neon-indigo">
              <Camera size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Nexus Guard <span className="text-indigo-400">Pro</span></h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste Audit: {user.displayName}</p>
              </div>
            </div>
          </div>
          
          <div className="h-10 w-px bg-white/5" />
          
          <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
             <button 
                onClick={() => setCurrentView('archive')}
                className={cn(
                  "px-6 py-2 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  currentView === 'archive' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
             >
                <History size={14} /> Archives
             </button>
             <button 
                onClick={() => setCurrentView('live')}
                className={cn(
                  "px-6 py-2 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  currentView === 'live' ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"
                )}
             >
                <Zap size={14} /> Live
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {selectedTransaction && (
            <div className="flex items-center gap-4 px-6 py-2 bg-black/40 border border-white/5 rounded-2xl">
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Durée Session</span>
                  <span className="text-sm font-black text-white font-mono">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
               </div>
               <Timer size={20} className="text-indigo-500 animate-pulse" />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Button 
               onClick={callManager}
               className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border-b-4 border-rose-900 active:border-b-0 active:translate-y-1 transition-all px-6"
            >
              <Bell size={18} /> Alerte Manager
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <CameraSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          currentView={currentView}
          liveSessions={liveSessions}
          filteredTransactions={filteredTransactions}
          selectedTransaction={selectedTransaction}
          setSelectedTransaction={setSelectedTransaction}
          settings={settings}
        />

        {/* Main Feed Section */}
        <div className="flex-1 flex flex-col overflow-hidden bg-nardo">
           {selectedTransaction ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex-1 flex overflow-hidden">
                   <CameraMainFeed
                     selectedTransaction={selectedTransaction}
                     activeAiZone={activeAiZone}
                     handleAudit={handleAudit}
                   />
                   <CameraActionSidebar
                     sendMessageToCashier={sendMessageToCashier}
                     aiAnalysisLoading={aiAnalysisLoading}
                     setAiAnalysisLoading={setAiAnalysisLoading}
                     selectedTransaction={selectedTransaction}
                     handleAddNote={handleAddNote}
                   />
                 </div>
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-800">
                <div className="w-32 h-32 bg-workspace border border-white/5 rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl">
                   <LayoutGrid size={48} className="opacity-10 text-indigo-500" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-[0.3em] text-white/20">Système en Veille</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-2">Sélectionnez une session pour monitoring</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
