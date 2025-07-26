import { useState } from 'react';
import { PayrollAuditEnhancedService, AuditEntry, PeriodAuditSummary } from '@/services/PayrollAuditEnhancedService';

export const usePayrollAudit = () => {
  const [loading, setLoading] = useState(false);

  const getNovedadHistory = async (novedadId: string): Promise<AuditEntry[]> => {
    setLoading(true);
    try {
      return await PayrollAuditEnhancedService.getNovedadAuditHistory(novedadId);
    } catch (error) {
      console.error('Error fetching audit history:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getPeriodAuditSummary = async (periodId: string): Promise<PeriodAuditSummary[]> => {
    setLoading(true);
    try {
      return await PayrollAuditEnhancedService.getPeriodAuditSummary(periodId);
    } catch (error) {
      console.error('Error fetching period audit summary:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const logManualAction = async (
    novedadId: string,
    action: string,
    context: {
      reason?: string;
      source?: 'adjustment' | 'correction' | 'liquidation';
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      await PayrollAuditEnhancedService.logManualAction(novedadId, action, context);
    } catch (error) {
      console.error('Error logging manual action:', error);
    }
  };

  return {
    loading,
    getNovedadHistory,
    getPeriodAuditSummary,
    logManualAction
  };
};