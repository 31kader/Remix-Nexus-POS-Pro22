import React, { useState, memo } from 'react';
import { 
  Download, 
  Trash2,
  Brain,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatSafe } from '../lib/utils';
import { Button } from './ui';
import { AIAssistant } from './AIAssistant';
import { AccountingChartsReport } from './reports/AccountingChartsReport';
import { ProfitsReport } from './reports/ProfitsReport';
import { FidelityStatsReport } from './reports/FidelityStatsReport';
import { CashflowReport } from './reports/CashflowReport';
import { StockValueReport } from './reports/StockValueReport';
import { LossesReport } from './reports/LossesReport';
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
  stockAdjustments
}: DetailedReportsProps) {
  const [reportsTab, setReportsTab] = useState<'charts' | 'profits' | 'cashflow' | 'fidelity_stats' | 'stock_value' | 'ai_assistant' | 'losses'>('charts');
  const [marketingFilterDate, setMarketingFilterDate] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');

  const exportAccountingCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Total', 'Tax', 'Payment Method', 'Status'];
    const rows = transactions.map(t => [
      formatSafe(t.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      t.id,
      t.total.toFixed(2),
      (t.total * (settings.taxRate / 100)).toFixed(2),
      t.paymentMethod || 'N/A',
      t.status || 'completed'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `accounting_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.status === 'returned' ? 0 : t.total), 0);

  return (
    <div className="space-y-12 text-slate-100 p-2 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="border-l-4 border-indigo-600 pl-8 space-y-2">
          <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">ANALYTICS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">OPERATIONS</span></h3>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Business Intelligence & Financial Metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-black/40 p-2 rounded-[2rem] border border-white/5 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl overflow-x-auto no-scrollbar">
            {[
              { id: 'charts', label: 'METRICS' },
              { id: 'profits', label: 'MARGINS' },
              { id: 'fidelity_stats', label: 'LOYALTY' },
              { id: 'cashflow', label: 'CASHFLOW' },
              { id: 'stock_value', label: 'ASSETS' },
              { id: 'losses', label: 'LOSSES', danger: true },
              { id: 'ai_assistant', label: 'AI_AGENT', accent: true }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setReportsTab(tab.id)}
                className={cn(
                  "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap active:scale-95 italic",
                  reportsTab === tab.id
                    ? tab.danger ? "bg-rose-600 text-white shadow-neon-rose border border-rose-400" : tab.accent ? "bg-indigo-600 text-white shadow-neon-indigo border border-indigo-400" : "bg-white/10 text-white shadow-2xl border border-white/20"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportAccountingCSV}
            className="group relative overflow-hidden flex items-center justify-center gap-4 px-10 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-[1.75rem] transition-all hover:shadow-neon-indigo active:scale-95 shadow-2xl border border-white/10 italic"
          >
            <div className="absolute inset-0 bg-indigo-600 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            <Download size={20} className="relative z-10 transition-colors group-hover:text-white" strokeWidth={3} />
            <span className="relative z-10 transition-colors group-hover:text-white">EXTRACT DATA</span>
          </button>
        </div>
      </div>

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
        />
      ) : reportsTab === 'fidelity_stats' ? (
        <FidelityStatsReport 
          transactions={transactions}
          settings={settings}
          marketingFilterDate={marketingFilterDate}
          setMarketingFilterDate={setMarketingFilterDate}
        />
      ) : reportsTab === 'cashflow' ? (
        <CashflowReport 
          transactions={transactions}
          expenses={expenses}
          supplierPayments={supplierPayments}
          settings={settings}
        />
      ) : reportsTab === 'stock_value' ? (
        <StockValueReport 
          products={products}
          categories={categories}
          settings={settings}
        />
      ) : reportsTab === 'losses' ? (
        <LossesReport 
          stockAdjustments={stockAdjustments}
          products={products}
          categories={categories}
          settings={settings}
          totalRevenue={totalRevenue}
        />
      ) : (
        <AIAssistant 
          products={products}
          transactions={transactions}
          expenses={expenses}
          settings={settings}
          stockAdjustments={stockAdjustments}
        />
      )}
    </div>
  );
});
