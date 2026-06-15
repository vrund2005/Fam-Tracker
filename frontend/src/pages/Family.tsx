import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Users, Plus, Trash2, CheckCircle, ShieldAlert, Award, Heart, Mail, Lock } from 'lucide-react';

interface Contributor {
  user_id: string;
  name: string;
  role: 'admin' | 'member';
  relation: string;
  avatar_url?: string;
  total_spent: number;
}

export const Family: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  const [members, setMembers] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [relation, setRelation] = useState<'Father'|'Mother'|'Son'|'Daughter'|'Grandfather'|'Grandmother'|'Spouse'|'Other'>('Father');

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/users/stats/contributions');
      setMembers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch family members');
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
      await api.post('/api/users', {
        name,
        email,
        password,
        role,
        relation
      });

      setSuccess('Family member created successfully!');
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRole('member');
      setRelation('Father');
      
      // Reload list
      await fetchFamilyMembers();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to add family member');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      setError("You cannot delete your own active admin account.");
      return;
    }

    if (!window.confirm('Are you sure you want to remove this family member? All their transactions will be marked as paid by "Unknown" or deleted.')) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/users/${userId}`);
      setSuccess('Family member removed successfully!');
      await fetchFamilyMembers();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete family member');
    }
  };

  const totalSpentAll = members.reduce((sum, m) => sum + m.total_spent, 0);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Contributors / Roster Grid */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Family Members</h2>
          <p className="text-xs text-cmyk-gray-400">Manage family directories and review contributions to shared expenses.</p>
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

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cmyk-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            
            {members.map((m, idx) => {
              const pct = totalSpentAll > 0 ? (m.total_spent / totalSpentAll) * 100 : 0;
              const isSelf = m.user_id === currentUser?.id;
              
              return (
                <div key={m.user_id} className="glass-card-dark p-5 rounded-3xl border border-cmyk-gray-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left profile */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-cmyk-gray-800"
                      />
                      {idx === 0 && m.total_spent > 0 && (
                        <span className="absolute -top-1 -right-1 text-base" title="Top Contributor">👑</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        {m.name}
                        {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cmyk-cyan/10 text-cmyk-cyan font-semibold">Self</span>}
                      </h4>
                      <p className="text-[10px] text-cmyk-gray-500 font-semibold">{m.relation} • Role: {m.role}</p>
                    </div>
                  </div>

                  {/* Middle progress spent breakdown */}
                  <div className="flex-1 max-w-xs md:mx-6 space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-cmyk-gray-400">
                      <span>Expenses Logged</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-cmyk-gray-950 rounded-full h-2 overflow-hidden border border-cmyk-gray-900">
                      <div
                        className="h-full bg-cmyk-cyan rounded-full shadow-cyan-glow"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Right numbers + delete */}
                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right md:text-right">
                      <p className="text-[9px] font-bold text-cmyk-gray-500 uppercase">Paid Out</p>
                      <p className="text-base font-extrabold text-cmyk-cyan">₹{m.total_spent.toLocaleString()}</p>
                    </div>

                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => handleDelete(m.user_id)}
                        className="p-2 text-cmyk-gray-500 hover:text-cmyk-magenta hover:bg-cmyk-magenta/10 rounded-xl transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Roster Registration Form (Admin only) */}
      {isAdmin ? (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 shrink-0 h-fit space-y-4 shadow-glass-dark">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gradient-cyan-magenta flex items-center gap-2">
            <Plus size={16} />
            Add Family Member
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@family.com"
                  className="w-full pl-8 pr-4 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-4 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Relation */}
              <div>
                <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Relation</label>
                <div className="relative">
                  <Heart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmyk-gray-500" />
                  <select
                    value={relation}
                    onChange={(e: any) => setRelation(e.target.value)}
                    className="w-full pl-8 pr-2 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
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

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-cmyk-gray-400 mb-1">Access Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-cmyk-gray-900 border border-cmyk-gray-800 rounded-xl text-xs focus:border-cmyk-cyan focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
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
                  <span>Register Family User</span>
                </>
              )}
            </button>

          </form>
        </div>
      ) : (
        <div className="glass-card-dark p-6 rounded-3xl border border-cmyk-gray-800 text-center text-xs text-cmyk-gray-500 font-semibold h-fit">
          🔒 Creating family members is restricted to Admins.
        </div>
      )}

    </div>
  );
};
export default Family;
