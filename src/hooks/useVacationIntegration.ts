
import { useState, useCallback } from 'react';
import { VacationPayrollIntegrationService } from '@/services/vacation-integration/VacationPayrollIntegrationService';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ✅ Interface para tipar la respuesta del RPC
interface ActivePeriodResponse {
  has_active_period: boolean;
  period?: {
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    last_activity_at: string;
    employees_count: number;
  };
}

export const useVacationIntegration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VacationIntegrationResult | null>(null);
  const { toast } = useToast();

  const processVacationsForPayroll = useCallback(async (
    options: VacationProcessingOptions
  ): Promise<VacationIntegrationResult> => {
    setIsProcessing(true);
    try {
      console.log('🔄 Iniciando integración de vacaciones...');
      
      const result = await VacationPayrollIntegrationService.processVacationsForPayroll(options);
      setLastResult(result);

      if (result.success) {
        toast({
          title: "✅ Integración completada",
          description: result.message,
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

  // ✅ NUEVA: Función para auto-procesar vacaciones en período activo
  const autoProcessVacationForActivePeriod = useCallback(async (
    companyId: string,
    vacationStartDate: string,
    vacationEndDate: string
  ) => {
    try {
      console.log('🔄 Verificando período activo para auto-procesamiento...');
      
      // Obtener período activo
      const { data: rawData } = await supabase.rpc('get_active_period_for_company', {
        p_company_id: companyId
      });

      // ✅ Type assertion con verificación defensiva
      const activePeriodData = rawData as ActivePeriodResponse | null;
      
      if (!activePeriodData || !activePeriodData.has_active_period) {
        console.log('📝 No hay período activo, skip auto-procesamiento');
        return;
      }

      const activePeriod = activePeriodData.period;
      
      // ✅ Verificación defensiva de que existe el período
      if (!activePeriod) {
        console.log('📝 Período activo sin datos, skip auto-procesamiento');
        return;
      }
      
      // Verificar si la vacación cae dentro del período activo
      const vacationStart = new Date(vacationStartDate);
      const vacationEnd = new Date(vacationEndDate);
      const periodStart = new Date(activePeriod.fecha_inicio);
      const periodEnd = new Date(activePeriod.fecha_fin);

      const vacationInPeriod = vacationStart <= periodEnd && vacationEnd >= periodStart;
      
      if (!vacationInPeriod) {
        console.log('📝 Vacación fuera del período activo, skip auto-procesamiento');
        return;
      }

      console.log('🎯 Auto-procesando vacación en período activo:', activePeriod.periodo);

      // Procesar automáticamente
      await processVacationsForPayroll({
        companyId,
        periodId: activePeriod.id,
        startDate: activePeriod.fecha_inicio,
        endDate: activePeriod.fecha_fin
      });

      // Toast silencioso para informar
      toast({
        title: "🔄 Procesamiento automático",
        description: `Vacación integrada automáticamente al período ${activePeriod.periodo}`,
        className: "border-blue-200 bg-blue-50"
      });

    } catch (error) {
      // Error silencioso, no bloquea la operación principal
      console.warn('⚠️ Error en auto-procesamiento (no crítico):', error);
      toast({
        title: "⚠️ Procesamiento pendiente",
        description: "La vacación se registró correctamente. Integración manual requerida.",
        className: "border-yellow-200 bg-yellow-50"
      });
    }
  }, [processVacationsForPayroll, toast]);

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
    autoProcessVacationForActivePeriod, // ✅ NUEVA función exportada
    detectConflicts,
    calculateValue
  };
};
