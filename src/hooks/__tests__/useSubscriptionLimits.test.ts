import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubscriptionLimits } from '../useSubscriptionLimits';

// Mock dependencies
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: vi.fn()
}));

vi.mock('@/hooks/useActiveEmployeeCount', () => ({
  useActiveEmployeeCount: vi.fn()
}));

import { useSubscription } from '@/contexts/SubscriptionContext';
import { useActiveEmployeeCount } from '@/hooks/useActiveEmployeeCount';

const mockUseSubscription = useSubscription as ReturnType<typeof vi.fn>;
const mockUseActiveEmployeeCount = useActiveEmployeeCount as ReturnType<typeof vi.fn>;

describe('useSubscriptionLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canAddEmployee()', () => {
    it('returns false when employeeCount >= maxEmployees', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 10 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canAddEmployee()).toBe(false);
    });

    it('returns true when trial is expired but under employee limit (trial does not block)', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'trial'
        },
        isTrialExpired: true
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canAddEmployee()).toBe(true);
      expect(result.current.isWriteBlocked).toBe(false);
    });

    it('returns false when isWriteBlocked (status suspendida)', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'suspendida'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canAddEmployee()).toBe(false);
      expect(result.current.isWriteBlocked).toBe(true);
    });

    it('returns true when employee count is below limit', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canAddEmployee()).toBe(true);
    });

    it('returns true when no subscription data exists', () => {
      mockUseSubscription.mockReturnValue({
        subscription: null,
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: null });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canAddEmployee()).toBe(true);
    });
  });

  describe('canProcessPayroll()', () => {
    it('returns true when trial is expired (only suspendida/cancelada blocks payroll)', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'trial'
        },
        isTrialExpired: true
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canProcessPayroll()).toBe(true);
    });

    it('returns false when status is suspendida', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'suspendida'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canProcessPayroll()).toBe(false);
    });

    it('returns true when subscription is active', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.canProcessPayroll()).toBe(true);
    });
  });

  describe('suggestedPlan', () => {
    it('returns the next plan after current plan', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.suggestedPlan?.id).toBe('profesional');
    });

    it('returns null when on highest plan', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'empresarial',
          max_employees: 9999,
          max_payrolls_per_month: 9999,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.suggestedPlan).toBe(null);
    });

    it('returns basico+1 (profesional) when no current plan', () => {
      mockUseSubscription.mockReturnValue({
        subscription: null,
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: null });

      const { result } = renderHook(() => useSubscriptionLimits());

      // When no plan, suggests second plan (index 1)
      expect(result.current.suggestedPlan?.id).toBe('profesional');
    });
  });

  describe('triggerUpgradePrompt()', () => {
    it('sets showUpgradeDialog to true and updates limitType', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.showUpgradeDialog).toBe(false);
      expect(result.current.limitType).toBe(null);

      act(() => {
        result.current.triggerUpgradePrompt('employees');
      });

      expect(result.current.showUpgradeDialog).toBe(true);
      expect(result.current.limitType).toBe('employees');
    });

    it('can trigger for payroll limit type', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      act(() => {
        result.current.triggerUpgradePrompt('payroll');
      });

      expect(result.current.showUpgradeDialog).toBe(true);
      expect(result.current.limitType).toBe('payroll');
    });
  });

  describe('isWriteBlocked', () => {
    it('is false when trial expired (trial does not block writes)', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'trial'
        },
        isTrialExpired: true
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.isWriteBlocked).toBe(false);
    });

    it('is true when status is suspendida', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'suspendida'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.isWriteBlocked).toBe(true);
    });

    it('is true when status is cancelada', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'cancelada'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.isWriteBlocked).toBe(true);
    });

    it('is false when subscription is active', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'basico',
          max_employees: 10,
          max_payrolls_per_month: 5,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 5 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.isWriteBlocked).toBe(false);
    });
  });

  describe('exposed values', () => {
    it('exposes maxEmployees and maxPayrolls from subscription', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          plan_type: 'profesional',
          max_employees: 50,
          max_payrolls_per_month: 10,
          status: 'activa'
        },
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: 25 });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.maxEmployees).toBe(50);
      expect(result.current.maxPayrolls).toBe(10);
      expect(result.current.employeeCount).toBe(25);
      expect(result.current.currentPlan).toBe('profesional');
    });

    it('uses default max values when subscription is null', () => {
      mockUseSubscription.mockReturnValue({
        subscription: null,
        isTrialExpired: false
      });
      mockUseActiveEmployeeCount.mockReturnValue({ count: null });

      const { result } = renderHook(() => useSubscriptionLimits());

      expect(result.current.maxEmployees).toBe(9999);
      expect(result.current.maxPayrolls).toBe(9999);
    });
  });
});
