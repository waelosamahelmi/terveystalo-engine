// ============================================================================
// SUUN TERVEYSTALO - Auth Context
// Centralized authentication state - NO listeners that cause re-renders
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from './supabase';
import { User } from '../types';

// ============================================================================
// AUTH CONTEXT TYPE
// ============================================================================
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

// ============================================================================
// HOOK
// ============================================================================
export const useAuth = () => useContext(AuthContext);

// ============================================================================
// AUTH PROVIDER - Simple, no listeners
// ============================================================================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Load user data from database
  const loadUser = useCallback(async (sessionUserId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUserId)
        .single();

      if (error) {
        console.error('Error loading user:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }, []);

  // Refresh user data WITHOUT setting loading state
  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await loadUser(session.user.id);
        if (userData) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, [loadUser]);

  // Sign out - clears everything and redirects
  const signOut = useCallback(async () => {
    try {
      setUser(null);
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Initialize ONCE on mount - NO listeners, NO re-renders on window focus
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userData = await loadUser(session.user.id);
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      }
      
      setLoading(false);
    };

    initAuth();
  }, [loadUser]);

  // Silent background token refresh - NO state changes, NO re-renders
  useEffect(() => {
    if (!user) return;

    const refreshToken = async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // Silent fail
      }
    };

    const interval = setInterval(refreshToken, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
