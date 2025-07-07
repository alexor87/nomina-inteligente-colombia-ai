
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
      
      console.log('🔍 Iniciando detección para fechas seleccionadas:', { startDate, endDate });
      
      // Usar el nuevo método que respeta las fechas seleccionadas
      const result = await PayrollPeriodDetectionService.detectPeriodForSelectedDates(startDate, endDate);
      
      console.log('📊 Resultado de detección:', result);
      
      setPeriodInfo(result);
      
      return result;
    } catch (error) {
      console.error('❌ Error detectando período:', error);
      setError('Error detectando información del período');
      
      // Fallback: crear nuevo período con las fechas seleccionadas
      setPeriodInfo({
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: 'Se creará un nuevo período para las fechas seleccionadas',
        periodData: {
          startDate,
          endDate,
          periodName: `Período ${startDate} - ${endDate}`,
          type: 'mensual'
        }
      });
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
