import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api-client';
import { User, Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { prefetchEssentialUserData } from './useAppQueries';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'artisan' | 'buyer' | 'admin' | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Profile Query managed by TanStack Query
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const userRole = user.user_metadata?.['role'] || 'artisan';
      try {
        const res = await api.get<any>('/profile/me');
        if (res && res.profile) {
          const profile = {
            ...res.profile,
            role: res.role || userRole,
          };
          // Prefetch essential app data for this user/role in parallel
          prefetchEssentialUserData(queryClient, user, profile.role);
          return profile;
        } else {
          // Fallback to /artisans/me
          const artisanProfile = await api.get<any>('/artisans/me');
          const profile = {
            ...artisanProfile,
            role: userRole,
          };
          prefetchEssentialUserData(queryClient, user, profile.role);
          return profile;
        }
      } catch (e) {
        console.error('Failed to fetch user profile context:', e);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes fresh
    gcTime: 1000 * 60 * 60, // 1 hour memory
  });

  const profile = profileData || null;
  const role = (profileData?.role as 'artisan' | 'buyer' | 'admin') || (user?.user_metadata?.['role'] as 'artisan' | 'buyer' | 'admin') || null;
  const loading = sessionLoading || (!!user && isProfileLoading);

  const refreshProfile = async () => {
    if (user) {
      await refetch();
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setSessionLoading(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setSessionLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setSessionLoading(true);
    await supabase.auth.signOut();
    // Clear all TanStack Query cache on logout to ensure user privacy and fresh state
    queryClient.clear();
    setUser(null);
    setSession(null);
    setSessionLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
