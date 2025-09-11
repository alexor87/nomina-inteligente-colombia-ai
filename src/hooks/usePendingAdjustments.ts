// ⚠️ DEPRECATED - This hook is deprecated and will be removed in a future version
// Use useEditPeriod hook instead for period editing functionality
// 
// This file remains for backward compatibility but should not be used in new code
// Migrate existing usage to useEditPeriod for unified period editing

import { useState, useCallback, useEffect } from 'react';
import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { PendingAdjustmentsService } from '@/services/PendingAdjustmentsService';
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';

interface UsePendingAdjustmentsProps {
  periodId?: string;
  companyId?: string;
}

/**
 * @deprecated Use useEditPeriod hook instead
 * This hook is deprecated and will be removed in a future version.
 * Please migrate to useEditPeriod for unified period editing functionality.
 * 
 * This is a minimal stub to prevent build errors while migrations are completed.
 */
export const usePendingAdjustments = ({ periodId, companyId }: UsePendingAdjustmentsProps) => {
  console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  
  const [pendingNovedades] = useState<PendingNovedad[]>([]);
  const [isApplying] = useState(false);
  const { toast } = useToast();

  // Minimal implementation to prevent build errors
  const addPendingNovedad = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  }, []);

  const addPendingDeletion = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  }, []);

  const removePendingNovedad = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  }, []);

  const removePendingNovedadesForEmployee = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  }, []);

  const clearAllPending = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
  }, []);

  const getPendingNovedadesForEmployee = useCallback(() => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
    return [];
  }, []);

  const calculateEmployeePreview = useCallback(async (
    employee: any
  ): Promise<EmployeeNovedadPreview> => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
    return {
      originalDevengado: employee.total_devengado || 0,
      newDevengado: employee.total_devengado || 0,
      originalDeducciones: employee.total_deducciones || 0,
      newDeducciones: employee.total_deducciones || 0,
      originalNeto: employee.neto_pagado || 0,
      newNeto: employee.neto_pagado || 0,
      originalIBC: employee.ibc || 0,
      newIBC: employee.ibc || 0,
      pendingCount: 0,
      hasPending: false
    };
  }, []);

  const applyPendingAdjustments = useCallback(async () => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
    toast({
      title: "Hook Deprecated",
      description: "usePendingAdjustments is deprecated. Use useEditPeriod instead.",
      variant: "destructive",
    });
  }, [toast]);

  const loadPendingFromDatabase = useCallback(async () => {
    console.warn('⚠️ usePendingAdjustments is deprecated. Use useEditPeriod instead.');
    return [];
  }, []);

  return {
    pendingNovedades,
    totalPendingCount: 0,
    hasPendingAdjustments: false,
    isApplying,
    addPendingNovedad,
    addPendingDeletion,
    removePendingNovedad,
    removePendingNovedadesForEmployee,
    clearAllPending,
    getPendingNovedadesForEmployee,
    calculateEmployeePreview,
    applyPendingAdjustments,
    loadPendingFromDatabase
  };
};