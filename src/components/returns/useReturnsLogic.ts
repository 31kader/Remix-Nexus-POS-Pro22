import { useState, useMemo, useEffect } from 'react';
import { Product, ProductReturn, CompanySettings } from '../../types';
import { formatSafe, exportToExcel, exportToCSV, formatPrice } from '../../lib/utils';
import { startOfDay, endOfDay, subDays, parseISO, isWithinInterval, isYesterday } from 'date-fns';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { useTransactionStore } from '../../store/useTransactionStore';
import { del as idbDel } from 'idb-keyval';
import { toast } from 'sonner';
import { ReturnsDateFilter } from './returnsTypes';

export function useReturnsLogic(returns: ProductReturn[] = [], products: Product[] = []) {
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [dateFilter, setDateFilter] = useState<ReturnsDateFilter>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, customRange, searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const displayedReturns = useMemo(() => {
    const from = (validPage - 1) * pageSize;
    return filteredReturns.slice(from, from + pageSize);
  }, [filteredReturns, validPage, pageSize]);

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

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => { if (p?.id) map.set(p.id, p); });
    return map;
  }, [products]);

  const handleExportReturnsExcel = () => {
    const rows: any[] = [];
    filteredReturns.forEach(ret => {
      const items = Array.isArray(ret.items) && ret.items.length > 0 ? ret.items : null;
      const retDate = formatSafe(ret.timestamp || ret.date, 'yyyy-MM-dd HH:mm');
      const txNum = ret.transactionId ? `#${String(ret.transactionId).slice(-8).toUpperCase()}` : '—';
      if (items) {
        items.forEach(item => {
          const prod = item.productId ? productsMap.get(item.productId) : null;
          rows.push({
            'Date & Heure': retDate,
            'N° Transaction': txNum,
            'Code-barres': (item as any).barcode || prod?.barcode || 'SANS-CODE',
            'Nom de l\'article': item.name || prod?.name || 'Article sans nom',
            'Quantité Retournée': item.quantity || 1,
            'Prix Remboursé (DA)': formatPrice(item.price || 0),
            'Total Remboursé Ligne (DA)': formatPrice((item.price || 0) * (item.quantity || 1)),
            'Motif': ret.reason || 'Retour standard',
            'Client': ret.customerName || 'Client'
          });
        });
      } else {
        rows.push({
          'Date & Heure': retDate,
          'N° Transaction': txNum,
          'Code-barres': '—',
          'Nom de l\'article': 'Retour global',
          'Quantité Retournée': 1,
          'Prix Remboursé (DA)': formatPrice(ret.totalRefund || 0),
          'Total Remboursé Ligne (DA)': formatPrice(ret.totalRefund || 0),
          'Motif': ret.reason || 'Retour standard',
          'Client': ret.customerName || 'Client'
        });
      }
    });
    exportToExcel(rows, `retours_articles_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportReturnsCSV = () => {
    const rows: any[] = [];
    filteredReturns.forEach(ret => {
      const items = Array.isArray(ret.items) && ret.items.length > 0 ? ret.items : null;
      const retDate = formatSafe(ret.timestamp || ret.date, 'yyyy-MM-dd HH:mm');
      const txNum = ret.transactionId ? `#${String(ret.transactionId).slice(-8).toUpperCase()}` : '—';
      if (items) {
        items.forEach(item => {
          const prod = item.productId ? productsMap.get(item.productId) : null;
          rows.push({
            date: retDate,
            transaction: txNum,
            code_barre: (item as any).barcode || prod?.barcode || 'SANS-CODE',
            nom_article: item.name || prod?.name || 'Article sans nom',
            quantite: item.quantity || 1,
            prix: item.price || 0,
            total_rembourse: (item.price || 0) * (item.quantity || 1),
            motif: ret.reason || 'Retour standard'
          });
        });
      } else {
        rows.push({
          date: retDate,
          transaction: txNum,
          code_barre: '—',
          nom_article: 'Retour global',
          quantite: 1,
          prix: ret.totalRefund || 0,
          total_rembourse: ret.totalRefund || 0,
          motif: ret.reason || 'Retour standard'
        });
      }
    });
    exportToCSV(rows, `retours_articles_${new Date().toISOString().split('T')[0]}`);
  };

  return {
    selectedReturn,
    setSelectedReturn,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    safeReturns,
    filteredReturns,
    displayedReturns,
    totalRefundAmount,
    totalPages,
    validPage,
    handlePurgeAllReturns,
    handleExportReturnsExcel,
    handleExportReturnsCSV
  };
}
