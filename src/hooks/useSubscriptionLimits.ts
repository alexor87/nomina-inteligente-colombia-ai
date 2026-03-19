import { useState, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useActiveEmployeeCount } from '@/hooks/useActiveEmployeeCount';
import { PLANES_SAAS } from '@/constants';

export type LimitType = 'employees' | 'payroll';

interface SubscriptionLimits {
  canAddEmployee: () => boolean;
  canProcessPayroll: () => boolean;
  isWriteBlocked: boolean;
  isTrialExpired: boolean;
  limitType: LimitType | null;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (show: boolean) => void;
  triggerUpgradePrompt: (type: LimitType) => void;
  currentPlan: string | null;
  suggestedPlan: typeof PLANES_SAAS[number] | null;
  employeeCount: number | null;
  maxEmployees: number;
  maxPayrolls: number;
}

export const useSubscriptionLimits = (): SubscriptionLimits => {
  const { subscription, isTrialExpired } = useSubscription();
  const { count: employeeCount } = useActiveEmployeeCount();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [limitType, setLimitType] = useState<LimitType | null>(null);

  const currentPlan = subscription?.plan_type || null;
  const maxEmployees = subscription?.max_employees ?? 9999;
  const maxPayrolls = subscription?.max_payrolls_per_month ?? 9999;

  const isWriteBlocked = subscription?.status === 'suspendida' || subscription?.status === 'cancelada';

  const canAddEmployee = useCallback((): boolean => {
    if (isWriteBlocked) return false;
    if (!subscription || employeeCount === null) return true;
    return employeeCount < maxEmployees;
  }, [subscription, employeeCount, maxEmployees, isWriteBlocked]);

  const canProcessPayroll = useCallback((): boolean => {
    if (isWriteBlocked) return false;
    // Payroll limit is checked at call time with current month count
    // For now, return true and let the caller verify
    return true;
  }, [isWriteBlocked]);

  const suggestedPlan = currentPlan
    ? PLANES_SAAS.find(p => {
        const currentIndex = PLANES_SAAS.findIndex(pl => pl.id === currentPlan);
        const pIndex = PLANES_SAAS.indexOf(p);
        return pIndex > currentIndex;
      }) || null
    : PLANES_SAAS[1] || null;

  const triggerUpgradePrompt = useCallback((type: LimitType) => {
    setLimitType(type);
    setShowUpgradeDialog(true);
  }, []);

  return {
    canAddEmployee,
    canProcessPayroll,
    isWriteBlocked,
    isTrialExpired,
    limitType,
    showUpgradeDialog,
    setShowUpgradeDialog,
    triggerUpgradePrompt,
    currentPlan,
    suggestedPlan,
    employeeCount,
    maxEmployees,
    maxPayrolls,
  };
};
