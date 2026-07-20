import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, History, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, Camera } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions, UserProfile } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked } from '../lib/utils';
import { printReceipt } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { convertKeysToCamel } from '../lib/db-converters';

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

export interface TransactionHistoryProps {
  transactions: Transaction[];
  onReturn: (t: Transaction) => void;
  onMarkAsDelivered: (id: string) => Promise<void>;
  onEdit: (t: Transaction) => void;
  onRestore: (id: string) => Promise<void>;
  settings: CompanySettings;
  canAccess: (permission: keyof RolePermissions) => boolean;
  profile?: UserProfile;
}

export function useTransactionHistoryLogic(props: TransactionHistoryProps) {
  const { transactions, onReturn, onMarkAsDelivered, onEdit, onRestore, settings, canAccess, profile } = props;
const [dateFilter, setDateFilter] = useState('all'); // all, today, last7days, last30days
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [customerNameSearch, setCustomerNameSearch] = useState('');
  const [amountSearch, setAmountSearch] = useState('');

  // Temporary filter states for explicit apply action
  const [tempDateFilter, setTempDateFilter] = useState('all');
  const [tempPaymentMethodFilter, setTempPaymentMethodFilter] = useState('all');
  const [tempDeliveryMethodFilter, setTempDeliveryMethodFilter] = useState('all');
  const [tempCustomRange, setTempCustomRange] = useState({ start: '', end: '' });
  const [tempCustomerNameSearch, setTempCustomerNameSearch] = useState('');
  const [tempAmountSearch, setTempAmountSearch] = useState('');

  const [historicalTransactions, setHistoricalTransactions] = useState<Transaction[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);

  const fetchFilteredFromNetwork = async (filters: {
    dateFilter: string;
    paymentMethod: string;
    deliveryMethod: string;
    customRange: { start: string; end: string };
    customerName: string;
    amount: string;
  }) => {
    if (!isSupabaseConfigured) return;
    setIsLoadingMore(true);
    try {
      let query = supabase
        .from('transactions')
        .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status');

      // Date filters
      const now = new Date();
      if (filters.dateFilter === 'today') {
        query = query.gte('timestamp', startOfDay(now).toISOString()).lte('timestamp', endOfDay(now).toISOString());
      } else if (filters.dateFilter === 'last7days') {
        query = query.gte('timestamp', startOfDay(subDays(now, 7)).toISOString()).lte('timestamp', endOfDay(now).toISOString());
      } else if (filters.dateFilter === 'last30days') {
        query = query.gte('timestamp', startOfDay(subDays(now, 30)).toISOString()).lte('timestamp', endOfDay(now).toISOString());
      } else if (filters.dateFilter === 'custom' && filters.customRange.start && filters.customRange.end) {
        query = query.gte('timestamp', startOfDay(parseISO(filters.customRange.start)).toISOString()).lte('timestamp', endOfDay(parseISO(filters.customRange.end)).toISOString());
      }

      // Payment method
      if (filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      // Delivery method
      if (filters.deliveryMethod !== 'all') {
        query = query.eq('delivery_method', filters.deliveryMethod);
      }

      // Customer name search
      if (filters.customerName) {
        query = query.ilike('customer_name', `%${filters.customerName}%`);
      }

      // Amount search
      if (filters.amount) {
        const amt = parseFloat(filters.amount);
        if (!isNaN(amt)) {
          query = query.eq('total', amt);
        }
      }

      // Cashier role restriction
      if (profile?.role === 'cashier') {
        query = query.eq('user_id', profile.uid);
      }

      const { data, error } = await query.order('timestamp', { ascending: false }).limit(100);

      if (error) throw error;

      if (data) {
        const camelData = data.map((item: any) => {
          const camel = convertKeysToCamel(item);
          if (typeof camel.items === 'string') {
            try { camel.items = JSON.parse(camel.items); } catch (e) { camel.items = []; }
          } else if (!camel.items) {
            camel.items = [];
          }
          return camel as Transaction;
        });

        setHistoricalTransactions(camelData);
        setLastVisible(camelData.length > 0 ? camelData[camelData.length - 1].timestamp : 'DONE');
      }
    } catch (err) {
      console.error("Error fetching filtered transactions from network", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const applyFilters = () => {
    setDateFilter(tempDateFilter);
    setPaymentMethodFilter(tempPaymentMethodFilter);
    setDeliveryMethodFilter(tempDeliveryMethodFilter);
    setCustomRange(tempCustomRange);
    setCustomerNameSearch(tempCustomerNameSearch);
    setAmountSearch(tempAmountSearch);

    fetchFilteredFromNetwork({
      dateFilter: tempDateFilter,
      paymentMethod: tempPaymentMethodFilter,
      deliveryMethod: tempDeliveryMethodFilter,
      customRange: tempCustomRange,
      customerName: tempCustomerNameSearch,
      amount: tempAmountSearch
    });
  };

  const resetFilters = () => {
    setTempDateFilter('all');
    setTempPaymentMethodFilter('all');
    setTempDeliveryMethodFilter('all');
    setTempCustomRange({ start: '', end: '' });
    setTempCustomerNameSearch('');
    setTempAmountSearch('');

    setDateFilter('all');
    setPaymentMethodFilter('all');
    setDeliveryMethodFilter('all');
    setCustomRange({ start: '', end: '' });
    setCustomerNameSearch('');
    setAmountSearch('');

    setHistoricalTransactions([]);
    setLastVisible(null);

    setTimeout(() => {
      loadOlderTransactions();
    }, 50);
  };

  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'id_display'; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    // Initial load of history if component is on screen
    if (historicalTransactions.length === 0 && !isLoadingMore) {
      loadOlderTransactions();
    }
  }, []);

  const loadOlderTransactions = async () => {
    setIsLoadingMore(true);
    try {
      let oldestTs: string;
      if (lastVisible && lastVisible !== 'DONE') {
        oldestTs = lastVisible;
      } else {
        const validTransactions = (transactions || []).filter((t: any) => t && t.timestamp);
        if (validTransactions.length > 0) {
           oldestTs = validTransactions.reduce((oldest: string, current: Transaction) => {
             const currTime = new Date(current.timestamp).getTime();
             const oldestTime = new Date(oldest).getTime();
             if (isNaN(currTime) || isNaN(oldestTime)) return oldest;
             return currTime < oldestTime ? current.timestamp : oldest;
           }, validTransactions[0].timestamp);
        } else {
           oldestTs = new Date().toISOString();
        }
      }

      // Query older transactions from Supabase
      let result = await supabase
        .from('transactions')
        .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status, audited_by, audited_at, audit_duration, audit_note')
        .lt('timestamp', oldestTs)
        .order('timestamp', { ascending: false })
        .limit(31);

      if (result.error) {
        console.warn("Retrying historical fetch with basic columns due to missing columns on Supabase:", result.error);
        result = await supabase
          .from('transactions')
          .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status')
          .lt('timestamp', oldestTs)
          .order('timestamp', { ascending: false })
          .limit(31);
      }

      const { data, error } = result;

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setLastVisible('DONE');
        return;
      }

      const newDocs: Transaction[] = (data || []).map((item: any) => {
        const camel = convertKeysToCamel(item);
        if (typeof camel.items === 'string') {
          try {
            camel.items = JSON.parse(camel.items);
          } catch (e) {
            camel.items = [];
          }
        } else if (!camel.items) {
          camel.items = [];
        }
        return camel as Transaction;
      });

      setHistoricalTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const filteredNewDocs = newDocs.filter(t => !existingIds.has(t.id));
        return [...prev, ...filteredNewDocs];
      });
      
      if (newDocs.length > 0) {
        setLastVisible(newDocs[newDocs.length - 1].timestamp);
      } else {
        setLastVisible('DONE');
      }
    } catch (error) {
      console.error("Error loading historical transactions", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const allCombinedTransactions = useMemo(() => {
    if (!transactions) return historicalTransactions || [];
    const historicalMap = new Map((historicalTransactions || []).map(t => [t.id, t]));
    transactions.forEach((t: Transaction) => {
      if (t && t.id) historicalMap.set(t.id, t);
    });
    let combined = Array.from(historicalMap.values());
    
    // Si c'est un caissier, il ne voit que ses propres transactions
    if (profile?.role === 'cashier') {
      combined = combined.filter((t: Transaction) => 
        t.userId === profile.uid
      );
    }
    
    return combined;
  }, [transactions, historicalTransactions, profile]);

  const filteredTransactions = useMemo(() => {
    const raw = allCombinedTransactions.filter((t: Transaction) => {
      if (!t || !t.timestamp) return false;
      const date = parseISO(t.timestamp);
      const now = new Date();

      // Date filter
      let dateMatch = true;
      if (dateFilter === 'custom') {
        if (customRange.start && customRange.end) {
          dateMatch = isWithinInterval(date, {
            start: startOfDay(parseISO(customRange.start)),
            end: endOfDay(parseISO(customRange.end))
          });
        }
      } else if (dateFilter === 'today') dateMatch = isToday(date);
      else if (dateFilter === 'last7days') {
        dateMatch = isWithinInterval(date, {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now)
        });
      }
      else if (dateFilter === 'last30days') {
        dateMatch = isWithinInterval(date, {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now)
        });
      }

      // Payment method filter
      const paymentMatch = paymentMethodFilter === 'all' || t.paymentMethod === paymentMethodFilter;

      // Delivery method filter
      const deliveryMatch = deliveryMethodFilter === 'all' || t.deliveryMethod === deliveryMethodFilter;

      // Customer name search
      const customerMatch = customerNameSearch === '' || (t.customerName && t.customerName.toLowerCase().includes(customerNameSearch.toLowerCase()));

      // Amount search
      const amountMatch = amountSearch === '' || (t.total || 0).toString().includes(amountSearch);

      return dateMatch && paymentMatch && deliveryMatch && customerMatch && amountMatch;
    });

    if (sortConfig !== null) {
      raw.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'id_display') {
          aValue = a.id?.slice(-8).toUpperCase();
          bValue = b.id?.slice(-8).toUpperCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return raw;
  }, [transactions, allCombinedTransactions, dateFilter, paymentMethodFilter, deliveryMethodFilter, customRange, customerNameSearch, amountSearch, sortConfig]);

  const requestSort = (key: keyof Transaction | 'id_display') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPeriod = filteredTransactions.reduce((acc: number, t: Transaction) => acc + (Number(t.total) || 0), 0);

  const handlePrint = (t: Transaction) => {
    printReceipt(t, settings);
  };

  const generateInvoicePDF = (t: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (t.items || []).map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${item.name || 'Article'}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.price || 0).toFixed(2)} ${settings.currency}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)} ${settings.currency}</td>
      </tr>
    `).join('');

    const subtotal = (t.items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
    const taxAmount = subtotal * ((settings.taxRate || 0) / 100);

    printWindow.document.write(`
      <html>
        <head>
          <title>Facture #${t.id?.slice(-8).toUpperCase()}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5; padding: 40px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .company-info h1 { margin: 0; color: #1e293b; font-size: 24px; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { margin: 0; color: #64748b; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
            .section { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .section-title { font-weight: bold; color: #1e293b; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { text-align: left; background: #f8fafc; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.grand-total { border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 12px; font-weight: bold; font-size: 18px; color: #1e293b; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>${settings.name}</h1>
              <p>${settings.address || ''}<br>${settings.phone || ''}<br>${settings.email || ''}</p>
            </div>
            <div class="invoice-details">
              <h2>Facture ${t.status === 'returned' ? '(RETOURNÉ)' : t.status === 'partially_returned' ? '(RETOUR PARTIEL)' : ''}</h2>
              <p>#${t.id?.slice(-8).toUpperCase()}<br>Date: ${formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>

          <div class="section">
            <div>
              <div class="section-title">Facturé à</div>
              <p><strong>${t.customerName || 'Client de passage'}</strong></p>
            </div>
            <div style="text-align: right;">
              <div class="section-title">Mode de Paiement</div>
              <p>${t.paymentMethod.toUpperCase()}</p>
              <div class="section-title" style="margin-top: 10px;">Type de Commande</div>
              <p>${(t.deliveryMethod || 'in_store').toUpperCase().replace('_', ' ')}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qté</th>
                <th style="text-align: right;">Prix Unitaire</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Sous-total HT</span>
              <span>${( Number(t.total || 0) / (1 + Number(settings.taxRate || 0)/100) ).toFixed(2)} ${settings.currency}</span>
            </div>
            <div class="total-row">
              <span>TVA (${settings.taxRate || 0}%)</span>
              <span>${( Number(t.total || 0) - ( Number(t.total || 0) / (1 + Number(settings.taxRate || 0)/100) ) ).toFixed(2)} ${settings.currency}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL TTC</span>
              <span>${Number(t.total || 0).toFixed(2)} ${settings.currency}</span>
            </div>
          </div>

          <div class="footer">
            <p>${settings.footerText || 'Merci de votre confiance !'}</p>
            ${settings.taxNumber ? `<p>TVA: ${settings.taxNumber}</p>` : ''}
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredTransactions.map((t: Transaction) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatSafe(t.timestamp, 'dd/MM/yyyy HH:mm')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">#${t.id?.slice(-8).toUpperCase()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; ${
            t.status === 'returned' ? 'background: #fee2e2; color: #b91c1c;' :
            t.status === 'partially_returned' ? 'background: #fef3c7; color: #b45309;' :
            'background: #ecfdf5; color: #047857;'
          }">
            ${t.status === 'returned' ? 'Retourné' : t.status === 'partially_returned' ? 'Retour Partiel' : 'Payé'}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.deliveryMethod || 'in_store'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.paymentMethod}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(t.total || 0).toFixed(2)} ${settings.currency}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport de Transactions</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; }
            .summary { margin-top: 30px; text-align: right; font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Rapport de Transactions - ${dateFilter === 'all' ? 'Toutes' : dateFilter}</h1>
          <p>Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>ID</th>
                <th>Statut</th>
                <th>Type</th>
                <th>Méthode</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            Total Période: ${totalPeriod.toFixed(2)} ${settings.currency}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  

  return {
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
  };
}
