
import { useState, useCallback } from 'react';
import { VacationPayrollIntegrationService } from '@/services/vacation-integration/VacationPayrollIntegrationService';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';

export const useAbsenceIntegration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VacationIntegrationResult | null>(null);
  const { toast } = useToast();

  const processAbsencesForPayroll = useCallback(async (
    options: VacationProcessingOptions
  ): Promise<VacationIntegrationResult> => {
    setIsProcessing(true);
    try {
      console.log('Starting intelligent absence integration...');

      const result = await VacationPayrollIntegrationService.processVacationsForPayroll(options);
      setLastResult(result);

      if (result.success) {
        const isFragmented = result.message.includes('intersections');
        toast({
          title: "Integracion completada",
          description: isFragmented
            ? `${result.message} - Dias fragmentados correctamente por periodo`
            : result.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "Error en integracion",
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
        title: "Error critico",
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
      console.error('Error detecting conflicts:', error);
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
    processAbsencesForPayroll,
    detectConflicts,
    calculateValue
  };
};
