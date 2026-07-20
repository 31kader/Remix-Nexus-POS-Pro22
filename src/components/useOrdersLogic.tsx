import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, mapDoc } from '../lib/utils';
import { printReceipt } from '../services/printService';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { useTranslation } from '../translations';
import { motion, AnimatePresence } from 'motion/react';

import { StockAdjustmentModal } from './StockAdjustmentModal';
import { DuplicateSKUModal } from './DuplicateSKUModal';
import { ImportModal } from './ImportModal';
import { ProductFormModal } from './ProductFormModal';
import { useOrderActions } from '../hooks/useOrderActions';
import { LabelPrinter } from './LabelPrinter';
import { SupplierSyncManager } from './SupplierSyncManager';
import { StockHistory } from './StockHistory';
import { BarcodeScanner } from './BarcodeScanner';
import { ManualQRCodeGenerator } from './ManualQRCodeGenerator';



 // TODO: fix missing imports 

export interface OrdersProps {
  orders: any[]; products: any[]; categories?: any[];
  transactions?: any[]; settings: any; stockAdjustments?: any[];
  customers: any[]; user: any; employees?: Employee[]; profile?: any;
  syncOrder?: any; autoSync?: any; setAutoSync?: any;
}

export function useOrdersLogic(props: OrdersProps) {
  const { orders = [], products = [], categories = [], transactions = [], settings = {}, stockAdjustments = [], customers = [], user = null, employees = [], profile = {}, syncOrder = () => {} } = props;

  const { t } = useTranslation();
  
  // Useful debug logging for the customer
  useEffect(() => {
    console.log("=== COMPOSANT ORDERS - DIAGNOSTICS LOGS ===");
    console.log("Total orders reçues dans le composant POS:", orders.length, orders);
  }, [orders]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const resolveCustomerInfo = (order: OnlineOrder) => {
    if (!order) return { name: 'Client Inconnu', phone: '' };
    const customer = order.customerId ? customers.find(c => c.id === order.customerId) : null;
    return { 
      name: order.customerName || customer?.name || 'Client Inconnu',
      phone: order.customerPhone || customer?.phone || ''
    };
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o || !o.id) return false;
      const oStatus = o.status || 'pending';
      const oDelivery = o.deliveryMethod || 'delivery';
      const matchesStatus = statusFilter === 'all' || String(oStatus).toLowerCase() === statusFilter.toLowerCase();
      const matchesDelivery = deliveryFilter === 'all' || String(oDelivery).toLowerCase() === deliveryFilter.toLowerCase();
      return matchesStatus && matchesDelivery;
    });
  }, [orders, statusFilter, deliveryFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-indigo-100 text-indigo-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const { updateOrderPaymentStatus, updateOrderStatus, assignOrderToEmployee, assignPickerToOrder } = useOrderActions({ orders, customers, employees, profile, user, settings });

  // Prevent multiple assignment calls for the same order
  const assigningOrders = useRef<Set<string>>(new Set());

  // Auto-assignment logic (Round-Robin)
  useEffect(() => {
    const unassignedOrders = orders.filter(o => 1 
      && o.status === 'pending' 
      && !o.assignedPickerId 
      && !assigningOrders.current.has(o.id)
    );
    
    if (unassignedOrders.length > 0) {
      const pickers = employees.filter(e => e.role === 'picker');
      if (pickers.length > 0) {
        unassignedOrders.forEach((order, index) => {
          assigningOrders.current.add(order.id);
          // simple distribution: use order index or timestamp to distribute
          const pickerIndex = (orders.filter(o => o.assignedPickerId).length + index) % pickers.length;
          const targetPicker = pickers[pickerIndex];
          assignPickerToOrder(order, targetPicker.id).finally(() => {
             // We keep it in assigningOrders for a bit to allow sync to catch up
             setTimeout(() => assigningOrders.current.delete(order.id), 5000);
          });
        });
      }
    }
  }, [orders, employees, assignPickerToOrder]);
  const updateDeliveryMethod = async (order: OnlineOrder, newMethod: 'delivery' | 'pickup') => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ delivery_method: newMethod })
        .eq('id', order.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating delivery method:', error);
      toast.error('Erreur lors de la mise à jour de la méthode de livraison.');
    }
  };

  const saveOrderItems = async (order: OnlineOrder, newItems: OnlineOrder['items']) => {
    try {
      const oldItems = order.items;
      
      // Calculate stock changes
      const stockChanges: { [productId: string]: number } = {};
      
      // Add back old items
      for (const item of oldItems) {
        stockChanges[item.productId] = (stockChanges[item.productId] || 0) + item.quantity;
      }
      
      // Remove new items
      for (const item of newItems) {
        stockChanges[item.productId] = (stockChanges[item.productId] || 0) - item.quantity;
      }
      
      // Update stocks
      for (const [productId, change] of Object.entries(stockChanges)) {
        if (change === 0 || !productId || productId === 'undefined') continue;
        const product = products.find(p => p.id === productId);
        if (product) {
          enqueueStockAdjustment(productId, change as number);
          localDb.update(`products/${productId}`, { updatedAt: new Date().toISOString() });
        }
      }
      
      // Update order
      const newTotal = newItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
      const { error: orderError } = await supabase
        .from('online_orders')
        .update({ 
            items: newItems,
            total: newTotal
        })
        .eq('id', order.id);
        
      if (orderError) throw orderError;
      
      setIsEditingItems(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error('Error saving order items:', error);
      toast.error('Erreur lors de la sauvegarde des articles.');
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const order = orders.find(o => o.id === orderToDelete);
    if (order && isLocked(order.timestamp, settings.lockingPeriodDays || 0)) {
      alert("Cette commande est verrouillée par la période de clôture et ne peut pas être supprimée.");
      setOrderToDelete(null);
      return;
    }
    try {
      const { error } = await supabase
        .from('online_orders')
        .delete()
        .eq('id', orderToDelete);
      if (error) throw error;
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Erreur lors de la suppression de la commande.');
    }
  };

  const handleManualSync = async (order: OnlineOrder) => {
    setIsSyncing(order.id);
    await syncOrder(order);
    setIsSyncing(null);
  };

  const handleYassirRequest = async (order: OnlineOrder) => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ 
            assigned_employee_id: 'YASSIR_EXT',
            assigned_employee_name: 'Yassir Express'
        })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(t("Commande assignée à Yassir Express. Veuillez finaliser la demande sur votre application Yassir."));
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handlePrintOrder = (order: OnlineOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px 0;">${item.name} x${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right;">${(item.price || 0).toFixed(2)} {settings.currency}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Commande #${order.externalOrderId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-width: 100px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
            .qr-container { margin-top: 20px; display: flex; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
            <h2>${settings.name}</h2>
            <p>COMMANDE EN LIGNE</p>
            <p>#${order.externalOrderId}</p>
            <p>Source: ${order.source}</p>
            <p>Type: ${order.deliveryMethod === 'delivery' ? 'LIVRAISON' : 'RETRAIT EN MAGASIN'}</p>
            <p>${format(new Date(order.timestamp), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div class="divider"></div>
          <div style="font-size: 0.9em; margin-bottom: 10px;">
            <p><strong>Client:</strong> ${order.customerName}</p>
            <p><strong>Tél:</strong> ${order.customerPhone}</p>
            <p><strong>Adresse:</strong> ${order.shippingAddress || 'N/A'}</p>
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between;" class="total">
            <span>TOTAL</span>
            <span>${(order.total || 0).toFixed(2)} {settings.currency}</span>
          </div>
          <div class="qr-container" id="qr"></div>
          <div class="footer">
            <p>${settings.footerText || 'Merci de votre commande !'}</p>
          </div>
          <script src="https://unpkg.com/qrcode-generator@1.4.4/qrcode.js"></script>
          <script>
            window.onload = () => {
              const qr = qrcode(0, 'M');
              qr.addData('${order.id}');
              qr.make();
              document.getElementById('qr').innerHTML = qr.createSvgTag(3, 0);
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
    selectedOrderId,
    setSelectedOrderId,
    orderToDelete,
    setOrderToDelete,
    isEditingItems,
    setIsEditingItems,
    isSyncing,
    setIsSyncing,
    statusFilter,
    setStatusFilter,
    deliveryFilter,
    setDeliveryFilter,
    enlargedImage,
    setEnlargedImage,
    t,
    updateOrderStatus,
    getStatusColor,
    selectedOrder,
    filteredOrders,
    handleYassirRequest,
    handlePrintOrder,
    handleManualSync,
    assignPickerToOrder,
    assignOrderToEmployee,
    updateOrderPaymentStatus,
    resolveCustomerInfo,
    saveOrderItems,
    confirmDeleteOrder
  };
}