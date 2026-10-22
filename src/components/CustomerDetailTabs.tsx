import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, History, CreditCard } from 'lucide-react';
import { Customer, Transaction, CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCartStore } from '../store/useCartStore';
import { supabase, isSupabaseConfigured } from '../supabase';
import { convertKeysToCamel } from '../lib/db-converters';
import { CustomerInfoTab, CustomerHistoryTab, CustomerDigitalCardTab, parseNoteFinancialInfo, ParsedNoteInfo } from './customers/tabs';

// Ré-export pour rétrocompatibilité
export { parseNoteFinancialInfo };
export type { ParsedNoteInfo };

export interface CustomerDetailTabsProps {
  activeTab: 'info' | 'history' | 'card';
  setActiveTab: (tab: 'info' | 'history' | 'card') => void;
  selectedCustomer: Customer;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  translation: (k: string) => string;
}

export function CustomerDetailTabs({
  activeTab,
  setActiveTab,
  selectedCustomer,
  transactions,
  settings,
  onRestore,
  translation
}: CustomerDetailTabsProps) {
  const storeTransactions = useTransactionStore(s => s.transactions);
  const returns = useTransactionStore(s => s.returns) || [];

  const handleRestore = (t: Transaction) => {
    if (typeof onRestore === 'function') {
      onRestore(t);
    } else {
      useCartStore.getState().loadTransactionToCart(t, (tab: string) => {
        window.dispatchEvent(new CustomEvent('change-tab', { detail: tab }));
      });
    }
  };

  // Récupération directe depuis Supabase pour ce client si non présent dans le cache récent
  const [directTxs, setDirectTxs] = useState<Transaction[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCustomer?.id || !isSupabaseConfigured) return;
    let isMounted = true;
    setIsLoadingTxs(true);

    supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', selectedCustomer.id)
      .order('timestamp', { ascending: false })
      .limit(50)
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data && isMounted) {
          const parsed = data.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch (_) { item.items = []; }
            }
            return convertKeysToCamel(item) as Transaction;
          });
          setDirectTxs(parsed);
        }
      })
      .catch(console.warn)
      .finally(() => {
        if (isMounted) setIsLoadingTxs(false);
      });

    return () => { isMounted = false; };
  }, [selectedCustomer?.id]);

  const allTxs = useMemo(() => {
    const map = new Map<string, Transaction>();
    (transactions || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    (storeTransactions || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    (directTxs || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
    return Array.from(map.values());
  }, [transactions, storeTransactions, directTxs]);

  const targetCustId = String(selectedCustomer?.id || '');
  const targetCustName = String(selectedCustomer?.name || '').toLowerCase().trim();

  const customerTransactions = useMemo(() => {
    return allTxs.filter(t => {
      if (!t) return false;
      const cId = String(t.customerId || t.customer_id || '');
      const cName = String(t.customerName || t.customer_name || '').toLowerCase().trim();
      return (targetCustId && cId === targetCustId) || (targetCustName && cName === targetCustName);
    });
  }, [allTxs, targetCustId, targetCustName]);

  const customerReturns = useMemo(() => {
    return (returns || []).filter(r => {
      if (!r) return false;
      const cId = String(r.customerId || r.customer_id || '');
      const cName = String(r.customerName || r.customer_name || '').toLowerCase().trim();
      return (targetCustId && cId === targetCustId) || (targetCustName && cName === targetCustName);
    });
  }, [returns, targetCustId, targetCustName]);

  const storeOnlineOrders = useTransactionStore(s => s.onlineOrders) || [];

  const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '');
  const custPhoneClean = cleanPhone(selectedCustomer?.phone);

  const customerOnlineOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return (storeOnlineOrders || []).filter(o => {
      if (!o) return false;
      const matchesId = targetCustId && String(o.customerId || '') === targetCustId;
      const matchesPhone = custPhoneClean && cleanPhone(o.customerPhone) === custPhoneClean;
      const matchesName = targetCustName && String(o.customerName || '').toLowerCase().trim() === targetCustName;
      return matchesId || matchesPhone || matchesName;
    });
  }, [storeOnlineOrders, selectedCustomer, targetCustId, targetCustName, custPhoneClean]);

  // Combine et tri chronologique descendant
  const timeline = useMemo(() => {
    const list: any[] = [];
    const processedOnlineOrderIds = new Set<string>();

    customerTransactions.forEach(t => {
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const isOnline = Boolean(
        t.onlineOrderId || 
        t.employeeId === 'online_sync' || 
        t.employeeName === 'Commande en ligne' ||
        t.source === 'online' ||
        t.source === 'app' ||
        t.source === 'Site Web' ||
        (t.deliveryMethod && t.deliveryMethod !== 'in_store')
      );

      if (t.onlineOrderId) {
        processedOnlineOrderIds.add(String(t.onlineOrderId));
      }

      list.push({
        type: 'transaction' as const,
        channel: isOnline ? ('online' as const) : ('in_store' as const),
        id: t.id,
        timestamp: t.timestamp || t.created_at || new Date().toISOString(),
        total: Number(t.total || t.totalAmount || 0),
        items,
        onlineOrderId: t.onlineOrderId,
        deliveryMethod: t.deliveryMethod,
        raw: t
      });
    });

    customerOnlineOrders.forEach(o => {
      if (processedOnlineOrderIds.has(String(o.id)) || (o.externalOrderId && processedOnlineOrderIds.has(String(o.externalOrderId)))) {
        return; // Déjà représentée dans les transactions synchronisées
      }

      let items = o.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      list.push({
        type: 'online_order' as const,
        channel: 'online' as const,
        id: o.id,
        externalOrderId: o.externalOrderId,
        timestamp: o.timestamp || o.created_at || new Date().toISOString(),
        total: Number(o.total || 0),
        items,
        status: o.status,
        paymentStatus: o.paymentStatus,
        deliveryMethod: o.deliveryMethod,
        raw: o
      });
    });

    customerReturns.forEach(r => {
      let items = r.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      list.push({
        type: 'return' as const,
        channel: 'in_store' as const,
        id: r.id,
        timestamp: r.timestamp || r.date || new Date().toISOString(),
        total: Number(r.totalRefund || r.refundAmount || 0),
        items,
        raw: r
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customerTransactions, customerOnlineOrders, customerReturns]);

  const safeTranslation = typeof translation === 'function' ? translation : ((k: string) => k);

  // Statistiques pour Journal de bord et résumé fiche client
  const historyStats = useMemo(() => {
    let storeCount = 0;
    let storeTotal = 0;
    let onlineCount = 0;
    let onlineTotal = 0;
    let returnsCount = 0;
    let refundTotal = 0;

    timeline.forEach(item => {
      if (item.type === 'transaction') {
        if (item.channel === 'online') {
          onlineCount++;
          onlineTotal += (item.total || 0);
        } else {
          storeCount++;
          storeTotal += (item.total || 0);
        }
      } else if (item.type === 'online_order') {
        onlineCount++;
        onlineTotal += (item.total || 0);
      } else if (item.type === 'return') {
        returnsCount++;
        refundTotal += (item.total || 0);
      }
    });

    const salesTotal = storeTotal + onlineTotal;

    return {
      totalOps: timeline.length,
      salesCount: storeCount + onlineCount,
      salesTotal,
      storeCount,
      storeTotal,
      onlineCount,
      onlineTotal,
      returnsCount,
      refundTotal,
      netTotal: salesTotal - refundTotal
    };
  }, [timeline]);

  return (
    <>
      {/* Tabs Navigation (Compact ~36px) */}
      <div className="flex border-b border-slate-800 bg-slate-950/90 px-3">
        <button 
          type="button"
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'info' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <UserCheck size={14} />
          {safeTranslation("Général")}
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'history' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <History size={14} />
          {safeTranslation("Journal de bord")}
          <span className="bg-indigo-500/20 text-indigo-400 py-0.2 px-1.5 rounded text-[10px] font-mono font-bold border border-indigo-500/30">
            {timeline.length}
          </span>
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('card')}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5", 
            activeTab === 'card' 
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" 
              : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <CreditCard size={14} />
          {safeTranslation("Digital Card")}
        </button>
      </div>

      {/* Tab Content Modulaire */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 bg-slate-950/60">
        {activeTab === 'info' && (
          <CustomerInfoTab
            selectedCustomer={selectedCustomer}
            settings={settings}
            historyStats={historyStats}
          />
        )}

        {activeTab === 'history' && (
          <CustomerHistoryTab
            selectedCustomer={selectedCustomer}
            settings={settings}
            timeline={timeline}
            historyStats={historyStats}
            isLoadingTxs={isLoadingTxs}
            onRestore={handleRestore}
          />
        )}

        {activeTab === 'card' && (
          <CustomerDigitalCardTab
            selectedCustomer={selectedCustomer}
            settings={settings}
          />
        )}
      </div>
    </>
  );
}
