import React, { useState, memo, lazy, Suspense, useMemo } from 'react';
import { 
  Download, 
  BarChart3,
  TrendingUp,
  Layers,
  Award,
  Wallet,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn, formatSafe } from '../lib/utils';

// Lazy loading des sous-rapports pour alléger le bundle initial (Règle GEMINI.md)
const AccountingChartsReport = lazy(() => import('./reports/AccountingChartsReport').then(m => ({ default: m.AccountingChartsReport })));
const ProfitsReport = lazy(() => import('./reports/ProfitsReport').then(m => ({ default: m.ProfitsReport })));
const FidelityStatsReport = lazy(() => import('./reports/FidelityStatsReport').then(m => ({ default: m.FidelityStatsReport })));
const CashflowReport = lazy(() => import('./reports/CashflowReport').then(m => ({ default: m.CashflowReport })));
const StockValueReport = lazy(() => import('./reports/StockValueReport').then(m => ({ default: m.StockValueReport })));
const LossesReport = lazy(() => import('./reports/LossesReport').then(m => ({ default: m.LossesReport })));
const GroupedSalesAndBasketsReport = lazy(() => import('./reports/GroupedSalesAndBasketsReport').then(m => ({ default: m.GroupedSalesAndBasketsReport })));

const reportFallback = (
  <div className="flex flex-col items-center justify-center min-h-[350px] p-5 space-y-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-semibold text-zinc-400">
      Chargement du rapport…
    </p>
  </div>
);

import { Transaction, Product, Employee, Expense, SupplierPayment, ProductReturn, CompanySettings, Category, Customer, StockAdjustment } from '../types';

interface DetailedReportsProps {
  transactions: Transaction[];
  products: Product[];
  employees: Employee[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  returns: ProductReturn[];
  settings: CompanySettings;
  categories: Category[];
  customers: Customer[];
  stockAdjustments: StockAdjustment[];
  setEditingProduct?: (product: Product | null) => void;
  setIsProductModalOpen?: (open: boolean) => void;
}

export const DetailedReports = memo(function DetailedReports({ 
  transactions, 
  products, 
  employees, 
  expenses, 
  supplierPayments, 
  returns, 
  settings, 
  categories, 
  customers,
  stockAdjustments,
  setEditingProduct,
  setIsProductModalOpen
}: DetailedReportsProps) {
  const [reportsTab, setReportsTab] = useState<'charts' | 'profits' | 'baskets' | 'fidelity_stats' | 'cashflow' | 'stock_value' | 'losses'>('charts');
  const [marketingFilterDate, setMarketingFilterDate] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'>('all');

  const exportAccountingCSV = () => {
    const headers = [
      'Date & Heure',
      'N° Ticket / Facture',
      'Mode de Règlement',
      'Total HT (DA)',
      'Taux TVA',
      'TVA 19% Collectée (DA)',
      'Total TTC (DA)',
      'Statut Transaction'
    ];
    const vatRate = Number(settings.taxRate || 19) / 100;
    const rows = transactions.map(t => {
      const totalTtc = t.total || 0;
      const totalHt = totalTtc / (1 + vatRate);
      const taxAmount = totalTtc - totalHt;
      const methodLabel = t.paymentMethod === 'cash' ? 'Espèces' : t.paymentMethod === 'card' ? 'Carte / TPE' : t.paymentMethod === 'balance' ? 'Crédit (Dette)' : (t.paymentMethod || 'Autre');
      return [
        `"${formatSafe(t.timestamp, 'yyyy-MM-dd HH:mm:ss')}"`,
        `"${t.id}"`,
        `"${methodLabel}"`,
        totalHt.toFixed(2),
        `"19%"`,
        taxAmount.toFixed(2),
        totalTtc.toFixed(2),
        `"${t.status || 'completed'}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Grand_Livre_Ventes_TVA_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Grand Livre des Ventes exporté avec succès (format Excel UTF-8) !");
  };

  const returnsByTx = useMemo(() => {
    const map = new Map<string, number>();
    (returns || []).forEach(r => {
      if (r?.transactionId) {
        map.set(r.transactionId, (map.get(r.transactionId) || 0) + (Number(r.totalRefund ?? r.refundAmount) || 0));
      }
    });
    return map;
  }, [returns]);

  const totalRevenue = useMemo(() => {
    return transactions.reduce((sum, t) => {
      if (t.status === 'returned' || t.status === 'cancelled') return sum;
      let amount = t.total || 0;
      if (t.status === 'partially_returned') {
        const refunded = returnsByTx.get(t.id) ?? Number(t.amountReturned) ?? 0;
        amount = Math.max(0, amount - refunded);
      }
      return sum + amount;
    }, 0);
  }, [transactions, returnsByTx]);

  const reportTabs = [
    { id: 'charts', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'profits', label: "Bénéfices & Marges", icon: TrendingUp },
    { id: 'baskets', label: "Paniers & Groupés", icon: Layers, highlight: true },
    { id: 'cashflow', label: "Trésorerie & Flux", icon: Wallet },
    { id: 'fidelity_stats', label: "Fidélité Clients", icon: Award },
    { id: 'stock_value', label: "Valeur Stock", icon: Boxes },
    { id: 'losses', label: "Pertes & Rebuts", icon: AlertTriangle, danger: true }
  ];

  return (
    <div className="space-y-6 text-zinc-100 p-1 md:p-3 animate-in fade-in duration-300">
      {/* Header moderne, sobre et épuré */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-indigo-400" size={24} />
            Rapports & Statistiques
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Analyse financière en temps réel, rentabilité par panier et flux de trésorerie.
          </p>
        </div>

        <button
          onClick={exportAccountingCSV}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-sm"
          title="Exporter l'historique comptable au format CSV"
        >
          <Download size={15} className="text-indigo-400" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Barre d'onglets compacte, sobre et ultra-fluide */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = reportsTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportsTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? tab.danger
                    ? "bg-rose-600 text-white shadow-sm"
                    : tab.highlight
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <Icon size={14} className={isActive ? "text-white" : tab.danger ? "text-rose-400" : tab.highlight ? "text-indigo-400" : "text-zinc-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu du rapport actif */}
      <Suspense fallback={reportFallback}>
        {reportsTab === 'charts' ? (
          <AccountingChartsReport 
            transactions={transactions}
            products={products}
            expenses={expenses}
            settings={settings}
          />
        ) : reportsTab === 'profits' ? (
          <ProfitsReport 
            transactions={transactions}
            products={products}
            employees={employees}
            returns={returns}
            settings={settings}
            categories={categories}
            customers={customers}
            onEditProduct={(product) => {
              if (setEditingProduct && setIsProductModalOpen) {
                setEditingProduct(product);
                setIsProductModalOpen(true);
              }
            }}
          />
        ) : reportsTab === 'baskets' ? (
          <GroupedSalesAndBasketsReport 
            transactions={transactions}
            products={products}
            categories={categories}
            settings={settings}
            employees={employees}
          />
        ) : reportsTab === 'fidelity_stats' ? (
          <FidelityStatsReport 
            transactions={transactions}
            customers={customers}
            settings={settings}
            marketingFilterDate={marketingFilterDate}
            setMarketingFilterDate={setMarketingFilterDate}
          />
        ) : reportsTab === 'cashflow' ? (
          <CashflowReport 
            transactions={transactions}
            expenses={expenses}
            supplierPayments={supplierPayments}
            returns={returns}
            settings={settings}
          />
        ) : reportsTab === 'stock_value' ? (
          <StockValueReport 
            products={products}
            categories={categories}
            settings={settings}
            onEditProduct={(product) => {
              if (setEditingProduct && setIsProductModalOpen) {
                setEditingProduct(product);
                setIsProductModalOpen(true);
              }
            }}
          />
        ) : (
          <LossesReport 
            stockAdjustments={stockAdjustments}
            products={products}
            categories={categories}
            settings={settings}
            totalRevenue={totalRevenue}
          />
        )}
      </Suspense>
    </div>
  );
});

