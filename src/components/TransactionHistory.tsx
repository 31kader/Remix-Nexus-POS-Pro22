import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, History, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked } from '../lib/utils';
import { printReceipt } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

import { StockAdjustmentModal } from './StockAdjustmentModal';
import { DuplicateSKUModal } from './DuplicateSKUModal';
import { ImportModal } from './ImportModal';
import { ProductFormModal } from './ProductFormModal';
import { LabelPrinter } from './LabelPrinter';
import { SupplierSyncManager } from './SupplierSyncManager';
import { StockHistory } from './StockHistory';
import { BarcodeScanner } from './BarcodeScanner';
import { ManualQRCodeGenerator } from './ManualQRCodeGenerator';


 // TODO: fix missing imports 

import { TransactionFilters } from './transactions/TransactionFilters';
import { TransactionTable } from './transactions/TransactionTable';
import { useTransactionHistoryLogic, TransactionHistoryProps } from './useTransactionHistoryLogic';

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
          <Button variant="secondary" onClick={() => exportToExcel(filteredTransactions, 'transactions')} className="flex items-center gap-2 bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
            <FileSpreadsheet size={18} /> Excel
          </Button>
          <Button variant="secondary" onClick={() => exportToCSV(filteredTransactions, 'transactions')} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
            <Database size={18} /> CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm space-y-4">
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
                value={tempCustomRange.start}
                onChange={e => setTempCustomRange({...tempCustomRange, start: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Au</label>
              <input 
                type="date" 
                className="p-1 px-2.5 bg-slate-950/60 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-indigo-500"
                value={tempCustomRange.end}
                onChange={e => setTempCustomRange({...tempCustomRange, end: e.target.value})}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BlurCard title="Total Période" borderClass="border-l-4 border-l-indigo-500">
          <p className="text-2xl font-black text-white">{totalPeriod.toFixed(2)} {settings.currency}</p>
        </BlurCard>
        <BlurCard title="Transactions" borderClass="border-l-4 border-l-emerald-500">
          <p className="text-2xl font-black text-white">{filteredTransactions.length}</p>
        </BlurCard>
        <BlurCard title="Panier Moyen" borderClass="border-l-4 border-l-amber-500">
          <p className="text-2xl font-black text-white">
            {filteredTransactions.length > 0 ? (totalPeriod / filteredTransactions.length).toFixed(2) : '0.00'} {settings.currency}
          </p>
        </BlurCard>
      </div>

      <TransactionTable 
        transactions={filteredTransactions}
        settings={settings}
        onReturn={onReturn}
        onMarkAsDelivered={(t) => onMarkAsDelivered(t.id)}
        onEdit={onEdit}
        onRestore={(t) => onRestore(t.id)}
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
