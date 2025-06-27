
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

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const loadSubscription = async () => {
    if (!user || !profile?.company_id) {
      console.log('🚫 No user or company_id available for subscription');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading subscription for company:', profile.company_id);
      
      const { data, error } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error) {
        console.warn('⚠️ Subscription not found, creating default subscription:', error.message);
        
        // Create a default subscription if none exists
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
          .single();

        if (createError) {
          console.error('❌ Error creating default subscription:', createError);
          setError('Error al crear suscripción por defecto');
          // Continue with a fallback subscription to not block the app
          setSubscription({
            id: 'temp',
            ...defaultSubscription,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          console.log('✅ Default subscription created:', newSubscription);
          // Transform the data to match our interface
          const transformedSubscription: Subscription = {
            id: newSubscription.id,
            company_id: newSubscription.company_id,
            plan_type: newSubscription.plan_type as 'basico' | 'profesional' | 'empresarial',
            status: newSubscription.status as 'activa' | 'suspendida' | 'cancelada' | 'trial',
            trial_ends_at: newSubscription.trial_ends_at,
            max_employees: newSubscription.max_employees,
            max_payrolls_per_month: newSubscription.max_payrolls_per_month,
            features: newSubscription.features as SubscriptionFeatures,
            created_at: newSubscription.created_at,
            updated_at: newSubscription.updated_at
          };
          setSubscription(transformedSubscription);
        }
      } else {
        console.log('✅ Subscription loaded:', data);
        // Transform the data to match our interface
        const transformedSubscription: Subscription = {
          id: data.id,
          company_id: data.company_id,
          plan_type: data.plan_type as 'basico' | 'profesional' | 'empresarial',
          status: data.status as 'activa' | 'suspendida' | 'cancelada' | 'trial',
          trial_ends_at: data.trial_ends_at,
          max_employees: data.max_employees,
          max_payrolls_per_month: data.max_payrolls_per_month,
          features: data.features as SubscriptionFeatures,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        setSubscription(transformedSubscription);
      }
    } catch (error: any) {
      console.error('❌ Error loading subscription:', error);
      setError(error.message || 'Error al cargar suscripción');
      
      // Provide a fallback subscription to not block the app
      setSubscription({
        id: 'fallback',
        company_id: profile.company_id!,
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
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user, profile?.company_id]);

  const hasFeature = (feature: keyof SubscriptionFeatures): boolean => {
    if (!subscription) return false;
    return subscription.features[feature] || false;
  };

  const canAddEmployees = (currentCount: number): boolean => {
    if (!subscription) return true; // Allow if no subscription data
    return currentCount < subscription.max_employees;
  };

  const canProcessPayroll = (currentCount: number): boolean => {
    if (!subscription) return true; // Allow if no subscription data
    return currentCount < subscription.max_payrolls_per_month;
  };

  const refreshSubscription = async () => {
    await loadSubscription();
  };

  const isTrialExpired = (): boolean => {
    if (!subscription || !subscription.trial_ends_at) return false;
    return new Date() > new Date(subscription.trial_ends_at);
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    hasFeature,
    canAddEmployees,
    canProcessPayroll,
    refreshSubscription,
    isTrialExpired: isTrialExpired()
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
