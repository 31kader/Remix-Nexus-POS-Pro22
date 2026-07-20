import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef, useDeferredValue } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight, LogOut, Bell, TrendingUp, History, EyeOff, LogIn, Store, Gift, Wallet, Edit2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { auth } from '../services/AuthService';
import { supabase } from '../supabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions, Promotion, Voucher, PurchaseOrder, POSSession } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, formatProductStock, calculateItemPrice, mapDoc } from '../lib/utils';
import { printReceipt, printPurchaseOrder } from '../services/printService';
import { format } from 'date-fns';
import { DeliveryOrderCard } from './delivery/DeliveryOrderCard';
import { fr } from 'date-fns/locale';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

import { BarcodeScanner } from './BarcodeScanner';
import { Categories } from './Categories';
import { Brands } from './Brands';


import { useDeliveryActions } from '../hooks/useDeliveryActions';

export function DeliveryDashboard({ user, profile, onLogout, settings, onlineOrders, customers }: any) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const isPicker = profile?.role === 'picker';
  const roleName = isPicker ? 'Ramasseur' : 'Livreur';

  // Filter orders assigned to this person or available to them
  const myOrders = onlineOrders.filter((o: any) => {
    // Pickers look for assigned orders (to prepare them) or confirmed ones if admin-testing
    if (isPicker) {
      return (o.assignedPickerId === profile?.employeeId) || 
             (profile?.role === 'admin' && (o.status === 'confirmed' || o.status === 'processing'));
    }
    
    // Delivery people look for shipped orders assigned to them
    return o.deliveryMethod === 'delivery' && 
           (o.assignedEmployeeId === profile?.employeeId || (profile?.role === 'admin' && o.status === 'shipped'));
  });

  const pendingStatuses = isPicker ? ['pending', 'confirmed', 'processing'] : ['shipped', 'confirmed'];
  const pendingOrders = myOrders.filter((o: any) => pendingStatuses.includes(o.status));
  const pastOrders = myOrders.filter((o: any) => o.status === 'delivered');

  const { isProcessing, handleUpdateStatus } = useDeliveryActions({
    user,
    profile,
    settings,
    customers,
    pendingOrders
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile-friendly Header */}
      <div className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            {isPicker ? <Package size={20} /> : <Truck size={20} />}
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Portail {roleName}</h1>
            <p className="text-indigo-200 text-[10px] uppercase font-bold">{profile?.displayName || user.email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <h3 className="text-3xl font-black text-indigo-600">{pendingOrders.length}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase">À Livrer</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <h3 className="text-3xl font-black text-emerald-600">{pastOrders.length}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase">Livrées</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 bg-slate-200 rounded-xl">
          <button 
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              activeTab === 'pending' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            )}
          >
            Missions ({pendingOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              activeTab === 'history' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            )}
          >
            Terminées
          </button>
        </div>

        {/* Order List */}
        <div className="space-y-4">
          {(activeTab === 'pending' ? pendingOrders : pastOrders).map((order: any) => (
            <DeliveryOrderCard
              key={order.id}
              order={order}
              activeTab={activeTab}
              isPicker={isPicker}
              isProcessing={isProcessing}
              settings={settings}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}

          {(activeTab === 'pending' ? pendingOrders : pastOrders).length === 0 && (
            <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-2xl">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-bold text-slate-600">Aucune commande {activeTab === 'pending' ? 'en attente' : 'terminée'}</p>
              <p className="text-sm text-slate-400 mt-1">Vous êtes à jour !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
