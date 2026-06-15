import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Lightbulb,
  Award,
  Wallet,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import * as Icons from 'lucide-react';

interface MetricCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, amount, icon, colorClass, glowClass, subtitle }) => (
  <div className={`glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800/80 shadow-glass-dark relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-10 pointer-events-none ${glowClass}`} />
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">{title}</p>
        <h3 className={`text-2xl font-extrabold ${colorClass}`}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
        {subtitle && <p className="text-[10px] text-cmyk-gray-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-2xl bg-cmyk-gray-900 border border-cmyk-gray-800 text-cmyk-gray-300`}>
        {icon}
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  
  // Dashboard states
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    overallLimit: 0,
    overallRemaining: 0,
    overallSpent: 0,
    overallUtilization: 0,
    overallStatus: 'green'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month Names Helper
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [month, year]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get Report Data (aggregates everything)
      const report = await api.get(`/api/reports?month=${month}&year=${year}`);
      
      // 2. Get Budget Details
      const budget = await api.get(`/api/budgets/details?month=${month}&year=${year}`);
      
      // 3. Get Smart Insights
      const rawInsights = await api.get('/api/insights');
      
      // 4. Get User Contributions
      const contributors = await api.get('/api/users/stats/contributions');
      
      setMetrics({
        totalIncome: report.total_income,
        totalExpense: report.total_expense,
        balance: report.savings,
        overallLimit: budget.overall.limit,
        overallRemaining: budget.overall.remaining,
        overallSpent: budget.overall.spent,
        overallUtilization: budget.overall.utilization_percentage,
        overallStatus: budget.overall.status
      });

      // Chart: Monthly Trends (last 6 months)
      setChartData(report.monthly_trends);

      // Chart: Pie Chart Category Breakdown
      setCategoryBreakdown(report.category_breakdown);

      // Recent Transactions (limit to 5)
      setRecentTransactions(report.transactions.slice(0, 5));

      // Budget warnings: Filter categories exceeding 85% utilization
      const warnings = budget.categories.filter((cat: any) => cat.utilization_percentage >= 80);
      setBudgetAlerts(warnings);

      // Insights
      setInsights(rawInsights.slice(0, 4));

      // Contributors
      setTopContributors(contributors.slice(0, 3));
      
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const LucideIcon = (Icons as any)[iconName || 'Tag'] || Icons.Tag;
    return <LucideIcon size={18} style={{ color }} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'red') return 'bg-cmyk-magenta border-cmyk-magenta/30 text-white';
    if (status === 'yellow') return 'bg-cmyk-yellow border-cmyk-yellow/30 text-cmyk-black';
    return 'bg-cmyk-cyan border-cmyk-cyan/30 text-cmyk-black';
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Upper controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Family Budget Summary</h2>
          <p className="text-xs text-cmyk-gray-400">Welcome back, {user?.name} ({user?.family_member?.relation})</p>
        </div>
        
        {/* Date Filters */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-cmyk-cyan" />
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="bg-cmyk-gray-900 border border-cmyk-gray-800 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-cmyk-cyan"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-cmyk-gray-900 border border-cmyk-gray-800 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-cmyk-cyan"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-cmyk-cyan border-t-transparent rounded-full animate-spin shadow-cyan-glow" />
        </div>
      ) : (
        <>
          {/* 1. CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Current Balance"
              amount={metrics.balance}
              icon={<Wallet size={20} />}
              colorClass={metrics.balance >= 0 ? 'text-cmyk-cyan' : 'text-cmyk-magenta'}
              glowClass="bg-cmyk-cyan"
              subtitle={`Total savings for ${monthNames[month-1]}`}
            />
            
            <MetricCard
              title="Total Income"
              amount={metrics.totalIncome}
              icon={<ArrowUpRight size={20} className="text-green-500" />}
              colorClass="text-green-500"
              glowClass="bg-green-500"
              subtitle="Earned this month"
            />
            
            <MetricCard
              title="Total Expense"
              amount={metrics.totalExpense}
              icon={<ArrowDownRight size={20} className="text-cmyk-magenta" />}
              colorClass="text-cmyk-magenta"
              glowClass="bg-cmyk-magenta"
              subtitle="Spent this month"
            />
            
            <MetricCard
              title="Remaining Budget"
              amount={metrics.overallLimit > 0 ? metrics.overallRemaining : 0}
              icon={<Layers size={20} />}
              colorClass={metrics.overallRemaining >= 0 ? 'text-cmyk-yellow' : 'text-cmyk-magenta'}
              glowClass="bg-cmyk-yellow"
              subtitle={metrics.overallLimit > 0 ? `Limit: ₹${metrics.overallLimit.toLocaleString()}` : "Budget limit not set"}
            />
          </div>

          {/* 2. OVERALL BUDGET UTILIZATION PROGRESS BAR */}
          {metrics.overallLimit > 0 && (
            <div className="glass-card-dark p-5 rounded-3xl border border-cmyk-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cmyk-gray-400">Monthly Budget Burn Rate</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(metrics.overallStatus)}`}>
                  {metrics.overallUtilization.toFixed(0)}% Utilized
                </span>
              </div>
              <div className="w-full bg-cmyk-gray-900 rounded-full h-3.5 border border-cmyk-gray-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.overallStatus === 'red' 
                      ? 'bg-cmyk-magenta shadow-magenta-glow' 
                      : (metrics.overallStatus === 'yellow' ? 'bg-cmyk-yellow shadow-yellow-glow' : 'bg-cmyk-cyan shadow-cyan-glow')
                  }`}
                  style={{ width: `${Math.min(100, metrics.overallUtilization)}%` }}
                />
              </div>
              <p className="text-[10px] text-cmyk-gray-500 mt-2">
                Spent: ₹{metrics.overallSpent.toLocaleString()} of ₹{metrics.overallLimit.toLocaleString()} limit
              </p>
            </div>
          )}

          {/* 3. CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Trend Chart */}
            <div className="lg:col-span-2 glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col">
              <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-cmyk-cyan" />
                6-Month Trend analysis
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF2D95" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#FF2D95" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="month_name" stroke="#71717A" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#FF2D95" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col">
              <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-cmyk-magenta" />
                Category Spending
              </h3>
              {categoryBreakdown.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-cmyk-gray-500 py-10">
                  No expense records logged this month.
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="h-48 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="category_name"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#00C2FF'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }}
                          formatter={(value) => value ? `₹${Number(value).toLocaleString()}` : ''}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-[10px] text-cmyk-gray-500 font-bold uppercase">Total</p>
                      <p className="text-sm font-extrabold text-cmyk-cyan">
                        ₹{metrics.overallSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  {/* Legend list */}
                  <div className="mt-2 w-full grid grid-cols-2 gap-2 text-[10px] max-h-20 overflow-y-auto no-scrollbar">
                    {categoryBreakdown.slice(0, 6).map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate text-cmyk-gray-400 font-medium">{cat.category_name} ({cat.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. DETAILS ROW (Insights, Alerts, Contributors) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Smart Insights */}
            <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800">
              <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2">
                <Lightbulb size={16} className="text-cmyk-yellow animate-pulse" />
                Smart Financial Insights
              </h3>
              <div className="space-y-3">
                {insights.map((ins, idx) => (
                  <div key={idx} className="p-3 bg-cmyk-gray-900/40 rounded-2xl border border-cmyk-gray-800/60 flex items-start gap-2.5">
                    <span className="text-lg mt-0.5">💡</span>
                    <p className="text-xs text-cmyk-gray-300 leading-normal">{ins.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400">
                  Recent Ledger
                </h3>
                <Link to="/transactions" className="text-xs text-cmyk-cyan font-bold hover:underline flex items-center">
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentTransactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-cmyk-gray-905/30 border border-cmyk-gray-800/40 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-cmyk-gray-900 border border-cmyk-gray-800 shrink-0">
                        {renderIcon(tx.category_icon, tx.color || '#fff')}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{tx.description || tx.category}</p>
                        <p className="text-[10px] text-cmyk-gray-500 font-medium">
                          {tx.member} • {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${tx.type === 'income' ? 'text-green-500' : 'text-cmyk-magenta'}`}>
                      {tx.type === 'income' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="text-center text-xs text-cmyk-gray-500 py-10">
                    No transactions to show.
                  </div>
                )}
              </div>
            </div>

            {/* Budget Alerts & Contributors */}
            <div className="space-y-6">
              
              {/* Budget Alerts Widget */}
              <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800">
                <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-cmyk-magenta" />
                  Budget Limits Exceeded
                </h3>
                <div className="space-y-3 max-h-40 overflow-y-auto no-scrollbar">
                  {budgetAlerts.map((b, idx) => (
                    <div key={idx} className="p-3 bg-cmyk-magenta/5 border border-cmyk-magenta/20 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{b.category_name}</p>
                        <p className="text-[9px] text-cmyk-gray-500 font-medium">Spent ₹{b.spent.toLocaleString()} / Limit ₹{b.limit.toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cmyk-magenta text-white font-bold">
                        {b.utilization_percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  {budgetAlerts.length === 0 && (
                    <div className="text-xs text-cmyk-gray-500 py-4 text-center">
                      👍 All category limits within safe parameters.
                    </div>
                  )}
                </div>
              </div>

              {/* Contributors widget */}
              <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800">
                <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2">
                  <Award size={16} className="text-cmyk-yellow" />
                  Top Contributors
                </h3>
                <div className="space-y-2">
                  {topContributors.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-cmyk-gray-900 last:border-0">
                      <div className="flex items-center gap-2">
                        <img src={c.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <p className="text-[9px] text-cmyk-gray-500 font-medium">{c.relation}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-cmyk-cyan">₹{c.total_spent.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Floating Action Buttons for quick access (Hidden on desktop sidebar nav, shown as quick-adds on desktop bottom corner) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-10 md:flex-row">
        <button
          onClick={() => navigate('/add-income')}
          className="hidden md:flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105"
        >
          <ArrowUpRight size={16} />
          <span>Add Income</span>
        </button>
        <button
          onClick={() => navigate('/add-expense')}
          className="hidden md:flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-cmyk-cyan to-cmyk-magenta text-white font-bold text-xs shadow-lg transition-transform hover:scale-105"
        >
          <Plus size={16} />
          <span>Add Expense</span>
        </button>
      </div>

    </div>
  );
};
export default Dashboard;
