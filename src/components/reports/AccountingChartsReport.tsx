import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, LayoutGrid, Users, ShoppingBag } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { fr } from 'date-fns/locale';
import { formatSafe, calculateItemPrice } from '../../lib/utils';
import { Card } from '../ui';
import { Transaction, Product, Expense, CompanySettings } from '../../types';

interface AccountingChartsReportProps {
  transactions: Transaction[];
  products: Product[];
  expenses: Expense[];
  settings: CompanySettings;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AccountingChartsReport = React.memo(function AccountingChartsReport({
  transactions,
  products,
  expenses,
  settings,
}: AccountingChartsReportProps) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    const employeeMap: Record<string, number> = {};
    const periodMap: Record<string, number> = {};
    const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};

    transactions.forEach(t => {
      if (t.status === 'returned') return;
      
      t.items.forEach(item => {
        const cat = item.categoryId || 'Non classé';
        categoryMap[cat] = (categoryMap[cat] || 0) + (calculateItemPrice(item, t.isWholesale) * item.quantity);
        
        const prodId = item.id;
        if (!productMap[prodId]) {
          productMap[prodId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productMap[prodId].quantity += item.quantity;
        productMap[prodId].revenue += (calculateItemPrice(item, t.isWholesale) * item.quantity);
      });

      const emp = t.employeeName || 'Système';
      employeeMap[emp] = (employeeMap[emp] || 0) + t.total;

      const key = period === 'monthly' 
        ? formatSafe(t.timestamp, 'MMM yyyy', { locale: fr })
        : formatSafe(t.timestamp, 'yyyy', { locale: fr });
      periodMap[key] = (periodMap[key] || 0) + t.total;
    });

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const employeeData = Object.entries(employeeMap).map(([name, value]) => ({ name, value }));
    const periodData = Object.entries(periodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        if (period === 'yearly') return parseInt(a.name) - parseInt(b.name);
        return 0; 
      });
    
    // Revenue by source
    const revenueBySource = transactions.reduce((acc, t) => {
        if (t.status === 'returned') return acc;
        const source = t.onlineOrderId ? 'Application' : 'Magasin';
        acc[source] = (acc[source] || 0) + t.total;
        return acc;
    }, { Magasin: 0, Application: 0 } as Record<string, number>);

    const productSalesData = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue);
    const topProducts = productSalesData.slice(0, 10);

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.status === 'returned' ? 0 : t.total), 0);
    const totalCost = transactions.reduce((sum, t) => {
      if (t.status === 'returned') return sum;
      return sum + t.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.id);
        const costPrice = product?.costPrice || 0;
        
        // Add operational costs (packaging, shipping, other)
        const opCosts = product?.operationalCosts || {};
        const packaging = opCosts.packaging ?? (t.onlineOrderId ? (settings.operationalCosts?.basePackaging || 0) : 0);
        const shipping = opCosts.shipping ?? (t.onlineOrderId ? (settings.operationalCosts?.baseShipping || 0) : 0);
        const other = opCosts.other || 0;
        
        const totalUnitCost = costPrice + packaging + shipping + other;
        
        return itemSum + (totalUnitCost * item.quantity);
      }, 0);
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;

    return { 
      categoryData, 
      employeeData, 
      periodData, 
      revenueBySource,
      topProducts, 
      productSalesData, 
      totalRevenue, 
      totalCost, 
      totalExpenses, 
      grossProfit, 
      netProfit 
    };
  }, [transactions, products, expenses, period, settings]);

  return (
    <>
      <div className="flex justify-start mb-6">
        <div id="chart-period-toggle" className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center shadow-lg">
          <button 
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              period === 'monthly' ? "bg-white text-indigo-600 shadow-sm" : "text-white/40 hover:text-white"
            }`}
          >
            Vue Mensuelle
          </button>
          <button 
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              period === 'yearly' ? "bg-white text-indigo-600 shadow-sm" : "text-white/40 hover:text-white"
            }`}
          >
            Vue Annuelle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
        <Card id="card-charts-revenue" className="p-6 border-l-4 border-l-indigo-500 bg-white/5">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
          <h4 className="text-2xl font-black text-white">{data.totalRevenue.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-charts-cost" className="p-6 border-l-4 border-l-rose-500 bg-white/5">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Coût des Ventes</p>
          <h4 className="text-2xl font-black text-white">{data.totalCost.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-charts-expenses" className="p-6 border-l-4 border-l-amber-500 bg-white/5">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Dépenses Opérationnelles</p>
          <h4 className="text-2xl font-black text-white">{data.totalExpenses.toFixed(2)} {settings.currency}</h4>
        </Card>
        <Card id="card-charts-profit" className="p-6 border-l-4 border-l-emerald-500 bg-white/5">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Bénéfice Net</p>
          <h4 className="text-2xl font-black text-emerald-400">{data.netProfit.toFixed(2)} {settings.currency}</h4>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Sales by Period Chart */}
        <Card id="card-chart-evolution" className="p-6 bg-white/5 border-white/10">
          <h4 className="flex items-center gap-2 text-sm font-black text-white/60 mb-8 uppercase tracking-widest">
            <TrendingUp size={18} className="text-indigo-400" />
            Évolution des Ventes
          </h4>
          <div className="h-[300px] w-full relative min-h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
                <AreaChart data={data.periodData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ffffff44' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ffffff44' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${Number(value || 0).toFixed(2)} ${settings.currency}`, 'Total']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Sales by Source Chart */}
        <Card id="card-chart-source" className="p-6 bg-white/5 border-white/10">
          <h4 className="flex items-center gap-2 text-sm font-black text-white/60 mb-8 uppercase tracking-widest">
            <LayoutGrid size={18} className="text-emerald-400" />
            Ventes par Source
          </h4>
          <div className="h-[300px] w-full relative min-h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={Object.entries(data.revenueBySource).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.entries(data.revenueBySource).map((_, index) => (
                      <Cell key={`cell-rev-source-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${Number(value || 0).toFixed(2)} ${settings.currency}`, 'Total']}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{value}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top Products Table */}
        <Card id="card-chart-top-products" className="p-6 bg-white/5 border-white/10 text-left">
          <h4 className="font-black text-white/60 mb-8 flex items-center gap-2 text-sm uppercase tracking-widest">
            <ShoppingBag size={18} className="text-indigo-400" />
            Top 10 Produits
          </h4>
          <div className="space-y-3">
            {data.topProducts.map((p, idx) => (
              <div key={`top-product-${idx}`} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white/20 text-xs shadow-inner">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{p.name}</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{p.quantity} unités</p>
                  </div>
                </div>
                <p className="text-sm font-black text-indigo-400 font-mono">{p.revenue.toFixed(2)} {settings.currency}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Sales by Employee Chart */}
        <Card id="card-chart-employees" className="p-6 lg:col-span-2 bg-white/5 border-white/10">
          <h4 className="flex items-center gap-2 text-sm font-black text-white/60 mb-8 uppercase tracking-widest">
            <Users size={18} className="text-amber-400" />
            Performance par Employé
          </h4>
          <div className="h-[300px] w-full relative min-h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
                <BarChart data={data.employeeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ffffff44' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ffffff44' }} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${Number(value || 0).toFixed(2)} ${settings.currency}`, 'Total Vendu']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {data.employeeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Sales by Product Chart */}
        <Card id="card-chart-products" className="p-6 lg:col-span-2 text-left bg-white/5 border-white/10">
          <h4 className="font-bold text-white mb-6 flex items-center gap-2">
            <ShoppingBag size={18} className="text-indigo-400" />
            Ventes par Produit (Volume & Revenu)
          </h4>
          <div className="h-[400px] w-full relative min-h-[400px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={400} minWidth={0} debounce={50}>
                <BarChart data={data.productSalesData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#ffffff44' }} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff44' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff44' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'revenue') return [`${Number(value || 0).toFixed(2)} ${settings.currency}`, 'Chiffre d\'Affaires'];
                      return [value, 'Unités Vendues'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="quantity" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </>
  );
});
