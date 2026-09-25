import React from 'react';
import { Banknote, RefreshCw } from 'lucide-react';
import { Card } from '../ui';
import { cn } from '../../lib/utils';
import { Transaction, Product, Employee, ProductReturn, CompanySettings, Category, Customer } from '../../types';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useProfitsReportLogic } from './profits/useProfitsReportLogic';
import { ProfitsReportFilters } from './profits/ProfitsReportFilters';
import { ProfitsReportTable } from './profits/ProfitsReportTable';

interface ProfitsReportProps {
  transactions: Transaction[];
  products: Product[];
  employees: Employee[];
  returns: ProductReturn[];
  settings: CompanySettings;
  categories: Category[];
  customers: Customer[];
  onEditProduct?: (product: Product) => void;
}

export const ProfitsReport = React.memo(function ProfitsReport({
  transactions,
  products,
  employees,
  returns,
  settings,
  categories,
  customers,
  onEditProduct
}: ProfitsReportProps) {
  const {
    profitFilterDate,
    setProfitFilterDate,
    profitFilterCategory,
    setProfitFilterCategory,
    profitSortFormat,
    setProfitSortFormat,
    profitFilterCustomer,
    setProfitFilterCustomer,
    profitFilterEmployee,
    setProfitFilterEmployee,
    profitSearchProduct,
    setProfitSearchProduct,
    profitFilterSource,
    setProfitFilterSource,
    profitFilterTimeStart,
    setProfitFilterTimeStart,
    profitFilterTimeEnd,
    setProfitFilterTimeEnd,
    profitFilterMinTotal,
    setProfitFilterMinTotal,
    profitFilterMaxTotal,
    setProfitFilterMaxTotal,
    productProfitData,
    handleProfitSort,
    totals,
    isRecalculating,
    handleRecalculateProfits
  } = useProfitsReportLogic({
    transactions,
    products,
    employees,
    returns,
    settings,
    categories,
    customers,
  });

  return (
    <Card id="card-profits-report" className="overflow-hidden border-white/10 bg-white/5 animate-in fade-in duration-500">
      <div className="bg-white/5 p-4 border-b border-white/10">
        <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center mb-3">
          <h4 className="font-black text-white uppercase tracking-tighter flex items-center gap-2 text-sm">
            <Banknote size={18} className="text-indigo-400" />
            Analyse Financière & Bénéfices
          </h4>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculateProfits}
              disabled={isRecalculating}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
              title="Synchroniser et recalculer les prix d'achat et marges à partir du catalogue actuel"
            >
              <RefreshCw size={14} className={cn(isRecalculating && "animate-spin")} />
              <span>{isRecalculating ? "Recalcul en cours..." : "Recalculer les Bénéfices"}</span>
            </button>

            <span className="text-[9px] font-black uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-slate-400 tracking-wider">
              Rapport Dynamique Temps Réel
            </span>
          </div>
        </div>
        
        <ProfitsReportFilters 
          profitFilterDate={profitFilterDate}
          setProfitFilterDate={setProfitFilterDate}
          profitFilterTimeStart={profitFilterTimeStart}
          setProfitFilterTimeStart={setProfitFilterTimeStart}
          profitFilterTimeEnd={profitFilterTimeEnd}
          setProfitFilterTimeEnd={setProfitFilterTimeEnd}
          profitFilterMinTotal={profitFilterMinTotal}
          setProfitFilterMinTotal={setProfitFilterMinTotal}
          profitFilterMaxTotal={profitFilterMaxTotal}
          setProfitFilterMaxTotal={setProfitFilterMaxTotal}
          profitFilterSource={profitFilterSource}
          setProfitFilterSource={setProfitFilterSource}
          profitFilterCategory={profitFilterCategory}
          setProfitFilterCategory={setProfitFilterCategory}
          categories={categories}
          profitFilterCustomer={profitFilterCustomer}
          setProfitFilterCustomer={setProfitFilterCustomer}
          customers={customers}
          profitSearchProduct={profitSearchProduct}
          setProfitSearchProduct={setProfitSearchProduct}
        />
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border-b border-white/10">
        {/* Card 1: Gross Revenue */}
        <div className="bg-[#0c0d12]/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
            <Banknote size={48} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chiffre d'Affaires Brut</p>
          <p className="text-2xl font-black text-white mt-1.5 font-mono tracking-tight">{Number(totals.revenue || 0).toFixed(2)} <span className="text-[10px] text-slate-500">{settings.currency}</span></p>
          <div className="h-1 w-12 bg-indigo-500 rounded mt-3"></div>
        </div>

        {/* Card 2: Cost of Sales */}
        <div className="bg-[#0c0d12]/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coût Total des Ventes</p>
          <p className="text-2xl font-black text-white mt-1.5 font-mono tracking-tight">{Number(totals.cost || 0).toFixed(2)} <span className="text-[10px] text-slate-500">{settings.currency}</span></p>
          <div className="h-1 w-12 bg-amber-500 rounded mt-3"></div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-[#0c0d12]/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bénéfice Net</p>
          <p className={cn("text-2xl font-black mt-1.5 font-mono tracking-tight", (Number(totals.profit) || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {(Number(totals.profit) || 0) >= 0 ? '+' : ''}{Number(totals.profit || 0).toFixed(2)} <span className="text-[10px] text-slate-500">{settings.currency}</span>
          </p>
          <div className="h-1 w-12 bg-emerald-500 rounded mt-3"></div>
        </div>

        {/* Card 4: Average Margin */}
        <div className="bg-[#0c0d12]/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marge Moyenne Globale</p>
          <p className="text-2xl font-black text-white mt-1.5 font-mono tracking-tight">{Number(totals.margin || 0).toFixed(1)}%</p>
          <div className="h-1 w-12 bg-indigo-500/40 rounded mt-3"></div>
        </div>
      </div>
      
      <ProfitsReportTable 
        productProfitData={productProfitData}
        categories={categories}
        handleProfitSort={handleProfitSort}
        profitSortFormat={profitSortFormat}
        onEditProduct={onEditProduct}
        transactions={(transactions && transactions.length > 0) ? transactions : useTransactionStore.getState().transactions}
        settings={settings}
      />
    </Card>
  );
});
