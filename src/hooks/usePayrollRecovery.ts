import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollRecoveryService, RecoveryPlan, RecoveryExecution } from '@/services/PayrollRecoveryService';
import { PayrollConsistencyService, ConsistencyReport } from '@/services/PayrollConsistencyService';

export const usePayrollRecovery = (companyId: string) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlan[]>([]);
  const [recoveryResults, setRecoveryResults] = useState<Record<string, RecoveryExecution>>({});
  const { toast } = useToast();

  /**
   * Analizar salud del sistema y generar planes de recuperación
   */
  const analyzeSystemHealth = useCallback(async () => {
    if (!companyId) return;

    setIsAnalyzing(true);
    try {
      console.log('🏥 [RECOVERY HOOK] Iniciando análisis de salud del sistema...');

      // Diagnóstico de consistencia
      const report = await PayrollConsistencyService.diagnoseConsistency(companyId);
      setConsistencyReport(report);

      // Generar planes de recuperación
      const plans = await PayrollRecoveryService.analyzeAndPlan(companyId);
      setRecoveryPlans(plans);

      // Mostrar resumen al usuario
      if (report.totalIssues === 0) {
        toast({
          title: "✅ Sistema saludable",
          description: "No se detectaron problemas de consistencia",
          variant: "default"
        });
      } else {
        const criticalCount = report.criticalIssues;
        const severity = criticalCount > 0 ? "destructive" : "default";
        
        toast({
          title: `⚠️ ${report.totalIssues} problema${report.totalIssues > 1 ? 's' : ''} detectado${report.totalIssues > 1 ? 's' : ''}`,
          description: criticalCount > 0 
            ? `${criticalCount} críticos requieren atención inmediata` 
            : "Problemas menores detectados - reparación automática disponible",
          variant: severity
        });
      }

      console.log('📊 [RECOVERY HOOK] Análisis completado:', {
        totalIssues: report.totalIssues,
        criticalIssues: report.criticalIssues,
        plansGenerated: plans.length
      });

    } catch (error) {
      console.error('❌ [RECOVERY HOOK] Error en análisis:', error);
      toast({
        title: "Error en análisis",
        description: "No se pudo completar el análisis del sistema",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, toast]);

  /**
   * Ejecutar plan de recuperación específico
   */
  const executePlan = useCallback(async (plan: RecoveryPlan, userId: string) => {
    if (!companyId) return;

    setIsRecovering(true);
    try {
      console.log('🚀 [RECOVERY HOOK] Ejecutando plan:', plan.periodName);

      toast({
        title: "🔧 Iniciando recuperación",
        description: `Recuperando ${plan.periodName}...`,
        variant: "default"
      });

      const result = await PayrollRecoveryService.executePlan(plan, companyId, userId);
      
      // Almacenar resultado
      setRecoveryResults(prev => ({
        ...prev,
        [plan.periodId]: result
      }));

      // Mostrar resultado al usuario
      if (result.success) {
        toast({
          title: "✅ Recuperación exitosa",
          description: `${plan.periodName} recuperado correctamente (${result.actionsCompleted}/${result.actionsTotal} acciones)`,
          variant: "default"
        });

        // Actualizar lista de planes (remover el ejecutado exitosamente)
        setRecoveryPlans(prev => prev.filter(p => p.periodId !== plan.periodId));
      } else {
        toast({
          title: "⚠️ Recuperación parcial",
          description: `${result.actionsCompleted}/${result.actionsTotal} acciones completadas. ${result.errors.length} errores.`,
          variant: "destructive"
        });
      }

      console.log('🏁 [RECOVERY HOOK] Plan ejecutado:', {
        planId: plan.periodId,
        success: result.success,
        actionsCompleted: result.actionsCompleted,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      console.error('❌ [RECOVERY HOOK] Error ejecutando plan:', error);
      toast({
        title: "Error en recuperación",
        description: `No se pudo recuperar ${plan.periodName}`,
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  }, [companyId, toast]);

  /**
   * Recuperación automática rápida para problemas críticos
   */
  const quickAutoRecovery = useCallback(async (userId: string) => {
    if (!companyId) return;

    setIsRecovering(true);
    try {
      console.log('⚡ [RECOVERY HOOK] Iniciando recuperación automática rápida...');

      toast({
        title: "⚡ Recuperación automática",
        description: "Detectando y corrigiendo problemas automáticamente...",
        variant: "default"
      });

      // Recuperación específica para el período de Marzo
      const result = await PayrollRecoveryService.autoRecoverMarchPeriod(companyId, userId);

      if (result.success) {
        toast({
          title: "✅ Recuperación automática exitosa",
          description: `${result.actionsCompleted} problemas corregidos automáticamente`,
          variant: "default"
        });

        // Refrescar análisis después de la recuperación
        await analyzeSystemHealth();
      } else {
        toast({
          title: "⚠️ Recuperación automática parcial",
          description: `${result.actionsCompleted} problemas corregidos. Revise los detalles.`,
          variant: "destructive"
        });
      }

      return result;

    } catch (error) {
      console.error('❌ [RECOVERY HOOK] Error en recuperación automática:', error);
      toast({
        title: "Error en recuperación automática",
        description: "No se pudo completar la recuperación automática",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  }, [companyId, toast, analyzeSystemHealth]);

  /**
   * Reparación automática de problemas detectados
   */
  const autoRepairIssues = useCallback(async () => {
    if (!consistencyReport || !companyId) return;

    setIsRecovering(true);
    try {
      console.log('🔧 [RECOVERY HOOK] Iniciando reparación automática...');

      toast({
        title: "🔧 Reparando automáticamente",
        description: "Corrigiendo problemas detectados...",
        variant: "default"
      });

      const repairResult = await PayrollConsistencyService.autoRepairIssues(companyId, consistencyReport.issues);

      if (repairResult.success) {
        toast({
          title: "✅ Reparación completada",
          description: `${repairResult.issuesRepaired} problemas corregidos`,
          variant: "default"
        });

        // Refrescar análisis
        await analyzeSystemHealth();
      } else {
        toast({
          title: "⚠️ Reparación parcial",
          description: `${repairResult.issuesRepaired} corregidos, ${repairResult.issuesRemaining} pendientes`,
          variant: "destructive"
        });
      }

      return repairResult;

    } catch (error) {
      console.error('❌ [RECOVERY HOOK] Error en reparación automática:', error);
      toast({
        title: "Error en reparación",
        description: "No se pudo completar la reparación automática",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  }, [consistencyReport, companyId, toast, analyzeSystemHealth]);

  /**
   * Limpiar resultados y reiniciar
   */
  const clearResults = useCallback(() => {
    setConsistencyReport(null);
    setRecoveryPlans([]);
    setRecoveryResults({});
  }, []);

  return {
    // Estados
    isAnalyzing,
    isRecovering,
    consistencyReport,
    recoveryPlans,
    recoveryResults,
    
    // Acciones
    analyzeSystemHealth,
    executePlan,
    quickAutoRecovery,
    autoRepairIssues,
    clearResults,
    
    // Estados calculados
    hasIssues: consistencyReport ? consistencyReport.totalIssues > 0 : false,
    hasCriticalIssues: consistencyReport ? consistencyReport.criticalIssues > 0 : false,
    systemHealth: consistencyReport?.overallHealth || 'unknown',
    isReady: !isAnalyzing && !isRecovering
  };
};