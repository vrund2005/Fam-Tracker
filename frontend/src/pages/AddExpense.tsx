import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Sparkles, Camera, Plus, CheckCircle, Split, Calendar, Landmark, Repeat, X } from 'lucide-react';
import * as Icons from 'lucide-react';

interface FamilyUser {
  id: string;
  name: string;
  avatar_url?: string;
  relation?: string;
}

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export const AddExpense: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories & Users lists
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([]);

  // Main Form fields
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'upi'|'net_banking'|'other'>('cash');
  const [receiptUrl, setReceiptUrl] = useState('');
  
  // Split details
  const [shouldSplit, setShouldSplit] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({}); // user_id -> amount string

  // Recurring details
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      // Fetch expense categories
      const cats = await api.get('/api/categories?type=expense');
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id.toString());

      // Fetch family members
      const members = await api.get('/api/users');
      setFamilyMembers(members);

      // Initialize custom splits dictionary
      const splitsInit: Record<string, string> = {};
      members.forEach((m: FamilyUser) => {
        splitsInit[m.id] = '';
      });
      setCustomSplits(splitsInit);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute splits automatically when amount changes
  const computedEqualSplit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || familyMembers.length === 0) return 0;
    return (num / familyMembers.length);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.post('/api/expenses/upload-receipt', formData);
      setReceiptUrl(data.receipt_url);
    } catch (err: any) {
      setError(err.message || 'File upload failed. Images only.');
    } finally {
      setUploading(false);
    }
  };

  const handleCustomSplitChange = (userId: string, val: string) => {
    setCustomSplits(prev => ({
      ...prev,
      [userId]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a valid positive number');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setLoading(true);

    try {
      // Build Splits Payload
      let splitsPayload: any[] = [];
      
      if (shouldSplit) {
        if (splitMode === 'equal') {
          const splitAmt = numericAmount / familyMembers.length;
          splitsPayload = familyMembers.map(m => ({
            user_id: m.id,
            amount: parseFloat(splitAmt.toFixed(2))
          }));
        } else {
          // Custom Splits Validation
          let sum = 0;
          splitsPayload = familyMembers.map(m => {
            const val = parseFloat(customSplits[m.id]) || 0;
            sum += val;
            return {
              user_id: m.id,
              amount: val
            };
          });

          // Allow small epsilon for decimal rounding
          if (Math.abs(sum - numericAmount) > 0.1) {
            throw new Error(`Custom splits must total ₹${numericAmount}. Current total is ₹${sum.toFixed(2)}`);
          }
        }
      }

      // 1. Save main expense transaction
      const expenseData = {
        amount: numericAmount,
        category_id: parseInt(categoryId),
        description: description || null,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        receipt_image_url: receiptUrl || null,
        splits: shouldSplit ? splitsPayload : []
      };

      await api.post('/api/expenses', expenseData);

      // 2. If flagged as recurring, save recurring expense profile
      if (isRecurring) {
        await api.post('/api/recurring', {
          amount: numericAmount,
          category_id: parseInt(categoryId),
          description: description || 'Recurring Expense',
          frequency: frequency,
          start_date: expenseDate,
          payment_method: paymentMethod
        });
      }

      setSuccess(true);
      setAmount('');
      setDescription('');
      setReceiptUrl('');
      setShouldSplit(false);
      setIsRecurring(false);
      
      // Auto redirect to dashboard after a short delay
      setTimeout(() => navigate('/'), 1200);

    } catch (err: any) {
      setError(err.message || 'Failed to save expense entry');
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (iconName: string) => {
    const LucideIcon = (Icons as any)[iconName] || Icons.Tag;
    return <LucideIcon size={18} />;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Add Expense</h2>
        <p className="text-xs text-cmyk-gray-400">Log a new family cost, upload receipts, split bills, or set up recurring items.</p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-cmyk-cyan/10 border border-cmyk-cyan/30 text-cmyk-cyan text-sm font-bold flex items-center gap-2.5 animate-bounce">
          <CheckCircle size={20} />
          <span>Expense logged successfully! Redirecting...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta text-sm font-semibold flex items-center gap-2">
          <X size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Main Details Panel */}
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
          
          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-cmyk-cyan">₹</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-lg font-bold text-white focus:border-cmyk-cyan focus:outline-none focus:shadow-cyan-glow transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Payment Channel</label>
              <div className="relative">
                <Landmark size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all capitalize"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI (GPay/Paytm)</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. DMart weekly restocking"
                className="w-full px-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Receipt Upload Widget */}
          <div>
            <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Attach Receipt Image</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cmyk-gray-800 bg-cmyk-gray-900 text-cmyk-gray-300 text-xs font-semibold cursor-pointer hover:bg-cmyk-gray-800 transition-colors">
                <Camera size={16} className="text-cmyk-cyan" />
                <span>Choose Image / Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && <div className="w-4 h-4 border-2 border-cmyk-cyan border-t-transparent rounded-full animate-spin" />}
              {receiptUrl && (
                <div className="flex items-center gap-2 text-[10px] text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                  <CheckCircle size={12} />
                  <span>Receipt Attached!</span>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Expense Split Configuration Panel */}
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split size={18} className="text-cmyk-cyan" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400">Expense Split Tracking</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shouldSplit}
                onChange={(e) => setShouldSplit(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-cmyk-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cmyk-cyan" />
            </label>
          </div>

          {shouldSplit && (
            <div className="pt-2 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              
              {/* Split Mode Selector */}
              <div className="flex items-center gap-4 bg-cmyk-gray-900 p-1.5 rounded-xl border border-cmyk-gray-800/80">
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    splitMode === 'equal'
                      ? 'bg-cmyk-cyan text-cmyk-black shadow-cyan-glow'
                      : 'text-cmyk-gray-400 hover:text-white'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    splitMode === 'custom'
                      ? 'bg-cmyk-cyan text-cmyk-black shadow-cyan-glow'
                      : 'text-cmyk-gray-400 hover:text-white'
                  }`}
                >
                  Custom Amounts
                </button>
              </div>

              {/* Splits List */}
              <div className="space-y-3">
                {familyMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-cmyk-gray-900/40 border border-cmyk-gray-800 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <img src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold">{m.name}</p>
                        <p className="text-[9px] text-cmyk-gray-500">{m.relation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {splitMode === 'equal' ? (
                        <span className="text-xs font-bold text-cmyk-gray-300">
                          ₹{computedEqualSplit().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-cmyk-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={customSplits[m.id] || ''}
                            onChange={(e) => handleCustomSplitChange(m.id, e.target.value)}
                            placeholder="0.00"
                            className="w-24 pl-6 pr-2 py-1.5 bg-cmyk-gray-950 border border-cmyk-gray-800 rounded-lg text-xs font-bold focus:outline-none focus:border-cmyk-cyan text-right"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
            </div>
          )}
        </div>

        {/* Recurring Expense configuration */}
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat size={18} className="text-cmyk-cyan" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400">Recurring Schedule</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-cmyk-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cmyk-cyan" />
            </label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1.5">Billing Interval</label>
                <select
                  value={frequency}
                  onChange={(e: any) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="flex items-end pb-1 text-[11px] text-cmyk-gray-500 font-medium">
                💡 Automatically schedules subsequent charges on this calendar date.
              </div>
            </div>
          )}
        </div>

        {/* Submit action */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cmyk-cyan via-cmyk-magenta to-cmyk-yellow hover:shadow-cyan-glow text-white font-extrabold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={16} />
              <span>Log Expense Entry</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
};
export default AddExpense;
