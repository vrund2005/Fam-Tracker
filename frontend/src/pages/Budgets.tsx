import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { PiggyBank, Plus, Trash2, CheckCircle, AlertTriangle, Layers, Calendar, X } from 'lucide-react';
import * as Icons from 'lucide-react';

interface CategoryItem {
  id: number;
  name: string;
}

interface BudgetDetailItem {
  id: number;
  category_id: number | null;
  category_name: string;
  category_color: string;
  category_icon: string;
  limit: number;
  spent: number;
  remaining: number;
  utilization_percentage: number;
  status: 'green' | 'yellow' | 'red';
}

export const Budgets: React.FC = () => {
  const { user } = useAuth();
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  // Lists
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetDetailItem[]>([]);
  const [overallBudget, setOverallBudget] = useState<any>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form Fields
  const [categoryId, setCategoryId] = useState<string>('overall'); // 'overall' or category_id string
  const [limit, setLimit] = useState('');

  // Month Names Helper
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchExpenseCategories();
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [month, year]);

  const fetchExpenseCategories = async () => {
    try {
      const data = await api.get('/api/categories?type=expense');
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBudgets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/api/budgets/details?month=${month}&year=${year}`);
      setBudgets(data.categories);
      setOverallBudget(data.overall);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const numericLimit = parseFloat(limit);
    if (isNaN(numericLimit) || numericLimit < 0) {
      setError('Limit must be a valid positive number');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        category_id: categoryId === 'overall' ? null : parseInt(categoryId),
        monthly_limit: numericLimit,
        month,
        year
      };

      await api.post('/api/budgets', payload);
      setSuccess('Budget updated successfully!');
      setLimit('');
      
      // Reload budgets
      await fetchBudgets();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save budget configuration');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this budget limit?')) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/budgets/${id}`);
      setSuccess('Budget limit removed successfully!');
      
      // Reload budgets
      await fetchBudgets();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete budget limit');
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const LucideIcon = (Icons as any)[iconName || 'Tag'] || Icons.Tag;
    return <LucideIcon size={18} style={{ color }} />;
  };

  const getStatusBorder = (status: string) => {
    if (status === 'red') return 'border-cmyk-magenta';
    if (status === 'yellow') return 'border-cmyk-yellow';
    return 'border-cmyk-cyan';
  };

  const getStatusText = (status: string) => {
    if (status === 'red') return 'text-cmyk-magenta';
    if (status === 'yellow') return 'text-cmyk-yellow';
    return 'text-cmyk-cyan';
  };

  const getStatusBg = (status: string) => {
    if (status === 'red') return 'bg-cmyk-magenta';
    if (status === 'yellow') return 'bg-cmyk-yellow';
    return 'bg-cmyk-cyan';
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Budget Grid List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Budget Planning</h2>
            <p className="text-xs text-cmyk-gray-400">Manage monthly spending targets and evaluate warnings before overspending occurs.</p>
          </div>

          {/* Month/Year selector */}
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

        {success && (
          <div className="p-4 rounded-xl bg-cmyk-cyan/10 border border-cmyk-cyan/30 text-cmyk-cyan text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cmyk-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. OVERALL FAMILY BUDGET TARGET CARD */}
            {overallBudget && overallBudget.is_set ? (
              <div className={`glass-card-dark p-6 rounded-3xl border ${getStatusBorder(overallBudget.status)} shadow-glass-dark relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Overall Monthly Budget</h3>
                    <p className="text-[10px] text-cmyk-gray-400">Total family budget ceiling for {monthNames[month-1]}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(overallBudget.id)}
                      className="p-2 text-cmyk-gray-400 hover:text-cmyk-magenta hover:bg-cmyk-magenta/10 rounded-xl transition-colors"
                      title="Remove Limit"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-cmyk-gray-500 uppercase">Limit</p>
                    <p className="text-xl font-black text-white">₹{overallBudget.limit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-cmyk-gray-500 uppercase">Spent</p>
                    <p className={`text-xl font-black ${getStatusText(overallBudget.status)}`}>
                      ₹{overallBudget.spent.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold text-cmyk-gray-500 uppercase">Remaining</p>
                    <p className={`text-xl font-black ${overallBudget.remaining >= 0 ? 'text-green-500' : 'text-cmyk-magenta'}`}>
                      ₹{overallBudget.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-cmyk-gray-500 mb-1">
                    <span>Utilization</span>
                    <span>{overallBudget.utilization_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-cmyk-gray-950 rounded-full h-3 border border-cmyk-gray-800 p-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getStatusBg(overallBudget.status)}`}
                      style={{ width: `${Math.min(100, overallBudget.utilization_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-cmyk-gray-800 rounded-3xl bg-cmyk-gray-900/10">
                <PiggyBank size={32} className="mx-auto text-cmyk-gray-600 mb-2" />
                <p className="text-xs font-bold text-cmyk-gray-400">Overall Monthly Budget Target Not Configured</p>
                <p className="text-[10px] text-cmyk-gray-500 mt-0.5">Please use the form to set a total family spending limit.</p>
              </div>
            )}

            {/* 2. CATEGORY BUDGET TARGETS */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cmyk-gray-400 mb-3">Category Thresholds</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgets.map((b) => (
                  <div key={b.id} className="glass-card-dark p-5 rounded-3xl border border-cmyk-gray-800/80 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-cmyk-gray-900 border border-cmyk-gray-850 rounded-xl shrink-0">
                          {renderIcon(b.category_icon, b.category_color)}
                        </div>
                        <span className="text-xs font-bold text-white truncate">{b.category_name}</span>
                      </div>
                      
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1 rounded text-cmyk-gray-500 hover:text-cmyk-magenta hover:bg-cmyk-magenta/10 transition-colors"
                          title="Remove Limit"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-cmyk-gray-500 uppercase">Limit</span>
                        <p className="font-extrabold text-white">₹{b.limit.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-cmyk-gray-500 uppercase">Spent</span>
                        <p className={`font-extrabold ${getStatusText(b.status)}`}>₹{b.spent.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress slider */}
                    <div>
                      <div className="flex justify-between text-[9px] font-semibold text-cmyk-gray-500 mb-1">
                        <span>Burn Rate</span>
                        <span>{b.utilization_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-cmyk-gray-950 rounded-full h-2 border border-cmyk-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getStatusBg(b.status)}`}
                          style={{ width: `${Math.min(100, b.utilization_percentage)}%` }}
                        />
                      </div>
                    </div>

                  </div>
                ))}

                {budgets.length === 0 && (
                  <div className="col-span-2 text-center text-xs text-cmyk-gray-500 py-10 font-semibold">
                    No category budgets have been set for this month.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Admin Panel Configuration Box */}
      {isAdmin ? (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 shrink-0 h-fit space-y-4 shadow-glass-dark">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gradient-cyan-magenta flex items-center gap-2">
            <Plus size={16} />
            Configure Limits
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Target Select */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Target</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              >
                <option value="overall">Overall Family Monthly Limit</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} category limit</option>
                ))}
              </select>
            </div>

            {/* Limit Input */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Monthly Limit (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cmyk-cyan">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full pl-7 pr-4 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs font-bold focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Note details */}
            <p className="text-[10px] text-cmyk-gray-500 leading-normal">
              💡 If a limit already exists for this selection in {monthNames[month-1]} {year}, saving will overwrite the old value.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 bg-gradient-to-r from-cmyk-cyan to-cmyk-magenta hover:shadow-cyan-glow text-white font-bold text-xs tracking-wide rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={14} />
                  <span>Set Limit Threshold</span>
                </>
              )}
            </button>

          </form>
        </div>
      ) : (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 text-center text-xs text-cmyk-gray-500 font-semibold h-fit">
          🔒 Editing budget limits is restricted to Admins.
        </div>
      )}

    </div>
  );
};
export default Budgets;
