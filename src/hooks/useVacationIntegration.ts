
import { useState, useCallback } from 'react';
import { VacationPayrollIntegrationService } from '@/services/vacation-integration/VacationPayrollIntegrationService';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';

export const useVacationIntegration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VacationIntegrationResult | null>(null);
  const { toast } = useToast();

  const processVacationsForPayroll = useCallback(async (
    options: VacationProcessingOptions
  ): Promise<VacationIntegrationResult> => {
    setIsProcessing(true);
    try {
      console.log('🔄 Iniciando integración inteligente de vacaciones...');
      
      const result = await VacationPayrollIntegrationService.processVacationsForPayroll(options);
      setLastResult(result);

      if (result.success) {
        // ✅ MEJORADO: Mensaje más descriptivo para fragmentación
        const isFragmented = result.message.includes('intersections');
        toast({
          title: "✅ Integración completada",
          description: isFragmented 
            ? `${result.message} - Días fragmentados correctamente por período`
            : result.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "❌ Error en integración",
          description: result.message,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const failureResult: VacationIntegrationResult = {
        processedVacations: 0,
        createdNovedades: 0,
        conflicts: [],
        success: false,
        message: errorMessage
      };
      
      setLastResult(failureResult);
      
      toast({
        title: "❌ Error crítico",
        description: errorMessage,
        variant: "destructive"
      });

      return failureResult;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const detectConflicts = useCallback(async (
    companyId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      return await VacationPayrollIntegrationService.detectVacationConflicts(
        companyId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error('Error detectando conflictos:', error);
      return [];
    }
  }, []);

  const calculateValue = useCallback((
    type: string,
    salary: number,
    days: number
  ) => {
    return VacationPayrollIntegrationService.calculateVacationValue(type, salary, days);
  }, []);

  return {
    isProcessing,
    lastResult,
    processVacationsForPayroll,
    detectConflicts,
    calculateValue
  };
};
