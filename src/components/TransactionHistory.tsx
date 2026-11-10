import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, History, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, formatPrice } from '../lib/utils';
import { printReceipt } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toDateInputValue } from '../utils/dateHelpers';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

import { TransactionFilters } from './transactions/TransactionFilters';
import { TransactionTable } from './transactions/TransactionTable';
import { useTransactionHistoryLogic, TransactionHistoryProps } from '../hooks/useTransactionHistoryLogic';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';

export function TransactionHistory(props: TransactionHistoryProps) {
  const { transactions, onReturn, onMarkAsDelivered, onEdit, onRestore, settings, canAccess, profile } = props;
  const {
    dateFilter,
    setDateFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    deliveryMethodFilter,
    setDeliveryMethodFilter,
    customRange,
    setCustomRange,
    customerNameSearch,
    setCustomerNameSearch,
    amountSearch,
    setAmountSearch,
    tempDateFilter,
    setTempDateFilter,
    tempPaymentMethodFilter,
    setTempPaymentMethodFilter,
    tempDeliveryMethodFilter,
    setTempDeliveryMethodFilter,
    tempCustomRange,
    setTempCustomRange,
    tempCustomerNameSearch,
    setTempCustomerNameSearch,
    tempAmountSearch,
    setTempAmountSearch,
    sortConfig,
    setSortConfig,
    historicalTransactions,
    setHistoricalTransactions,
    isLoadingMore,
    setIsLoadingMore,
    lastVisible,
    setLastVisible,
    applyFilters,
    requestSort,
    filteredTransactions,
    resetFilters,
    totalPeriod,
    handlePrint,
    generateInvoicePDF,
    handlePrintList,
    loadOlderTransactions
  } = useTransactionHistoryLogic(props);

  const products = useCoreStore(s => s.products);
  const customers = usePeopleStore(s => s.customers);
  const employees = usePeopleStore(s => s.employees);

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => { if (p?.id) map.set(p.id, p); });
    return map;
  }, [products]);

  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    (customers || []).forEach(c => { if (c?.id) map.set(c.id, c); });
    return map;
  }, [customers]);

  const employeesMap = useMemo(() => {
    const map = new Map<string, Employee>();
    (employees || []).forEach(e => { if (e?.id) map.set(e.id, e); });
    return map;
  }, [employees]);

  const handleExportSalesExcel = () => {
    const rows: any[] = [];
    filteredTransactions.forEach(tx => {
      const items = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items : null;
      const txDate = formatSafe(tx.timestamp, 'yyyy-MM-dd HH:mm');
      const txNum = tx.id ? `#${String(tx.id).slice(-8).toUpperCase()}` : '—';
      const custName = tx.customerName || (tx.customerId ? customersMap.get(tx.customerId)?.name : 'Client standard') || 'Client standard';
      const cashier = (tx as any).userName || (tx as any).employeeName || (tx.userId ? employeesMap.get(tx.userId)?.name : 'Caissier') || 'Caissier';
      const payMethod = tx.paymentMethod === 'cash' ? 'Espèces' 
                      : tx.paymentMethod === 'card' ? 'Carte bancaire' 
                      : tx.paymentMethod === 'balance' ? 'Solde Client' 
                      : tx.paymentMethod === 'debt' ? 'À crédit (Dette)' 
                      : tx.paymentMethod || 'Espèces';

      if (items) {
        items.forEach(item => {
          const prodId = (item as any).productId || item.id;
          const prod = prodId ? productsMap.get(prodId) : null;
          const barcode = item.barcode || prod?.barcode || (prod as any)?.barcodes?.[0] || 'SANS-CODE';
          const productName = item.name || item.productName || prod?.name || 'Article sans nom';
          const qty = item.quantity || 1;
          const unitPrice = item.overriddenPrice ?? item.price ?? 0;
          const discountStr = item.lineDiscount ? (item.lineDiscount.type === 'percentage' ? `${item.lineDiscount.value}%` : `${item.lineDiscount.value} DA`) : '0';
          const lineTotal = unitPrice * qty;

          rows.push({
            'Date & Heure': txDate,
            'N° Ticket': txNum,
            'Code-barres': barcode,
            'Nom de l\'article': productName,
            'Quantité': qty,
            'Prix Unitaire (DA)': formatPrice(unitPrice),
            'Remise': discountStr,
            'Total Ligne (DA)': formatPrice(lineTotal),
            'Mode Paiement': payMethod,
            'Client': custName,
            'Caissier': cashier,
            'Statut': tx.status || 'complété'
          });
        });
      } else {
        rows.push({
          'Date & Heure': txDate,
          'N° Ticket': txNum,
          'Code-barres': '—',
          'Nom de l\'article': 'Vente directe (sans détail)',
          'Quantité': 1,
          'Prix Unitaire (DA)': formatPrice(tx.total || 0),
          'Remise': '0',
          'Total Ligne (DA)': formatPrice(tx.total || 0),
          'Mode Paiement': payMethod,
          'Client': custName,
          'Caissier': cashier,
          'Statut': tx.status || 'complété'
        });
      }
    });

    const fileName = `ventes_articles_${format(new Date(), 'yyyyMMdd_HHmm')}`;
    exportToExcel(rows, fileName);
  };

  const handleExportSalesCSV = () => {
    const rows: any[] = [];
    filteredTransactions.forEach(tx => {
      const items = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items : null;
      const txDate = formatSafe(tx.timestamp, 'yyyy-MM-dd HH:mm');
      const txNum = tx.id ? `#${String(tx.id).slice(-8).toUpperCase()}` : '—';
      const custName = tx.customerName || (tx.customerId ? customersMap.get(tx.customerId)?.name : 'Client standard') || 'Client standard';
      const cashier = (tx as any).userName || (tx as any).employeeName || (tx.userId ? employeesMap.get(tx.userId)?.name : 'Caissier') || 'Caissier';
      const payMethod = tx.paymentMethod === 'cash' ? 'Espèces' 
                      : tx.paymentMethod === 'card' ? 'Carte bancaire' 
                      : tx.paymentMethod === 'balance' ? 'Solde Client' 
                      : tx.paymentMethod === 'debt' ? 'À crédit (Dette)' 
                      : tx.paymentMethod || 'Espèces';

      if (items) {
        items.forEach(item => {
          const prodId = (item as any).productId || item.id;
          const prod = prodId ? productsMap.get(prodId) : null;
          const barcode = item.barcode || prod?.barcode || (prod as any)?.barcodes?.[0] || 'SANS-CODE';
          const productName = item.name || item.productName || prod?.name || 'Article sans nom';
          const qty = item.quantity || 1;
          const unitPrice = item.overriddenPrice ?? item.price ?? 0;
          const discountStr = item.lineDiscount ? (item.lineDiscount.type === 'percentage' ? `${item.lineDiscount.value}%` : `${item.lineDiscount.value} DA`) : '0';
          const lineTotal = unitPrice * qty;

          rows.push({
            date: txDate,
            ticket: txNum,
            code_barre: barcode,
            nom_article: productName,
            quantite: qty,
            prix_unitaire: unitPrice,
            remise: discountStr,
            total_ligne: lineTotal,
            mode_paiement: payMethod,
            client: custName,
            caissier: cashier,
            statut: tx.status || 'complété'
          });
        });
      } else {
        rows.push({
          date: txDate,
          ticket: txNum,
          code_barre: '—',
          nom_article: 'Vente directe (sans détail)',
          quantite: 1,
          prix_unitaire: tx.total || 0,
          remise: '0',
          total_ligne: tx.total || 0,
          mode_paiement: payMethod,
          client: custName,
          caissier: cashier,
          statut: tx.status || 'complété'
        });
      }
    });

    const fileName = `ventes_articles_${format(new Date(), 'yyyyMMdd_HHmm')}`;
    exportToCSV(rows, fileName);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Historique des transactions</h3>
          <p className="text-sm text-white/40">{filteredTransactions.length} transactions trouvées</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handlePrintList} className="flex items-center gap-2 border-slate-700 text-white bg-slate-800 hover:bg-slate-700">
            <Printer size={18} /> Rapport
          </Button>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <Button variant="secondary" onClick={handleExportSalesExcel} className="flex items-center gap-2 bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" title="Exporter le détail des ventes avec code-barres et désignation de chaque article">
            <FileSpreadsheet size={18} /> Excel
          </Button>
          <Button variant="secondary" onClick={handleExportSalesCSV} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" title="Exporter au format CSV avec code-barres et désignation">
            <Database size={18} /> CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-slate-900/40 border border-slate-800/60  space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
          <Filter size={16} className="text-indigo-400" />
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Filtres de recherche avancés</h4>
        </div>
        <TransactionFilters 
          tempDateFilter={tempDateFilter} setTempDateFilter={setTempDateFilter}
          tempPaymentMethodFilter={tempPaymentMethodFilter} setTempPaymentMethodFilter={setTempPaymentMethodFilter}
          tempDeliveryMethodFilter={tempDeliveryMethodFilter} setTempDeliveryMethodFilter={setTempDeliveryMethodFilter}
          tempCustomRange={tempCustomRange} setTempCustomRange={setTempCustomRange}
          tempCustomerNameSearch={tempCustomerNameSearch} setTempCustomerNameSearch={setTempCustomerNameSearch}
          tempAmountSearch={tempAmountSearch} setTempAmountSearch={setTempAmountSearch}
          applyFilters={applyFilters} resetFilters={resetFilters}
        />
        {tempDateFilter === 'custom' && (
          <div className="pt-3 border-t border-slate-800/20 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Du</label>
              <input 
                type="date" 
                className="p-1 px-2.5 bg-slate-950/60 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-indigo-500"
                value={toDateInputValue(tempCustomRange.start)}
                onChange={e => setTempCustomRange({...tempCustomRange, start: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Au</label>
              <input 
                type="date" 
                className="p-1 px-2.5 bg-slate-950/60 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-indigo-500"
                value={toDateInputValue(tempCustomRange.end)}
                onChange={e => setTempCustomRange({...tempCustomRange, end: e.target.value})}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BlurCard title="Total Période" borderClass="border-l-4 border-l-indigo-500">
          <p className="text-2xl font-black text-white">{formatPrice(totalPeriod)} {settings.currency}</p>
        </BlurCard>
        <BlurCard title="Transactions" borderClass="border-l-4 border-l-emerald-500">
          <p className="text-2xl font-black text-white">{filteredTransactions.length}</p>
        </BlurCard>
        <BlurCard title="Panier Moyen" borderClass="border-l-4 border-l-amber-500">
          <p className="text-2xl font-black text-white">
            {filteredTransactions.length > 0 ? formatPrice(totalPeriod / filteredTransactions.length) : '0.00'} {settings.currency}
          </p>
        </BlurCard>
      </div>

      <TransactionTable 
        transactions={filteredTransactions}
        settings={settings}
        onReturn={onReturn}
        onMarkAsDelivered={onMarkAsDelivered}
        onEdit={onEdit}
        onRestore={onRestore}
        canAccess={canAccess}
        requestSort={requestSort}
        sortConfig={sortConfig}
        generateInvoicePDF={generateInvoicePDF}
        handlePrint={handlePrint}
      />

      {lastVisible !== 'DONE' && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={loadOlderTransactions} 
            disabled={isLoadingMore}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest text-xs border border-slate-700 rounded-xl"
          >
            {isLoadingMore ? "Chargement..." : "Charger plus de ventes"}
          </Button>
        </div>
      )}
    </div>
  );
}
