
import { useState, useCallback } from 'react';
import { PayrollPeriodDetectionService } from '@/services/payroll-intelligent/PayrollPeriodDetectionService';

interface PeriodDetectionResult {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'conflict';
  message: string;
  periodData?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
  conflictPeriod?: any;
}

export const usePeriodDetection = () => {
  const [periodInfo, setPeriodInfo] = useState<PeriodDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectPeriod = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsDetecting(true);
      setError(null);
      
      console.log('🔍 HOOK - Starting period detection for selected dates:', { startDate, endDate });
      
      // CRÍTICO: Usar el nuevo método que respeta las fechas seleccionadas
      const result = await PayrollPeriodDetectionService.detectPeriodForSelectedDates(startDate, endDate);
      
      console.log('📊 HOOK - Detection result received:', result);
      
      // ASEGURAR que las fechas originales se preserven
      if (result.periodData) {
        result.periodData.startDate = startDate;
        result.periodData.endDate = endDate;
        console.log('🔒 HOOK - Dates preserved in result:', {
          original: { startDate, endDate },
          preserved: { 
            startDate: result.periodData.startDate, 
            endDate: result.periodData.endDate 
          }
        });
      }
      
      setPeriodInfo(result);
      
      return result;
    } catch (error) {
      console.error('❌ HOOK - Error detecting period:', error);
      setError('Error detectando información del período');
      
      // Fallback: crear nuevo período con las fechas seleccionadas
      const fallbackResult = {
        hasActivePeriod: false,
        suggestedAction: 'create' as const,
        message: 'Se creará un nuevo período para las fechas seleccionadas',
        periodData: {
          startDate,
          endDate,
          periodName: `Período ${startDate} - ${endDate}`,
          type: 'mensual' as const
        }
      };
      
      console.log('🆘 HOOK - Using fallback result:', fallbackResult);
      setPeriodInfo(fallbackResult);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    console.log('🔄 HOOK - Resetting period detection state');
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
