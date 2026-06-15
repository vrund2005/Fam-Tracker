import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, authStorage } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatar_url?: string;
  family_member?: {
    relation: string;
    joined_date: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  isFirstBoot: boolean;
  setIsFirstBoot: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authStorage.getUser());
  const [loading, setLoading] = useState(true);
  const [isFirstBoot, setIsFirstBoot] = useState(false);

  const refreshUser = async () => {
    try {
      const userData = await api.get('/api/auth/me');
      setUser(userData);
      authStorage.setUser(userData);
      setIsFirstBoot(false);
    } catch (error) {
      console.error('Failed to sync profile', error);
      // If unauthorized, clear session
      logout();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = authStorage.getAccessToken();
      if (token) {
        await refreshUser();
      } else {
        try {
          const res = await api.get('/api/auth/first-boot', { skipAuth: true });
          setIsFirstBoot(res.is_first_boot);
        } catch (err) {
          setIsFirstBoot(false);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen to global logout events from API client
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login/json', { email, password }, { skipAuth: true });
      authStorage.setAccessToken(data.access_token);
      authStorage.setRefreshToken(data.refresh_token);
      
      const userData = await api.get('/api/auth/me');
      setUser(userData);
      authStorage.setUser(userData);
      setIsFirstBoot(false);
      setLoading(false);
      return userData;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
    setIsFirstBoot(false);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    authStorage.setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser, isFirstBoot, setIsFirstBoot }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
