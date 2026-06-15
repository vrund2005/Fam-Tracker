import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Sparkles, Mail, Lock, User, Heart, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isFirstBoot, setIsFirstBoot } = useAuth();
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<'Father'|'Mother'|'Son'|'Daughter'|'Grandfather'|'Grandmother'|'Spouse'|'Other'>('Father');
  
  // Feedback
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirstBoot || isRegistering) {
        // Register first Admin
        await api.post('/api/auth/register', {
          name,
          email,
          password,
          role: 'admin',
          relation
        }, { skipAuth: true });
        
        // Auto-login
        await login(email, password);
      } else {
        // Normal login
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setError('');
    setLoading(true);
    try {
      await login(quickEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cmyk-gray-950 dark:bg-cmyk-black p-4 relative overflow-hidden">
      
      {/* Dynamic colorful blobs background */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cmyk-cyan/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cmyk-magenta/10 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md glass-card-dark p-8 rounded-3xl relative border border-cmyk-gray-800 shadow-glass-dark">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cmyk-cyan via-cmyk-magenta to-cmyk-yellow flex items-center justify-center font-extrabold text-white text-2xl shadow-cyan-glow mb-3">
            F
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gradient-cmy">FamTracker</h2>
          <p className="text-cmyk-gray-400 text-xs mt-1 text-center font-medium">
            {isFirstBoot 
              ? "👋 Welcome! Complete the form to create your family admin account."
              : "Private family budget, expense logging & insights."
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-cmyk-magenta/10 border border-cmyk-magenta/30 text-cmyk-magenta text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {(isFirstBoot || isRegistering) && (
            <>
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Your Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full pl-10 pr-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Relation */}
              <div>
                <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Family Relation</label>
                <div className="relative">
                  <Heart size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                  <select
                    value={relation}
                    onChange={(e: any) => setRelation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all capitalize"
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
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dad@family.com"
                className="w-full pl-10 pr-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-sm focus:border-cmyk-cyan focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cmyk-cyan to-cmyk-magenta hover:shadow-cyan-glow text-white font-bold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles size={16} />
                <span>{isFirstBoot || isRegistering ? 'Create Family Admin Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Accounts list (Only visible if not first setup and not custom registering) */}
        {!isFirstBoot && !isRegistering && (
          <div className="mt-8 border-t border-cmyk-gray-800 pt-6">
            <h4 className="text-center text-xs font-semibold text-cmyk-gray-500 mb-4 uppercase tracking-wider">
              Quick Accounts Selector
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickLogin('dad@family.com')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-cmyk-gray-900/60 border border-cmyk-gray-800/80 hover:border-cmyk-cyan hover:bg-cmyk-cyan/5 text-left transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-cmyk-cyan">Dad (Vikram)</p>
                  <p className="text-[10px] text-cmyk-gray-500">dad@family.com • Admin</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cmyk-cyan/10 text-cmyk-cyan font-bold uppercase">
                  Login
                </span>
              </button>

              <button
                onClick={() => handleQuickLogin('mom@family.com')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-cmyk-gray-900/60 border border-cmyk-gray-800/80 hover:border-cmyk-magenta hover:bg-cmyk-magenta/5 text-left transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-cmyk-magenta">Mom (Anjali)</p>
                  <p className="text-[10px] text-cmyk-gray-500">mom@family.com • Member</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cmyk-magenta/10 text-cmyk-magenta font-bold uppercase">
                  Login
                </span>
              </button>

              <button
                onClick={() => handleQuickLogin('son@family.com')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-cmyk-gray-900/60 border border-cmyk-gray-800/80 hover:border-cmyk-yellow hover:bg-cmyk-yellow/5 text-left transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-cmyk-yellow">Son (Rahul)</p>
                  <p className="text-[10px] text-cmyk-gray-500">son@family.com • Member</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cmyk-yellow/10 text-cmyk-yellow font-bold uppercase">
                  Login
                </span>
              </button>
            </div>
            
            <p className="text-center text-[10px] text-cmyk-gray-500 mt-4">
              Password for all seeded accounts is <code className="text-cmyk-cyan">password123</code>
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
};
export default Login;
