import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Settings as SettingsIcon, CheckCircle, ShieldAlert, User, Mail, Shield, Wallet, Download, CloudUpload } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser, logout } = useAuth();

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [relation, setRelation] = useState<string>(user?.family_member?.relation || 'Other');
  
  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Currency Select (default INR)
  const [currency, setCurrency] = useState('INR');

  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await api.put('/api/users/profile/update', {
        name,
        email,
        avatar_url: avatarUrl || null,
        relation
      });

      updateUser(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.put('/api/users/profile/password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      setSuccess('Password updated successfully! Please re-login.');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Client-side full ledger backup downloader
  const handleBackup = async () => {
    setError('');
    setSuccess('');
    try {
      // Query everything
      const today = new Date();
      const m = today.getMonth() + 1;
      const y = today.getFullYear();
      
      const categories = await api.get('/api/categories');
      const expenses = await api.get(`/api/expenses?limit=1000`);
      const income = await api.get(`/api/income?limit=1000`);
      const recurring = await api.get('/api/recurring');
      const users = await api.get('/api/users');

      const backupObj = {
        backupDate: new Date().toISOString(),
        version: '1.0.0',
        categories,
        expenses: expenses.items,
        income: income.items,
        recurring,
        users: users.map((u: any) => ({ name: u.name, email: u.email, role: u.role }))
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FamTracker_Backup_${today.toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Database backup generated and downloaded!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Backup compilation failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">System Settings</h2>
        <p className="text-xs text-cmyk-gray-400">Configure your profile details, edit passwords, adjust currencies, or download backups.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-cmyk-cyan/10 border border-cmyk-cyan/30 text-cmyk-cyan text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta text-xs font-semibold flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. PROFILE DETAILS CARD */}
      <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 flex items-center gap-2">
          <User size={16} className="text-cmyk-cyan" />
          Update Profile Information
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Relation Relation</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none capitalize"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Grandfather">Grandfather</option>
                <option value="Grandmother">Grandmother</option>
                <option value="Spouse">Spouse</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-cmyk-cyan text-cmyk-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:shadow-cyan-glow transition-all"
          >
            Save Profile Changes
          </button>
        </form>
      </div>

      {/* 2. CHANGE PASSWORD CARD */}
      <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 flex items-center gap-2">
          <Shield size={16} className="text-cmyk-magenta" />
          Update Security Settings
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Old Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-cmyk-magenta text-white font-extrabold text-xs tracking-wider uppercase rounded-xl hover:shadow-magenta-glow transition-all"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* 3. LOCALE & CURRENCY CONFIGURATION */}
      <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 flex items-center gap-2">
          <Wallet size={16} className="text-cmyk-yellow" />
          Locale and Currency Format
        </h3>
        
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">System Base Currency</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('INR')}
              className="px-4 py-2.5 rounded-xl border border-cmyk-cyan bg-cmyk-cyan/10 text-cmyk-cyan font-bold text-xs shadow-cyan-glow transition-all"
            >
              INR (₹) — Indian Rupee (Default)
            </button>
            
            <button
              disabled
              className="px-4 py-2.5 rounded-xl border border-cmyk-gray-800 bg-cmyk-gray-900 text-cmyk-gray-500 font-bold text-xs cursor-not-allowed"
            >
              USD ($)
            </button>
            <button
              disabled
              className="px-4 py-2.5 rounded-xl border border-cmyk-gray-800 bg-cmyk-gray-900 text-cmyk-gray-500 font-bold text-xs cursor-not-allowed"
            >
              EUR (€)
            </button>
          </div>
          <p className="text-[10px] text-cmyk-gray-500 mt-2 font-medium">
            💡 This setup defaults formatting to INR standard Lakh/Crore systems (e.g. ₹1,50,000.00). Changing currency formats is locked for this version.
          </p>
        </div>
      </div>

      {/* 4. DATA BACKUP AND MAINTENANCE TOOLS */}
      <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 flex items-center gap-2">
          <Download size={16} className="text-cmyk-cyan" />
          Database Backup and Export
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-white">Full JSON State Dump</p>
            <p className="text-[10px] text-cmyk-gray-500 leading-normal">
              Downloads a full copy of all category tables, logged incomes, expenses, splits, and recurring entries.
            </p>
          </div>
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cmyk-cyan to-cmyk-magenta hover:shadow-cyan-glow text-white font-bold text-xs transition-all w-full sm:w-auto justify-center"
          >
            <Download size={14} />
            <span>Download Backup (.json)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
export default Settings;
