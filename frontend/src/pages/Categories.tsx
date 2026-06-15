import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Grid, Plus, Trash2, CheckCircle, Flame, Tag, HelpCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  created_at: string;
}

export const Categories: React.FC = () => {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [color, setColor] = useState('#00C2FF');

  const [formLoading, setFormLoading] = useState(false);

  // Predefined lists
  const availableIcons = [
    'Tag', 'Utensils', 'ShoppingBag', 'Car', 'Zap', 'Flame', 
    'Wifi', 'Droplet', 'Home', 'CreditCard', 'BookOpen', 'Activity', 
    'Shirt', 'Plane', 'Gamepad2', 'Wrench', 'Dog', 'Gift', 
    'Briefcase', 'Laptop', 'TrendingUp', 'Percent', 'Building2', 
    'BarChart3', 'Sparkles', 'HelpCircle'
  ];

  const presetColors = [
    '#00C2FF', // Cyan
    '#FF2D95', // Magenta
    '#FFD60A', // Yellow
    '#34C759', // Green
    '#FF9500', // Orange
    '#FF3B30', // Red
    '#5856D6', // Indigo
    '#AF52DE', // Purple
    '#8E8E93', // Gray
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch categories list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      const newCat = await api.post('/api/categories', {
        name,
        icon: selectedIcon,
        color,
        type
      });
      setCategories(prev => [...prev, newCat]);
      setSuccess('Category added successfully!');
      
      // Reset form
      setName('');
      setSelectedIcon('Tag');
      setColor('#00C2FF');
      
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to add category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category? (It will fail if transactions are using it)')) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      setSuccess('Category deleted successfully!');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const renderIcon = (iconName: string, iconColor: string) => {
    const LucideIcon = (Icons as any)[iconName] || Icons.Tag;
    return <LucideIcon size={18} style={{ color: iconColor }} />;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* List / Grid display (2 Cols on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Ledger Categories</h2>
          <p className="text-xs text-cmyk-gray-400">View and organize category directories for income and expense transactions.</p>
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
            
            {/* Expense Categories Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-cmyk-magenta mb-3">Expense Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.filter(c => c.type === 'expense').map((cat) => (
                  <div key={cat.id} className="glass-card-dark p-4 rounded-2xl border border-cmyk-gray-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-cmyk-gray-900 border border-cmyk-gray-850 rounded-xl shrink-0">
                        {renderIcon(cat.icon, cat.color)}
                      </div>
                      <span className="text-xs font-bold text-white truncate">{cat.name}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1 rounded text-cmyk-gray-500 hover:text-cmyk-magenta hover:bg-cmyk-magenta/10 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Income Categories Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-500 mb-3">Income Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.filter(c => c.type === 'income').map((cat) => (
                  <div key={cat.id} className="glass-card-dark p-4 rounded-2xl border border-cmyk-gray-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-cmyk-gray-900 border border-cmyk-gray-850 rounded-xl shrink-0">
                        {renderIcon(cat.icon, cat.color)}
                      </div>
                      <span className="text-xs font-bold text-white truncate">{cat.name}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1 rounded text-cmyk-gray-500 hover:text-cmyk-magenta hover:bg-cmyk-magenta/10 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Creation form (Only for admins) */}
      {isAdmin ? (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 shrink-0 h-fit space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gradient-cyan-magenta flex items-center gap-2">
            <Plus size={16} />
            Add New Category
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Subscriptions"
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Type</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            {/* Colors picker */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-2.5">Category Color</label>
              <div className="grid grid-cols-9 gap-1.5 mb-2.5">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-lg transition-transform ${
                      color === c ? 'scale-110 ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-8 p-0 border-0 bg-transparent rounded-lg cursor-pointer"
              />
            </div>

            {/* Icon picker grid */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-2.5">Category Icon</label>
              <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 border border-cmyk-gray-800 bg-cmyk-gray-950 rounded-xl no-scrollbar">
                {availableIcons.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setSelectedIcon(ico)}
                    className={`p-2 rounded-lg flex items-center justify-center border transition-all ${
                      selectedIcon === ico
                        ? 'bg-cmyk-cyan/15 border-cmyk-cyan text-cmyk-cyan shadow-cyan-glow'
                        : 'bg-cmyk-gray-900 border-transparent text-cmyk-gray-400 hover:text-white'
                    }`}
                    title={ico}
                  >
                    {renderIcon(ico, selectedIcon === ico ? '#00C2FF' : '#71717A')}
                  </button>
                ))}
              </div>
            </div>

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
                  <span>Create Category</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 text-center text-xs text-cmyk-gray-500 font-semibold h-fit">
          🔒 Adding categories is restricted to Admins.
        </div>
      )}

    </div>
  );
};
export default Categories;
