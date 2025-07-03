
import { useState, useCallback } from 'react';
import { PayrollPeriodDetectionEnhanced, EnhancedPeriodDetectionResult } from '@/services/payroll-intelligent/PayrollPeriodDetectionEnhanced';
import { SmartPeriodDetectionService } from '@/services/payroll-intelligent/SmartPeriodDetectionService';
import { toast } from '@/hooks/use-toast';

export const usePayrollPeriodDetectionEnhanced = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<EnhancedPeriodDetectionResult | null>(null);

  const detectPeriodStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Detecting period status with smart enhanced detection...');
      
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
      
      // Mostrar información del período inteligente detectado
      if (result.action === 'create' && result.nextPeriod) {
        toast({
          title: "🎯 Período inteligente detectado",
          description: `Sistema sugiere: ${result.nextPeriod.period}`,
          className: "border-green-200 bg-green-50"
        });
      }
      
      console.log('✅ Smart enhanced detection result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error in smart enhanced period detection:', error);
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

  const createSmartPeriod = useCallback(async () => {
    if (!detectionResult?.nextPeriod) {
      toast({
        title: "Error",
        description: "No hay período sugerido para crear",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);
    try {
      const suggestion = {
        startDate: detectionResult.nextPeriod.startDate,
        endDate: detectionResult.nextPeriod.endDate,
        periodName: detectionResult.nextPeriod.period,
        type: detectionResult.nextPeriod.type
      };

      const newPeriod = await SmartPeriodDetectionService.createSuggestedPeriod(suggestion);
      
      toast({
        title: "✅ Período creado exitosamente",
        description: `Se creó el período: ${suggestion.periodName}`,
        className: "border-green-200 bg-green-50"
      });

      // Refrescar detección después de crear
      await detectPeriodStatus();
      
      return newPeriod;
    } catch (error) {
      console.error('❌ Error creating smart period:', error);
      toast({
        title: "Error creando período",
        description: "No se pudo crear el período sugerido",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [detectionResult, detectPeriodStatus]);

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
    createSmartPeriod,
    validateNewPeriod
  };
};
