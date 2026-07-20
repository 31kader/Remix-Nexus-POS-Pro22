import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Package, Tag, RefreshCw, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Truck, ArrowUpDown, Award, Calendar, FolderTree, AlertCircle, TrendingDown, ShieldCheck, RotateCcw, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, ArrowRight, CreditCard, Banknote, Minus, UserPlus, ChevronDown, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { sqlMigrationTables } from './supabaseDiagnosticQueries';
import { toast } from 'sonner';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, formatSafe, exportToCSV, generateUniqueId, isLocked, mapDoc } from '../lib/utils';
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
export function Returns({ returns = [], settings, products = [] }: { returns: ProductReturn[], settings: CompanySettings, products?: Product[] }) {
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [showMigrationHelp, setShowMigrationHelp] = useState(true);
  const [copied, setCopied] = useState(false);

  const safeReturns = returns || [];

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlMigrationTables);
    setCopied(true);
    toast.success("Script SQL de migration copié dans votre presse-papiers !");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">Gestion des Retours</h3>
          <p className="text-sm text-industrial-500">{safeReturns.length} RETOURS ENREGISTRÉS</p>
        </div>
      </div>

      <Card className="p-0 industrial-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-industrial-950 border-b border-industrial-800">
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Transaction</th>
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Type</th>
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Raison</th>
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Remboursement</th>
                <th className="p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800">
              {safeReturns.map((r: any) => {
                const dateVal = r.timestamp || r.date || r.created_at || r.updated_at;
                const refundVal = typeof r.totalRefund === 'number' 
                  ? r.totalRefund 
                  : (typeof r.refundAmount === 'number' 
                      ? r.refundAmount 
                      : (parseFloat(r.refundAmount || r.totalRefund || r.refund_amount || r.total_refund || '0') || 0));
                const returnTypeMapped = r.type || 'refund';

                return (
                  <tr key={r.id} className="hover:bg-industrial-800/30 transition-colors">
                    <td className="p-4 text-xs font-mono text-industrial-400">
                      {dateVal ? formatSafe(dateVal, 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td className="p-4 text-xs font-mono text-indigo-400">
                      #{r.transactionId ? r.transactionId?.slice(-8).toUpperCase() : (r.transaction_id ? r.transaction_id?.slice(-8).toUpperCase() : 'INCONNU')}
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
                    <td className="p-4 text-xs text-industrial-400 italic font-mono">
                      "{r.reason || r.notes || 'Aucune raison indiquée'}"
                    </td>
                    <td className="p-4 font-black text-white font-mono">{refundVal.toFixed(2)} {settings?.currency || ''}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedReturn(r)}
                        className="p-2 text-industrial-500 hover:text-indigo-400 hover:bg-industrial-800 rounded-xl transition-all"
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {safeReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-industrial-600 font-mono italic">AUCUN RETOUR ENREGISTRÉ</td>
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
          lineId: returnRecord.id || 'unknown',
          productId: pId || 'unknown',
          name: matchedProduct ? matchedProduct.name : ('Produit #' + pId),
          quantity: returnRecord.quantity || 1,
          price: refundVal
        }];
      })() : []);

  const transactionIdString = returnRecord.transactionId || returnRecord.transaction_id || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DÉTAILS DU RETOUR">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 bg-industrial-800/50 p-6 rounded-2xl border border-industrial-800">
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-1">ID Transaction</p>
            <p className="text-sm font-mono text-indigo-400">#{transactionIdString ? transactionIdString.toUpperCase() : 'INCONNU'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-1">Date du Retour</p>
            <p className="text-sm text-white font-mono">{dateVal ? formatSafe(dateVal, 'dd/MM/yyyy HH:mm') : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-1">Type</p>
            <p className="text-sm font-black text-white uppercase tracking-tight">
              {returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-1">Montant Total</p>
            <p className="text-sm font-black text-emerald-400 font-mono">{refundVal.toFixed(2)} {settings?.currency || ''}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-2">Raison du retour</p>
          <p className="text-sm text-industrial-400 italic bg-industrial-900 border border-industrial-800 p-4 rounded-xl font-mono">
            "{returnRecord.reason || returnRecord.notes || 'Aucune raison indiquée'}"
          </p>
        </div>

        {items.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-3">Articles retournés</p>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => {
                const itemPrice = typeof item.price === 'number' ? item.price : 0;
                const itemQty = typeof item.quantity === 'number' ? item.quantity : 1;
                return (
                  <div key={`return-record-item-${idx}`} className="flex items-center justify-between p-4 bg-industrial-900 border border-industrial-800 rounded-xl">
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{item.name || 'Produit inconnu'}</p>
                      <p className="text-xs text-industrial-500 font-mono">{itemPrice.toFixed(2)} {settings?.currency || ''} / UNITE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white font-mono">x{itemQty}</p>
                      <p className="text-xs font-black text-indigo-400 font-mono">{(itemPrice * itemQty).toFixed(2)} {settings?.currency || ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-4 space-y-2">
          <Button onClick={() => printReceipt(returnRecord, settings)} className="w-full industrial-button-secondary flex items-center justify-center gap-2">
            <Printer size={16} /> Imprimer le reçu
          </Button>
          <Button onClick={onClose} className="w-full industrial-button-primary">Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}
