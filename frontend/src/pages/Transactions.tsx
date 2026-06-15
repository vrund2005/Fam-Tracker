import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Calendar, 
  Eye, 
  CheckCircle,
  FileImage,
  ChevronDown,
  X
} from 'lucide-react';
import * as Icons from 'lucide-react';

interface Transaction {
  type: 'income' | 'expense';
  date: string;
  category: string;
  description: string;
  amount: number;
  member: string;
  details: string; // payment method or empty
  id?: number; // Not present in reports transactions directly, but we can resolve it
}

export const Transactions: React.FC = () => {
  const { user } = useAuth();
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  
  // Lists
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Client-side Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');

  // Modal receipt viewer
  const [activeReceipt, setActiveReceipt] = useState<string | null>(null);

  // Dynamic unique lists for filtering
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [membersList, setMembersList] = useState<string[]>([]);

  // Month Names Helper
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchTransactions();
  }, [month, year]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch report data for target month/year
      // Report returns all transactions with category names, user names, details, etc.
      // We will make sure the API returns standard models containing IDs to allow deletion.
      // Let's call the list endpoints instead to get detailed items containing database IDs!
      // This is much better because we get true IDs for deletions!
      
      const lastDay = new Date(year, month, 0).getDate();
      const expensesRes = await api.get(`/api/expenses?start_date=${year}-${String(month).padStart(2, '0')}-01&end_date=${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}&limit=100`);
      const incomeRes = await api.get(`/api/income?start_date=${year}-${String(month).padStart(2, '0')}-01&end_date=${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}&limit=100`);
      
      const combined: any[] = [
        ...expensesRes.items.map((e: any) => ({
          id: e.id,
          type: 'expense',
          date: e.expense_date,
          category: e.category?.name || 'Other',
          category_color: e.category?.color,
          category_icon: e.category?.icon,
          description: e.description || '',
          amount: parseFloat(e.amount),
          member: e.creator_name || 'Unknown',
          created_by: e.created_by,
          details: e.payment_method,
          receipt_url: e.receipt_image_url
        })),
        ...incomeRes.items.map((i: any) => ({
          id: i.id,
          type: 'income',
          date: i.income_date,
          category: i.category?.name || 'Other',
          category_color: i.category?.color,
          category_icon: i.category?.icon,
          description: i.description || '',
          amount: parseFloat(i.amount),
          member: i.creator_name || 'Unknown',
          created_by: i.created_by,
          details: '',
          receipt_url: null
        }))
      ];

      // Sort by date descending
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setTransactions(combined);

      // Extract unique categories and members for filter dropdowns
      const cats = Array.from(new Set(combined.map(t => t.category)));
      const members = Array.from(new Set(combined.map(t => t.member)));
      setCategoriesList(cats);
      setMembersList(members);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, type: 'income' | 'expense') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      if (type === 'expense') {
        await api.delete(`/api/expenses/${id}`);
      } else {
        await api.delete(`/api/income/${id}`);
      }
      setSuccess('Transaction deleted successfully!');
      
      // Update local state
      setTransactions(prev => prev.filter(t => !(t.id === id && t.type === type)));
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const LucideIcon = (Icons as any)[iconName || 'Tag'] || Icons.Tag;
    return <LucideIcon size={16} style={{ color }} />;
  };

  // Filter Logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.member.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesMember = filterMember === 'all' || t.member === filterMember;

    return matchesSearch && matchesType && matchesCategory && matchesMember;
  });

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Transaction History</h2>
          <p className="text-xs text-cmyk-gray-400">Search, filter, and inspect receipt files from the shared family account ledger.</p>
        </div>
        
        {/* Date Filter */}
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

      {/* 1. FILTERING CONTROLS */}
      <div className="glass-card-dark p-4 rounded-2xl border border-cmyk-gray-800/80 space-y-4">
        
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Global Search Bar */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, category, user..."
              className="w-full pl-9 pr-4 py-2 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs text-white placeholder-cmyk-gray-500 focus:outline-none focus:border-cmyk-cyan transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-3 gap-2 md:w-96">
            
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="bg-cmyk-gray-900 border border-cmyk-gray-800 text-xs px-2.5 py-2 rounded-xl focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-cmyk-gray-900 border border-cmyk-gray-800 text-xs px-2.5 py-2 rounded-xl focus:outline-none"
            >
              <option value="all">Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Member Filter */}
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="bg-cmyk-gray-900 border border-cmyk-gray-800 text-xs px-2.5 py-2 rounded-xl focus:outline-none"
            >
              <option value="all">Members</option>
              {membersList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

          </div>
        </div>

      </div>

      {/* 2. TRANSACTIONS LEDGER LIST */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cmyk-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card-dark rounded-3xl border border-cmyk-gray-800/80 overflow-hidden shadow-glass-dark">
          <div className="overflow-x-auto no-scrollbar">
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cmyk-gray-850 bg-cmyk-gray-900/40 text-[10px] uppercase font-bold text-cmyk-gray-400 tracking-wider">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-4">Details</th>
                  <th className="py-4 px-4">Payer</th>
                  <th className="py-4 px-4">Method</th>
                  <th className="py-4 px-4 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-cmyk-gray-900/40 text-xs">
                {filteredTransactions.map((tx, idx) => {
                  // Permission check: admin can delete anything; members can only delete their own
                  const canDelete = user?.role === 'admin' || tx.created_by === user?.id;
                  
                  return (
                    <tr key={idx} className="hover:bg-cmyk-gray-900/10 transition-colors">
                      {/* Date */}
                      <td className="py-4 px-6 font-medium text-cmyk-gray-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </td>

                      {/* Icon + Description */}
                      <td className="py-4 px-4 min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cmyk-gray-900 border border-cmyk-gray-850 rounded-xl shrink-0">
                            {renderIcon(tx.category_icon, tx.category_color || '#fff')}
                          </div>
                          <div>
                            <p className="font-bold text-white leading-tight">{tx.description || tx.category}</p>
                            <span className="text-[10px] text-cmyk-gray-500 font-semibold">{tx.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Member */}
                      <td className="py-4 px-4 font-semibold text-cmyk-gray-300">
                        {tx.member}
                      </td>

                      {/* Method */}
                      <td className="py-4 px-4 font-medium capitalize text-cmyk-gray-500 whitespace-nowrap">
                        {tx.details ? tx.details.replace('_', ' ') : '—'}
                      </td>

                      {/* Amount */}
                      <td className={`py-4 px-4 text-right font-extrabold text-sm whitespace-nowrap ${
                        tx.type === 'income' ? 'text-green-500' : 'text-cmyk-magenta'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Receipt Trigger */}
                          {tx.receipt_url ? (
                            <button
                              onClick={() => {
                                // Direct absolute URL or append relative host
                                const fullUrl = tx.receipt_url.startsWith('http') 
                                  ? tx.receipt_url 
                                  : `http://localhost:8000${tx.receipt_url}`;
                                setActiveReceipt(fullUrl);
                              }}
                              className="p-1.5 rounded-lg bg-cmyk-cyan/10 border border-cmyk-cyan/30 text-cmyk-cyan hover:bg-cmyk-cyan/20 transition-all"
                              title="View Receipt File"
                            >
                              <FileImage size={14} />
                            </button>
                          ) : (
                            <div className="w-7 h-7" /> // Spacer
                          )}

                          {/* Delete Trigger */}
                          {canDelete ? (
                            <button
                              onClick={() => handleDelete(tx.id, tx.type)}
                              className="p-1.5 rounded-lg bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta hover:bg-cmyk-magenta/20 transition-all"
                              title="Delete transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <div className="w-7 h-7" /> // Spacer
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTransactions.length === 0 && (
              <div className="py-16 text-center text-xs text-cmyk-gray-500 font-semibold">
                No matching transactions found. Try resetting filters.
              </div>
            )}

          </div>
        </div>
      )}

      {/* 3. RECEIPT PREVIEW MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-cmyk-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card-dark max-w-lg w-full rounded-3xl border border-cmyk-gray-800 overflow-hidden relative shadow-glass-dark">
            <button
              onClick={() => setActiveReceipt(null)}
              className="absolute top-4 right-4 p-2 bg-cmyk-gray-950/80 rounded-full text-cmyk-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="p-6">
              <h4 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4">Receipt File Attachment</h4>
              <div className="bg-cmyk-black rounded-2xl overflow-hidden border border-cmyk-gray-805 flex justify-center max-h-96">
                <img
                  src={activeReceipt}
                  alt="Receipt Preview"
                  className="object-contain w-full h-full"
                  onError={(e) => {
                    // Fallback if local backend url resolver mismatch
                    console.error('Image load failed');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Transactions;
