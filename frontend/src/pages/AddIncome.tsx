import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, Calendar, Plus, X } from 'lucide-react';

interface CategoryItem {
  id: number;
  name: string;
}

export const AddIncome: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/categories?type=income');
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Amount must be a valid positive number');
      return;
    }

    if (!categoryId) {
      setError('Please select an income category');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/income', {
        amount: numAmt,
        category_id: parseInt(categoryId),
        description: description || null,
        income_date: incomeDate
      });

      setSuccess(true);
      setAmount('');
      setDescription('');
      
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save income record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Add Income</h2>
        <p className="text-xs text-cmyk-gray-400">Log standard salary, business revenue, stipends, or dividends.</p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-cmyk-cyan/10 border border-cmyk-cyan/30 text-cmyk-cyan text-sm font-bold flex items-center gap-2.5 animate-bounce">
          <CheckCircle size={20} />
          <span>Income logged successfully! Redirecting...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta text-sm font-semibold flex items-center gap-2">
          <X size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
        
        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Amount (INR)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-green-500">₹</span>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-lg font-bold text-white focus:border-cmyk-cyan focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Income Source</label>
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
          <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Received Date</label>
          <div className="relative">
            <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
            <input
              type="date"
              required
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              className="w-full px-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-cmyk-gray-400 uppercase tracking-wider mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly corporate payout"
            className="w-full px-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-cmyk-cyan hover:shadow-cyan-glow text-white font-extrabold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={16} />
              <span>Record Family Income</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
};
export default AddIncome;
