import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  Trash2, 
  Tag, 
  TrendingDown,
  CalendarDays,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Info,
  Percent,
  History,
  FileDown,
  Edit2,
  RefreshCcw,
  Printer
} from 'lucide-react';
import { 
  format, 
  addDays, 
  isBefore, 
  isAfter, 
  startOfDay, 
  endOfDay, 
  parseISO, 
  isSameDay, 
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  subDays
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Product, Category } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ExpiryManagerProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onAdjustStock: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}


export function useExpiryManagerLogic(props: ExpiryManagerProps) {
  const { products, categories, onUpdateProduct, onAdjustStock, onEditProduct } = props;
const [view, setView] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const now = startOfDay(new Date());

  const parseSafeDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return now;
    try {
      const cleaned = dateStr.trim();
      if (!cleaned) return now;
      const parsed = parseISO(cleaned);
      if (!isNaN(parsed.getTime())) {
        return startOfDay(parsed);
      }
      const nativeDate = new Date(cleaned);
      if (!isNaN(nativeDate.getTime())) {
        return startOfDay(nativeDate);
      }
    } catch (e) {
      console.warn("Date parsing failed:", dateStr, e);
    }
    return now;
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU/Code-barre',
      'Produit',
      'Date de peremption',
      'No de Lot / Batch',
      'Jours restants',
      'Statut',
      'Stock',
      'Unite',
      'Prix de Vente (CFA)',
      'Prix d Purchase (CFA)',
      'Valeur de Vente a risque (CFA)',
      'Cout d Purchase a risque (CFA)'
    ];

    const rows = analyzedProducts.map(p => [
      p.sku || '',
      p.name,
      p.expirationDate ? format(p.expiryDate, 'yyyy-MM-dd') : '',
      p.batchNumber || '',
      p.daysLeft,
      p.expiryStatus === 'expired' ? 'Expire' : p.expiryStatus === 'critical' ? 'Critique' : p.expiryStatus === 'warning' ? 'A surveiller' : 'Normal',
      p.stock,
      p.unit || '',
      p.price,
      p.costPrice || 0,
      p.stock * p.price,
      p.stock * (p.costPrice || 0)
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_peremption_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport d'expiration CSV exporté !");
  };

  const handlePrintPDF = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    if (!doc) return;
    
    const iframeDoc = (doc as any).document || doc;

    const itemsHtml = analyzedProducts.map(p => {
      const valueAtRisk = p.stock * p.price;
      const statusLabel = p.expiryStatus === 'expired' ? 'EXPIRÉ' : p.expiryStatus === 'critical' ? 'CRITIQUE (<7j)' : 'ATTENTION (<30j)';
      const statusColor = p.expiryStatus === 'expired' ? '#e11d48' : p.expiryStatus === 'critical' ? '#d97706' : '#2563eb';
      
      return `
        <tr style="border-bottom: 1px solid #efefef;">
          <td style="padding: 10px 8px; font-size: 11px;">
            <span style="font-weight: bold; color: #111;">${p.name}</span>
            <div style="font-size: 9px; color: #888; font-family: monospace;">SKU: ${p.sku || '---'}</div>
          </td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-family: monospace;">${p.batchNumber || '---'}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-weight: bold; color: ${statusColor};">${p.expirationDate ? format(p.expiryDate, 'dd/MM/yyyy') : '---'}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-weight: bold; color: ${p.daysLeft < 0 ? '#e11d48' : '#333'}">${p.daysLeft < 0 ? 'Expiré' : `${p.daysLeft}j`}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: center;">${p.stock} ${p.unit}</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: right; font-family: monospace;">${p.price.toLocaleString()} CFA</td>
          <td style="padding: 10px 8px; font-size: 11px; text-align: right; font-weight: bold; font-family: monospace;">${valueAtRisk.toLocaleString()} CFA</td>
        </tr>
      `;
    }).join('');

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Rapport de Péremption</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              background: white;
              padding: 0;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 20px; align-items: flex-end;">
               <div>
                  <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; color: #111; font-weight: 900; letter-spacing: 1px;">RAPPORT DE PÉREMPTION</h1>
                  <p style="margin: 4px 0 0 0; color: #666; font-size: 10px; letter-spacing: 0.5px; font-weight: bold;">Édité le ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
               </div>
               <div style="text-align: right;">
                  <div style="font-weight: 900; font-size: 15px; text-transform: uppercase; color: #111;">NEXUS POS PRO</div>
                  <div style="font-size: 10px; color: #555; margin-top: 2px;">Rapport de Suivi des Dates Limites</div>
               </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px;">
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">PRODUITS EXPIRÉS</div>
                <div style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 3px;">${stats.expiredCount}</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">CRITIQUES (7j)</div>
                <div style="font-size: 18px; font-weight: 900; color: #d97706; margin-top: 3px;">${stats.criticalCount}</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">PV À RISQUE</div>
                <div style="font-size: 16px; font-weight: 900; color: #111; margin-top: 3px;">${stats.valueAtRisk.toLocaleString()} CFA</div>
              </div>
              <div style="background-color: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 8px; font-weight: 850; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">COÛT À RISQUE</div>
                <div style="font-size: 16px; font-weight: 900; color: #111; margin-top: 3px;">${stats.costAtRisk.toLocaleString()} CFA</div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
               <thead>
                  <tr style="background-color: #111; color: white;">
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: left; font-weight: 900; letter-spacing: 0.5px; width: 33%;">Article</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 12%;">N° de Lot</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 15%;">DLC / DLUO</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Jours restants</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Stock</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Prix Unitaire</th>
                     <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; text-align: right; font-weight: 900; letter-spacing: 0.5px; width: 10%;">Valeur total</th>
                  </tr>
               </thead>
               <tbody>
                  ${itemsHtml}
               </tbody>
            </table>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
               <div style="font-size: 9px; color: #aaa;">Nexus POS Pro - Système de traçabilité des péremptions</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              try {
                window.focus();
                window.print();
              } catch (e) {
                console.error("Print failed:", e);
              }
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 15000);
  };

  // Logic for analyzing expiry
  const analyzedProducts = useMemo(() => {
    const flatList: any[] = [];
    products.forEach(p => {
      if (p.useMultiExpiry && p.batches && p.batches.length > 0) {
        p.batches.forEach(batch => {
          flatList.push({
            ...p,
            id: `${p.id}-batch-${batch.id}`,
            originalId: p.id,
            isBatch: true,
            batchNumber: batch.batchNumber,
            expirationDate: batch.expirationDate || p.expirationDate,
            stock: batch.stock
          });
        });
      } else if (p.expirationDate) {
        flatList.push({
          ...p,
          originalId: p.id,
          isBatch: false
        });
      }
    });

    return flatList
      .map(p => {
        const expiryDate = parseSafeDate(p.expirationDate);
        const daysLeft = differenceInDays(expiryDate, now);
        
        let expiryStatus: 'expired' | 'critical' | 'warning' | 'safe' = 'safe';
        if (daysLeft < 0) expiryStatus = 'expired';
        else if (daysLeft <= 7) expiryStatus = 'critical';
        else if (daysLeft <= 30) expiryStatus = 'warning';

        return { ...p, daysLeft, expiryStatus, expiryDate };
      })
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                             p.sku?.toLowerCase().includes(search.toLowerCase()) ||
                             (p.batchNumber || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
        const matchesStatus = filterStatus === 'all' || p.expiryStatus === filterStatus;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, search, selectedCategory, filterStatus, now]);

  const stats = useMemo(() => {
    const expiredCount = analyzedProducts.filter(p => p.expiryStatus === 'expired').length;
    const criticalCount = analyzedProducts.filter(p => p.expiryStatus === 'critical').length;
    const valueAtRisk = analyzedProducts
      .filter(p => p.expiryStatus !== 'safe')
      .reduce((sum, p) => sum + (Number(p.price) * Number(p.stock)), 0);
    
    const costAtRisk = analyzedProducts
      .filter(p => p.expiryStatus !== 'safe')
      .reduce((sum, p) => sum + (Number(p.costPrice || 0) * Number(p.stock)), 0);
    
    return { expiredCount, criticalCount, valueAtRisk, costAtRisk };
  }, [analyzedProducts]);

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleApplyPromo = async (product: any, percent: number) => {
    const oldPrice = product.price;
    const targetId = product.originalId || product.id;
    try {
      const discount = percent / 100;
      const newPrice = Math.round(Number(product.price) * (1 - discount));
      
      // Store original price if not already stored
      const updates: any = { price: newPrice };
      if (!product.originalPrice) {
        updates.originalPrice = oldPrice;
      }
      
      await onUpdateProduct(targetId, updates);
      toast.success(`Promo -${percent}% appliquée sur ${product.name}`, {
        action: {
          label: "Annuler",
          onClick: () => onUpdateProduct(targetId, { price: oldPrice, originalPrice: undefined })
        }
      });
    } catch (err) {
      toast.error("Erreur lors de l'application de la promo");
    }
  };

  const handleRestorePrice = async (product: any) => {
    const targetId = product.originalId || product.id;
    try {
      if (product.originalPrice) {
        await onUpdateProduct(targetId, { price: product.originalPrice, originalPrice: undefined });
        toast.success("Prix original restauré");
      } else if (product.costPrice) {
        const restoredPrice = Math.round(Number(product.costPrice) * 1.3); // 30% margin default
        await onUpdateProduct(targetId, { price: restoredPrice });
        toast.success("Prix restauré (Marge 30%)");
      } else {
        toast.error("Prix d'origine inconnu. Veuillez éditer manuellement.");
        const origProduct = product.originalId ? products.find(p => p.id === product.originalId) : product;
        if (origProduct) onEditProduct(origProduct);
      }
    } catch (err) {
      toast.error("Erreur lors de la restauration du prix");
    }
  };

  const handleBatchDiscount = async (status: 'expired' | 'critical') => {
    // We want to target ALL products of this status, regardless of search/filter
    const allAnalyzed = products
      .filter(p => p.expirationDate)
      .map(p => {
        const expiryDate = parseSafeDate(p.expirationDate);
        const daysLeft = differenceInDays(expiryDate, now);
        
        let expiryStatus: 'expired' | 'critical' | 'warning' | 'safe' = 'safe';
        if (daysLeft < 0) expiryStatus = 'expired';
        else if (daysLeft <= 7) expiryStatus = 'critical';
        else if (daysLeft <= 30) expiryStatus = 'warning';

        return { ...p, daysLeft, expiryStatus };
      });

    const targets = allAnalyzed.filter(p => p.expiryStatus === status && p.stock > 0);
    
    if (targets.length === 0) {
      toast.info("Aucun produit en stock à traiter pour ce statut");
      return;
    }

    const discount = status === 'expired' ? 50 : 20;
    toast.promise(
      Promise.all(targets.map(p => {
        const newPrice = Math.round(Number(p.price) * (1 - discount/100));
        return onUpdateProduct(p.id, { price: newPrice });
      })),
      {
        loading: `Application des promos (-${discount}%)...`,
        success: `${targets.length} produits mis en promo !`,
        error: "Échec du traitement par lots"
      }
    );
  };

  

  return {
    view,
    setView,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    filterStatus,
    setFilterStatus,
    currentMonth,
    setCurrentMonth,
    filteredProducts: analyzedProducts,
    calendarDays,
    getBatchesByDate: () => [], // Kept for backwards compatibility if needed
    stats,
    handleExportCSV,
    handlePrintPDF,
    handleBatchDiscount,
    analyzedProducts,
    handleApplyPromo,
    handleRestorePrice,
    now
  };
}
