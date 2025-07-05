
import { useState, useCallback } from 'react';
import { CriticalRepairService } from '@/services/CriticalRepairService';
import { useToast } from '@/hooks/use-toast';

/**
 * 🚨 HOOK DE REPARACIÓN CRÍTICA
 * Maneja diagnóstico y reparación automática del sistema
 */
export const useCriticalRepair = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnosis = useCallback(async () => {
    try {
      setIsDiagnosing(true);
      console.log('🔍 Ejecutando diagnóstico crítico...');
      
      const result = await CriticalRepairService.diagnoseSystem();
      setDiagnosis(result);
      
      if (result.issues.length === 0) {
        toast({
          title: "✅ Sistema en buen estado",
          description: "No se encontraron problemas críticos",
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: `⚠️ ${result.issues.length} problemas encontrados`,
          description: "Se requiere reparación del sistema",
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      toast({
        title: "Error en diagnóstico",
        description: "No se pudo completar el análisis del sistema",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsDiagnosing(false);
    }
  }, [toast]);

  const runCriticalRepair = useCallback(async () => {
    try {
      setIsRepairing(true);
      console.log('🔧 Ejecutando reparación crítica...');
      
      // Primero crear datos de prueba
      const repairResult = await CriticalRepairService.createMinimumTestData();
      
      if (repairResult.success) {
        toast({
          title: "🔧 Reparación completada",
          description: repairResult.message,
          className: "border-green-200 bg-green-50"
        });
        
        // Validar que los flujos funcionen
        const validation = await CriticalRepairService.validateCriticalFlows();
        
        if (validation.liquidationFlow && validation.historyFlow) {
          toast({
            title: "✅ Flujos validados",
            description: "Liquidación e historial funcionando correctamente",
            className: "border-green-200 bg-green-50"
          });
        } else {
          toast({
            title: "⚠️ Validación parcial",
            description: "Algunos flujos requieren atención adicional",
            variant: "destructive"
          });
        }
        
        // Actualizar diagnóstico
        await runDiagnosis();
        
        return {
          ...repairResult,
          validation
        };
      } else {
        toast({
          title: "❌ Error en reparación",
          description: repairResult.message,
          variant: "destructive"
        });
        return repairResult;
      }
    } catch (error) {
      console.error('❌ Error en reparación crítica:', error);
      toast({
        title: "Error crítico",
        description: "No se pudo completar la reparación automática",
        variant: "destructive"
      });
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        employeesCreated: 0,
        periodsCreated: 0,
        details: []
      };
    } finally {
      setIsRepairing(false);
    }
  }, [toast, runDiagnosis]);

  return {
    isRepairing,
    isDiagnosing,
    diagnosis,
    runDiagnosis,
    runCriticalRepair
  };
};
