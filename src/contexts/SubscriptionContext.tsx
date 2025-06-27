
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface SubscriptionFeatures {
  email_support: boolean;
  phone_support: boolean;
  custom_reports: boolean;
}

interface Subscription {
  id: string;
  company_id: string;
  plan_type: 'basico' | 'profesional' | 'empresarial';
  status: 'activa' | 'suspendida' | 'cancelada' | 'trial';
  trial_ends_at: string | null;
  max_employees: number;
  max_payrolls_per_month: number;
  features: SubscriptionFeatures;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  canAddEmployees: (currentCount: number) => boolean;
  canProcessPayroll: (currentCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
  isTrialExpired: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

// Helper function to safely convert features from Supabase Json type
const convertFeatures = (features: any): SubscriptionFeatures => {
  const defaultFeatures: SubscriptionFeatures = {
    email_support: true,
    phone_support: false,
    custom_reports: false
  };

  if (!features || typeof features !== 'object') {
    return defaultFeatures;
  }

  return {
    email_support: Boolean(features.email_support ?? defaultFeatures.email_support),
    phone_support: Boolean(features.phone_support ?? defaultFeatures.phone_support),
    custom_reports: Boolean(features.custom_reports ?? defaultFeatures.custom_reports)
  };
};

// Helper function to create fallback subscription
const createFallbackSubscription = (companyId: string, reason: string = 'fallback'): Subscription => {
  console.log(`🔧 Creating ${reason} subscription for company:`, companyId);
  
  return {
    id: `${reason}-${Date.now()}`,
    company_id: companyId,
    plan_type: 'profesional',
    status: 'activa',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_employees: 25,
    max_payrolls_per_month: 12,
    features: {
      email_support: true,
      phone_support: true,
      custom_reports: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user, profile } = useAuth();

  // Clear cache and reset state
  const clearCache = () => {
    console.log('🧹 Clearing subscription cache...');
    
    // Clear localStorage related to subscriptions
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('subscription') || key.includes('company') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
      key.includes('subscription') || key.includes('company') || key.includes('supabase')
    );
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    console.log('✅ Cache cleared successfully');
  };

  const loadSubscriptionWithRetry = async (maxRetries: number = 3): Promise<void> => {
    if (!user || !profile?.company_id) {
      console.log('🚫 No user or company_id available for subscription');
      setLoading(false);
      return;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Loading subscription attempt ${attempt}/${maxRetries} for company:`, profile.company_id);
        
        // Always use maybeSingle() to avoid PGRST116 errors
        const { data, error: queryError } = await supabase
          .from('company_subscriptions')
          .select('*')
          .eq('company_id', profile.company_id)
          .maybeSingle();

        if (queryError) {
          console.error(`❌ Query error on attempt ${attempt}:`, queryError);
          
          if (attempt === maxRetries) {
            // Final attempt failed, use fallback
            const fallbackSubscription = createFallbackSubscription(profile.company_id, 'error-fallback');
            setSubscription(fallbackSubscription);
            setError(`Error de consulta después de ${maxRetries} intentos. Usando configuración por defecto.`);
            return;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (!data) {
          console.warn(`⚠️ No subscription found on attempt ${attempt}, creating default subscription`);
          
          // Create default subscription
          const defaultSubscription = {
            company_id: profile.company_id,
            plan_type: 'profesional' as const,
            status: 'activa' as const,
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            max_employees: 25,
            max_payrolls_per_month: 12,
            features: {
              email_support: true,
              phone_support: true,
              custom_reports: true
            }
          };

          const { data: newSubscription, error: createError } = await supabase
            .from('company_subscriptions')
            .insert(defaultSubscription)
            .select()
            .maybeSingle();

          if (createError) {
            console.error(`❌ Error creating subscription on attempt ${attempt}:`, createError);
            
            if (attempt === maxRetries) {
              // Final attempt failed, use fallback
              const fallbackSubscription = createFallbackSubscription(profile.company_id, 'create-fallback');
              setSubscription(fallbackSubscription);
              setError(`Error al crear suscripción después de ${maxRetries} intentos. Usando configuración temporal.`);
              return;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          if (newSubscription) {
            console.log(`✅ Default subscription created on attempt ${attempt}:`, newSubscription);
            const transformedSubscription: Subscription = {
              id: newSubscription.id,
              company_id: newSubscription.company_id,
              plan_type: newSubscription.plan_type as 'basico' | 'profesional' | 'empresarial',
              status: newSubscription.status as 'activa' | 'suspendida' | 'cancelada' | 'trial',
              trial_ends_at: newSubscription.trial_ends_at,
              max_employees: newSubscription.max_employees,
              max_payrolls_per_month: newSubscription.max_payrolls_per_month,
              features: convertFeatures(newSubscription.features),
              created_at: newSubscription.created_at,
              updated_at: newSubscription.updated_at
            };
            setSubscription(transformedSubscription);
            setError(null);
            return;
          }
        } else {
          console.log(`✅ Subscription loaded successfully on attempt ${attempt}:`, data);
          const transformedSubscription: Subscription = {
            id: data.id,
            company_id: data.company_id,
            plan_type: data.plan_type as 'basico' | 'profesional' | 'empresarial',
            status: data.status as 'activa' | 'suspendida' | 'cancelada' | 'trial',
            trial_ends_at: data.trial_ends_at,
            max_employees: data.max_employees,
            max_payrolls_per_month: data.max_payrolls_per_month,
            features: convertFeatures(data.features),
            created_at: data.created_at,
            updated_at: data.updated_at
          };
          setSubscription(transformedSubscription);
          setError(null);
          return;
        }
      } catch (error: any) {
        console.error(`❌ Unexpected error on attempt ${attempt}:`, error);
        
        if (attempt === maxRetries) {
          // Final attempt failed, use fallback
          const fallbackSubscription = createFallbackSubscription(profile.company_id, 'exception-fallback');
          setSubscription(fallbackSubscription);
          setError(`Error inesperado después de ${maxRetries} intentos: ${error.message}. Usando configuración por defecto.`);
          return;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear cache on first load or if we've had errors
      if (retryCount > 0) {
        clearCache();
      }
      
      await loadSubscriptionWithRetry(3);
      setRetryCount(0);
    } catch (error: any) {
      console.error('❌ Fatal error in loadSubscription:', error);
      
      if (profile?.company_id) {
        const fallbackSubscription = createFallbackSubscription(profile.company_id, 'fatal-fallback');
        setSubscription(fallbackSubscription);
        setError(`Error fatal: ${error.message}. Usando configuración por defecto.`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load if we have both user and company_id
    if (user && profile?.company_id && !subscription) {
      console.log('🚀 Starting subscription load for:', { user: user.id, company: profile.company_id });
      loadSubscription();
    } else if (!user || !profile?.company_id) {
      console.log('⏳ Waiting for auth context to be ready...');
      setLoading(false);
    }
  }, [user, profile?.company_id]);

  // Auto-retry mechanism for failed loads
  useEffect(() => {
    if (error && retryCount < 2 && profile?.company_id) {
      console.log(`🔄 Auto-retry ${retryCount + 1}/2 in 5 seconds...`);
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadSubscription();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, profile?.company_id]);

  const hasFeature = (feature: keyof SubscriptionFeatures): boolean => {
    if (!subscription) {
      console.warn('⚠️ No subscription available for feature check:', feature);
      return false;
    }
    return subscription.features[feature] || false;
  };

  const canAddEmployees = (currentCount: number): boolean => {
    if (!subscription) {
      console.warn('⚠️ No subscription available for employee limit check');
      return true; // Allow if no subscription data to avoid blocking
    }
    return currentCount < subscription.max_employees;
  };

  const canProcessPayroll = (currentCount: number): boolean => {
    if (!subscription) {
      console.warn('⚠️ No subscription available for payroll limit check');
      return true; // Allow if no subscription data to avoid blocking
    }
    return currentCount < subscription.max_payrolls_per_month;
  };

  const refreshSubscription = async () => {
    console.log('🔄 Manual subscription refresh requested');
    setRetryCount(0);
    await loadSubscription();
  };

  const isTrialExpired = (): boolean => {
    if (!subscription || !subscription.trial_ends_at) return false;
    return new Date() > new Date(subscription.trial_ends_at);
  };

  // Validate subscription state
  const isSubscriptionValid = subscription && subscription.company_id && subscription.id;

  const value: SubscriptionContextType = {
    subscription: isSubscriptionValid ? subscription : null,
    loading,
    error,
    hasFeature,
    canAddEmployees,
    canProcessPayroll,
    refreshSubscription,
    isTrialExpired: isSubscriptionValid ? isTrialExpired() : false
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
