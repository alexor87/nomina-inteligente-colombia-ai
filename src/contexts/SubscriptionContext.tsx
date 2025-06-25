
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface CompanySubscription {
  id: string;
  company_id: string;
  plan_type: 'basico' | 'profesional' | 'empresarial';
  status: 'activa' | 'suspendida' | 'cancelada' | 'trial';
  trial_ends_at?: string;
  max_employees: number;
  max_payrolls_per_month: number;
  features: {
    email_support: boolean;
    phone_support: boolean;
    custom_reports: boolean;
  };
}

interface SubscriptionContextType {
  subscription: CompanySubscription | null;
  loading: boolean;
  canAddEmployee: boolean;
  canProcessPayroll: boolean;
  isTrialExpired: boolean;
  employeeCount: number;
  payrollsThisMonth: number;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [payrollsThisMonth, setPayrollsThisMonth] = useState(0);

  const refreshSubscription = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);
      
      // Cargar suscripción
      const { data: subscriptionData, error: subError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (subError) {
        console.error('Error loading subscription:', subError);
        return;
      }

      setSubscription(subscriptionData);

      // Contar empleados activos
      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('estado', 'activo');

      setEmployeeCount(empCount || 0);

      // Contar nóminas de este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: payrollCount } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .gte('created_at', startOfMonth.toISOString());

      setPayrollsThisMonth(payrollCount || 0);

    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.company_id) {
      refreshSubscription();
    } else {
      setLoading(false);
    }
  }, [user, profile?.company_id]);

  const canAddEmployee = subscription ? employeeCount < subscription.max_employees : false;
  const canProcessPayroll = subscription ? payrollsThisMonth < subscription.max_payrolls_per_month : false;
  
  const isTrialExpired = subscription?.status === 'trial' && subscription.trial_ends_at 
    ? new Date() > new Date(subscription.trial_ends_at)
    : false;

  const value = {
    subscription,
    loading,
    canAddEmployee,
    canProcessPayroll,
    isTrialExpired,
    employeeCount,
    payrollsThisMonth,
    refreshSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
