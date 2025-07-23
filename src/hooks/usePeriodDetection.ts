
import { useState, useCallback } from 'react';
import { PeriodService, PeriodDetectionResult } from '@/services/payroll/PeriodService';

export const usePeriodDetection = () => {
  const [periodInfo, setPeriodInfo] = useState<PeriodDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectPeriod = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const result = await PeriodService.detectPeriodForDates(startDate, endDate);
      setPeriodInfo(result);
      
      return result;
    } catch (error) {
      const errorMessage = 'Error detectando información del período';
      setError(errorMessage);
      
      // Fallback
      const fallbackResult: PeriodDetectionResult = {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: 'Se creará un nuevo período para las fechas seleccionadas',
        periodData: PeriodService.generatePeriodInfo(startDate, endDate)
      };
      
      setPeriodInfo(fallbackResult);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPeriodInfo(null);
    setError(null);
    setIsDetecting(false);
  }, []);

  return {
    periodInfo,
    isDetecting,
    error,
    detectPeriod,
    reset
  };
};
