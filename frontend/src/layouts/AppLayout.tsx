import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  LayoutDashboard,
  PlusCircle,
  ArrowUpRight,
  History,
  Grid,
  FileText,
  PiggyBank,
  Users,
  Settings,
  Bell,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Theme state (Dark Mode by default)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Notification States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Sidebar state for mobile drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Trigger theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch notifications and process recurring expenses on mount
  useEffect(() => {
    if (!user) return;
    
    // Auto-process recurring bills in background
    api.post('/api/recurring/process').catch(err => console.error(err));
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/api/notifications');
      setNotifications(data);
      const countData = await api.get('/api/notifications/unread-count');
      setUnreadCount(countData.unread_count);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Expenses', path: '/add-expense', icon: PlusCircle, isQuickAdd: true },
    { label: 'Income', path: '/add-income', icon: ArrowUpRight, isQuickAdd: true },
    { label: 'History', path: '/transactions', icon: History },
    { label: 'Categories', path: '/categories', icon: Grid },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Budgets', path: '/budgets', icon: PiggyBank },
    { label: 'Family', path: '/family', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cmyk-gray-950 dark:bg-cmyk-black light:bg-cmyk-gray-50 text-cmyk-gray-100 dark:text-cmyk-gray-100 light:text-cmyk-gray-900 font-sans">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 glass-card-dark border-r border-cmyk-gray-800 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-cmyk-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cmyk-cyan to-cmyk-magenta flex items-center justify-center font-bold text-white shadow-cyan-glow">
            F
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-gradient-cyan-magenta">FamTracker</h1>
            <span className="text-xs text-cmyk-gray-500">Family Account</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  active
                    ? 'bg-gradient-to-r from-cmyk-cyan/20 to-cmyk-magenta/10 text-cmyk-cyan border-l-4 border-cmyk-cyan shadow-cyan-glow'
                    : 'text-cmyk-gray-400 hover:text-cmyk-gray-100 hover:bg-cmyk-gray-800/40'
                }`}
              >
                <Icon size={20} className={active ? 'text-cmyk-cyan' : ''} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile */}
        <div className="p-4 border-t border-cmyk-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-cmyk-cyan/50 object-cover"
            />
            <div className="max-w-[120px] truncate">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-cmyk-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-cmyk-gray-400 hover:text-cmyk-magenta rounded-lg hover:bg-cmyk-gray-900 transition-colors"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN APP SHELL */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 glass-panel border-b border-cmyk-gray-800/30 md:border-b-0 shrink-0 z-10">
          {/* Mobile hamburger & title */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cmyk-cyan to-cmyk-magenta flex items-center justify-center font-bold text-white">
              F
            </div>
            <h1 className="font-bold text-lg text-gradient-cyan-magenta">FamTracker</h1>
          </div>

          <div className="hidden md:block">
            <h2 className="text-xl font-bold capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace('-', ' ')}
            </h2>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-cmyk-gray-950/50 dark:bg-cmyk-darkCard border border-cmyk-gray-800 text-cmyk-gray-400 hover:text-cmyk-yellow transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl bg-cmyk-gray-950/50 dark:bg-cmyk-darkCard border border-cmyk-gray-800 text-cmyk-gray-400 hover:text-cmyk-cyan transition-all relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cmyk-magenta text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-magenta-glow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-3 w-80 glass-card-dark rounded-2xl shadow-glass-dark border border-cmyk-gray-800 z-30 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-cmyk-gray-800">
                      <h4 className="font-bold text-sm">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[11px] font-semibold text-cmyk-cyan hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-cmyk-gray-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-3 border-b border-cmyk-gray-900 text-xs transition-colors cursor-pointer hover:bg-cmyk-gray-900/60 ${
                              !n.read_status ? 'border-l-2 border-cmyk-magenta bg-cmyk-magenta/5' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span className="font-semibold text-cmyk-cyan">{n.title}</span>
                              <span className="text-[10px] text-cmyk-gray-500 shrink-0">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-cmyk-gray-400 leading-tight">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Log Out Icon */}
            <button
              onClick={logout}
              className="p-2 md:hidden rounded-xl bg-cmyk-gray-950/50 dark:bg-cmyk-darkCard border border-cmyk-gray-800 text-cmyk-gray-400 hover:text-cmyk-magenta transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Content Pane */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:py-8 pb-24 md:pb-8 bg-cmyk-gray-950 dark:bg-cmyk-darkBg light:bg-cmyk-gray-50">
          <Outlet />
        </main>
        
        {/* 3. MOBILE BOTTOM NAV BAR */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 md:hidden glass-panel border-t border-cmyk-gray-800/40 bg-cmyk-gray-950/80 dark:bg-cmyk-black/90 light:bg-white/95 flex items-center justify-around z-20 safe-bottom">
          {navigationItems.filter(item => !item.isQuickAdd).slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                  active ? 'text-cmyk-cyan scale-105' : 'text-cmyk-gray-500 hover:text-cmyk-gray-200'
                }`}
              >
                <Icon size={20} className={active ? 'drop-shadow-cyan-glow' : ''} />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Central Mobile Floating Quick Action Button */}
          <div className="relative -top-3">
            <button
              onClick={() => navigate('/add-expense')}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-cmyk-cyan via-cmyk-magenta to-cmyk-yellow p-1 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-cmyk-black flex items-center justify-center text-white">
                <PlusCircle size={24} className="text-cmyk-cyan" />
              </div>
            </button>
          </div>

          {navigationItems.filter(item => !item.isQuickAdd).slice(4, 7).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                  active ? 'text-cmyk-cyan scale-105' : 'text-cmyk-gray-500 hover:text-cmyk-gray-200'
                }`}
              >
                <Icon size={20} className={active ? 'drop-shadow-cyan-glow' : ''} />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </div>
  );
};
export default AppLayout;
