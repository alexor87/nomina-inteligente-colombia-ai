
import { useState, useCallback } from 'react';
import { PayrollPeriodDetectionEnhanced, EnhancedPeriodDetectionResult } from '@/services/payroll-intelligent/PayrollPeriodDetectionEnhanced';
import { toast } from '@/hooks/use-toast';

export const usePayrollPeriodDetectionEnhanced = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<EnhancedPeriodDetectionResult | null>(null);

  const detectPeriodStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Detecting period status with enhanced detection...');
      
      const result = await PayrollPeriodDetectionEnhanced.detectCurrentPeriodStatus();
      
      setDetectionResult(result);
      
      // Mostrar notificación si se limpiaron duplicados
      if (result.duplicatesFound && result.duplicatesFound > 0) {
        toast({
          title: "🧹 Duplicados corregidos",
          description: `Se eliminaron ${result.cleanupResult?.periods_deleted || 0} períodos duplicados`,
          className: "border-blue-200 bg-blue-50"
        });
      }
      
      console.log('✅ Enhanced detection result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error in enhanced period detection:', error);
      toast({
        title: "Error detectando períodos",
        description: "No se pudo verificar el estado de los períodos",
        variant: "destructive"
      });
      
      const errorResult: EnhancedPeriodDetectionResult = {
        hasActivePeriod: false,
        action: 'diagnose',
        message: 'Error detectando períodos',
        duplicatesFound: 0
      };
      
      setDetectionResult(errorResult);
      return errorResult;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateNewPeriod = useCallback(async (periodo: string, fechaInicio: string, fechaFin: string) => {
    try {
      return await PayrollPeriodDetectionEnhanced.validatePeriodCreation(periodo, fechaInicio, fechaFin);
    } catch (error) {
      console.error('❌ Error validating period:', error);
      return false;
    }
  }, []);

  return {
    isLoading,
    detectionResult,
    detectPeriodStatus,
    validateNewPeriod
  };
};
