import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type AuthTokens } from '../api/auth';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    full_name: string,
    password: string,
    role: 'student' | 'teacher'
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storeTokens(tokens: AuthTokens) {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  localStorage.setItem('user_role', tokens.role);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_role');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify stored token by calling /me
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((data: any) => {
        setUser({
          id: data.id || data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
        });
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password });
    storeTokens(tokens);
    setUser({
      id: tokens.user_id,
      email: tokens.email,
      full_name: tokens.full_name,
      role: tokens.role,
    });
  }, []);

  const register = useCallback(
    async (
      email: string,
      full_name: string,
      password: string,
      role: 'student' | 'teacher'
    ) => {
      const tokens = await authApi.register({ email, full_name, password, role });
      storeTokens(tokens);
      setUser({
        id: tokens.user_id,
        email: tokens.email,
        full_name: tokens.full_name,
        role: tokens.role,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
