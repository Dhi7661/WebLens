import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, setAccessToken } from '../../lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session: attempt silent refresh
  useEffect(() => {
    async function initSession() {
      try {
        const refreshRes = await apiClient<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });

        if (refreshRes.success && refreshRes.data?.accessToken) {
          setAccessToken(refreshRes.data.accessToken);
          const meRes = await apiClient<{ user: UserProfile }>('/me');
          if (meRes.success && meRes.data?.user) {
            setUser(meRes.data.user);
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await apiClient<{ user: UserProfile; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Login failed. Please check credentials.',
    };
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    const res = await apiClient<{ user: UserProfile; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Registration failed. Email may already be in use.',
    };
  };

  const logout = async () => {
    await apiClient('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
