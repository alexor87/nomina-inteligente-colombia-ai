
import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/hooks/useAuthData';
import { useAuthActions } from '@/hooks/useAuthActions';
import { AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    profile,
    currentCompany,
    userCompanies,
    loading,
    isSuperAdmin,
    setUser,
    initializeUserData,
    clearAuthState,
    refreshUserData,
    setCurrentCompany
  } = useAuthData();

  const {
    signIn,
    signOut,
    signUp,
    hasRole,
    canAccessModule,
    switchCompany
  } = useAuthActions({
    userCompanies,
    isSuperAdmin,
    currentCompany,
    setCurrentCompany
  });

  useEffect(() => {
    console.log('🚀 AuthProvider mounted, setting up auth listener...');
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      if (!mounted) {
        console.log('⚠️ Component unmounted, ignoring auth state change');
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await initializeUserData(session.user);
      } else {
        clearAuthState();
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) {
        console.log('⚠️ Component unmounted, ignoring session check');
        return;
      }
      
      if (error) {
        console.error('Error getting session:', error);
        clearAuthState();
        return;
      }

      if (session?.user) {
        console.log('🔄 Found existing session for:', session.user.email);
        setUser(session.user);
        initializeUserData(session.user);
      } else {
        console.log('🔄 No existing session found, setting loading to false');
        clearAuthState();
      }
    });

    return () => {
      console.log('🧹 AuthProvider cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    currentCompany,
    loading,
    isAuthenticated: !!user,
    isSuperAdmin,
    signIn,
    signOut,
    signUp,
    hasRole,
    canAccessModule,
    switchCompany,
    refreshUserData,
    userCompanies
  };

  return (
    <AuthContext.Provider value={value}>
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
