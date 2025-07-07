
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriodCleanupService, PeriodCleanupResult, DiagnosticResult } from '@/services/PayrollPeriodCleanupService';

export const usePeriodCleanup = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<PeriodCleanupResult | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    try {
      console.log('🔍 Ejecutando diagnóstico de períodos...');
      const result = await PayrollPeriodCleanupService.diagnosePeriodIssues();
      setDiagnosticResult(result);
      
      const totalIssues = result.duplicatePeriods.length + result.ghostPeriods.length + result.invalidPeriods.length;
      
      toast({
        title: "📊 Diagnóstico completado",
        description: `Se encontraron ${totalIssues} problemas en total`,
        className: totalIssues > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"
      });

      return result;
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast({
        title: "Error en diagnóstico",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsDiagnosing(false);
    }
  };

  const executeCleanup = async () => {
    setIsCleaningUp(true);
    try {
      console.log('🧹 Iniciando limpieza de períodos...');
      
      toast({
        title: "🚨 Iniciando limpieza...",
        description: "Eliminando períodos duplicados, fantasma e incorrectos",
        className: "border-blue-200 bg-blue-50"
      });

      const result = await PayrollPeriodCleanupService.executeAggressiveCleanup();
      setCleanupResult(result);

      if (result.success) {
        toast({
          title: "✅ ¡Limpieza completada!",
          description: result.summary,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Limpieza parcial",
          description: `${result.summary}. Errores: ${result.errors.length}`,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('Error durante limpieza:', error);
      toast({
        title: "Error crítico en limpieza",
        description: "No se pudo completar la limpieza",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  };

  const fixSpecificPeriod = async (periodId: string, startDate: string, endDate: string) => {
    try {
      const success = await PayrollPeriodCleanupService.fixSpecificPeriod(periodId, startDate, endDate);
      
      if (success) {
        toast({
          title: "✅ Período corregido",
          description: "Las fechas y nombre del período han sido actualizados",
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "Error corrigiendo período",
          description: "No se pudieron actualizar los datos del período",
          variant: "destructive"
        });
      }

      return success;
    } catch (error) {
      console.error('Error fixing period:', error);
      toast({
        title: "Error",
        description: "Error inesperado al corregir período",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isCleaningUp,
    isDiagnosing,
    cleanupResult,
    diagnosticResult,
    runDiagnostic,
    executeCleanup,
    fixSpecificPeriod
  };
};
