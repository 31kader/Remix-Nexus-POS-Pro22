import React, { useState, useMemo } from 'react';
import { RotateCcw, Calendar, Search, Filter, Eye, FileSpreadsheet, Database, X, Trash2 } from 'lucide-react';
import { Product, CompanySettings, ProductReturn } from '../types';
import { formatSafe, exportToExcel, exportToCSV } from '../lib/utils';
import { Button, Card } from './ui';
import { startOfDay, endOfDay, subDays, parseISO, isWithinInterval, isYesterday } from 'date-fns';
import { localDb } from '../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCoreStore } from '../store/useCoreStore';
import { del as idbDel } from 'idb-keyval';
import { toast } from 'sonner';

export function Returns({ returns = [], settings, products = [] }: { returns: ProductReturn[], settings: CompanySettings, products?: Product[] }) {
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const safeReturns = Array.isArray(returns) ? returns : [];

  const handlePurgeAllReturns = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir SUPPRIMER TOUS les retours de la liste ? Cette action est irréversible.")) {
      return;
    }
    try {
      const itemsToPurge = [...safeReturns];
      for (const item of itemsToPurge) {
        if (item.id) {
          await localDb.delete(`returns/${item.id}`);
          if (isSupabaseConfigured) {
            try { await supabase.from('returns').delete().eq('id', item.id); } catch (_) {}
          }
        }
      }
      useTransactionStore.getState().setReturns([]);
      try { await idbDel('nexus_returns_cache'); } catch (_) {}
      try { localStorage.removeItem('nexus_returns_cache'); } catch (_) {}
      window.dispatchEvent(new CustomEvent('local-db-reload'));
      toast.success("Tous les retours ont été supprimés avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression des retours: " + (err.message || 'Erreur inconnue'));
    }
  };

  const filteredReturns = useMemo(() => {
    return safeReturns.filter((r: any) => {
      const dateVal = r.timestamp || r.date || r.created_at || r.updated_at;
      const returnDate = dateVal ? new Date(dateVal) : new Date();

      // 1. Date Filter
      const now = new Date();
      if (dateFilter === 'today') {
        const start = startOfDay(now);
        const end = endOfDay(now);
        if (!isWithinInterval(returnDate, { start, end })) return false;
      } else if (dateFilter === 'yesterday') {
        if (!isYesterday(returnDate)) return false;
      } else if (dateFilter === 'last7days') {
        const start = startOfDay(subDays(now, 7));
        const end = endOfDay(now);
        if (!isWithinInterval(returnDate, { start, end })) return false;
      } else if (dateFilter === 'last30days') {
        const start = startOfDay(subDays(now, 30));
        const end = endOfDay(now);
        if (!isWithinInterval(returnDate, { start, end })) return false;
      } else if (dateFilter === 'custom' && customRange.start && customRange.end) {
        const start = startOfDay(parseISO(customRange.start));
        const end = endOfDay(parseISO(customRange.end));
        if (!isWithinInterval(returnDate, { start, end })) return false;
      }

      // 2. Search filter (Transaction ID, Reason, Notes)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const txId = (r.transactionId || r.transaction_id || '').toLowerCase();
        const reason = (r.reason || r.notes || '').toLowerCase();
        if (!txId.includes(term) && !reason.includes(term)) return false;
      }

      return true;
    });
  }, [safeReturns, dateFilter, customRange, searchTerm]);

  const totalRefundAmount = useMemo(() => {
    return filteredReturns.reduce((sum, r: any) => {
      const refundVal = typeof r.totalRefund === 'number' 
        ? r.totalRefund 
        : (typeof r.refundAmount === 'number' 
            ? r.refundAmount 
            : (parseFloat(r.refundAmount || r.totalRefund || r.refund_amount || r.total_refund || '0') || 0));
      return sum + refundVal;
    }, 0);
  }, [filteredReturns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <RotateCcw className="text-rose-400" size={24} />
            Gestion des Retours
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {filteredReturns.length} retours filtrés • Total Remboursé : <strong className="text-rose-400 font-mono">{totalRefundAmount.toFixed(2)} {settings?.currency || 'DA'}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => exportToExcel(filteredReturns, 'retours')} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
            <FileSpreadsheet size={16} /> Excel
          </Button>
          <Button variant="secondary" onClick={() => exportToCSV(filteredReturns, 'retours')} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
            <Database size={16} /> CSV
          </Button>
          {safeReturns.length > 0 && (
            <Button variant="secondary" onClick={handlePurgeAllReturns} className="flex items-center gap-2 bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30">
              <Trash2 size={16} /> Vider les Retours
            </Button>
          )}
        </div>
      </div>

      {/* Date Filters & Search Bar */}
      <Card className="p-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher par N° de transaction ou motif..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Tout
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'yesterday' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Hier
            </button>
            <button
              onClick={() => setDateFilter('last7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'last7days' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              7 Jours
            </button>
            <button
              onClick={() => setDateFilter('last30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'last30days' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              30 Jours
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Période
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                value={customRange.start}
                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-slate-500 text-xs">à</span>
              <input 
                type="date"
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                value={customRange.end}
                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden bg-slate-900/60 border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remboursement</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReturns.map((r: any) => {
                const dateVal = r.timestamp || r.date || r.created_at || r.updated_at;
                const refundVal = typeof r.totalRefund === 'number' 
                  ? r.totalRefund 
                  : (typeof r.refundAmount === 'number' 
                      ? r.refundAmount 
                      : (parseFloat(r.refundAmount || r.totalRefund || r.refund_amount || r.total_refund || '0') || 0));
                const returnTypeMapped = r.type || 'refund';

                return (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-300">
                      {dateVal ? formatSafe(dateVal, 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td className="p-4 text-xs font-mono text-indigo-400 font-bold">
                      #{String(r.transactionId || r.transaction_id || '').slice(-8).toUpperCase() || 'INCONNU'}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        returnTypeMapped === 'refund' 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 italic">
                      "{r.reason || r.notes || 'Aucune raison indiquée'}"
                    </td>
                    <td className="p-4 font-black text-emerald-400 font-mono">{refundVal.toFixed(2)} {settings?.currency || 'DA'}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedReturn(r)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono italic">AUCUN RETOUR CORRESPONDANT</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ReturnDetailsModal 
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
        settings={settings}
        products={products}
      />
    </div>
  );
}

export function ReturnDetailsModal({ isOpen, onClose, returnRecord, settings, products = [] }: { isOpen: boolean, onClose: () => void, returnRecord: any, settings: CompanySettings, products?: Product[] }) {
  if (!returnRecord) return null;

  const dateVal = returnRecord.timestamp || returnRecord.date || returnRecord.created_at || returnRecord.updated_at;
  const refundVal = typeof returnRecord.totalRefund === 'number' 
    ? returnRecord.totalRefund 
    : (typeof returnRecord.refundAmount === 'number' 
        ? returnRecord.refundAmount 
        : (parseFloat(returnRecord.refundAmount || returnRecord.totalRefund || returnRecord.refund_amount || returnRecord.total_refund || '0') || 0));
  const returnTypeMapped = returnRecord.type || 'refund';
  
  let rawItems = returnRecord.items;
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch (_) {
      rawItems = [];
    }
  }

  const items = Array.isArray(rawItems) 
    ? rawItems 
    : (returnRecord.productId || returnRecord.product_id ? (() => {
        const pId = returnRecord.productId || returnRecord.product_id;
        const matchedProduct = products.find((p: any) => p.id === pId);
        return [{
          productId: pId,
          name: matchedProduct?.name || 'Produit',
          quantity: returnRecord.quantity || 1,
          price: refundVal
        }];
      })() : []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h4 className="text-lg font-black text-white uppercase tracking-wider">Détails du Retour</h4>
            <p className="text-xs font-mono text-indigo-400 mt-0.5">#{String(returnRecord.id || '').slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/40">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/60 font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Date & Heure</span>
              <strong className="text-white">{dateVal ? formatSafe(dateVal, 'dd/MM/yyyy HH:mm') : '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Transaction Liée</span>
              <strong className="text-indigo-400">#{String(returnRecord.transactionId || '').slice(-8).toUpperCase() || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Type</span>
              <strong className="text-amber-400 uppercase">{returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Montant Remboursé</span>
              <strong className="text-emerald-400 text-sm font-black">{refundVal.toFixed(2)} {settings?.currency || 'DA'}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Articles Retournés</span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div>
                    <p className="font-bold text-white text-xs">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.quantity} x {Number(item.price || 0).toFixed(2)} {settings?.currency || 'DA'}</p>
                  </div>
                  <strong className="text-white font-mono">{((item.quantity || 1) * (item.price || 0)).toFixed(2)} {settings?.currency || 'DA'}</strong>
                </div>
              ))}
            </div>
          </div>

          {returnRecord.reason && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Motif</span>
              <p className="text-slate-300 italic">"{returnRecord.reason}"</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose} 
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
