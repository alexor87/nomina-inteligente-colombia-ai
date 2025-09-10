import { useState, useCallback, useEffect } from 'react';
import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { useToast } from '@/hooks/use-toast';
import { DeductionCalculationService } from '@/services/DeductionCalculationService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';
import { ConfigurationService } from '@/services/ConfigurationService';

interface UsePendingAdjustmentsProps {
  periodId?: string;
  companyId?: string;
}

export const usePendingAdjustments = ({ periodId, companyId }: UsePendingAdjustmentsProps) => {
  const [pendingNovedades, setPendingNovedades] = useState<PendingNovedad[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Session storage key for persistence
  const storageKey = `pending-adjustments-${periodId}`;

  // Load from session storage on mount
  useEffect(() => {
    if (!periodId) return;
    
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPendingNovedades(parsed);
      }
    } catch (error) {
      console.error('Error loading pending adjustments from storage:', error);
    }
  }, [periodId, storageKey]);

  // Save to session storage whenever state changes
  useEffect(() => {
    if (!periodId) return;
    
    try {
      if (pendingNovedades.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(pendingNovedades));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Error saving pending adjustments to storage:', error);
    }
  }, [pendingNovedades, periodId, storageKey]);

  // Add pending novedad
  const addPendingNovedad = useCallback((novedad: PendingNovedad) => {
    setPendingNovedades(prev => [...prev, novedad]);
    
    toast({
      title: "Novedad agregada a ajustes pendientes",
      description: `Se agregó ${novedad.tipo_novedad} para ${novedad.employee_name}`,
      className: "border-orange-200 bg-orange-50"
    });
  }, [toast]);

  // Remove pending novedad
  const removePendingNovedad = useCallback((index: number) => {
    setPendingNovedades(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Remove all pending novedades for an employee
  const removePendingNovedadesForEmployee = useCallback((employeeId: string) => {
    setPendingNovedades(prev => prev.filter(n => n.employee_id !== employeeId));
  }, []);

  // Clear all pending adjustments
  const clearAllPending = useCallback(() => {
    setPendingNovedades([]);
    if (periodId) {
      sessionStorage.removeItem(storageKey);
    }
  }, [periodId, storageKey]);

  // Get pending novedades count for a specific employee
  const getPendingCount = useCallback((employeeId: string) => {
    return pendingNovedades.filter(n => n.employee_id === employeeId).length;
  }, [pendingNovedades]);

  // Get pending novedades for a specific employee
  const getPendingForEmployee = useCallback((employeeId: string) => {
    return pendingNovedades.filter(n => n.employee_id === employeeId);
  }, [pendingNovedades]);

  // Calculate preview for an employee
  const calculateEmployeePreview = useCallback((
    employee: any,
    employeePendingNovedades?: PendingNovedad[]
  ): EmployeeNovedadPreview => {
    const pending = employeePendingNovedades || getPendingForEmployee(employee.id);
    
    if (pending.length === 0) {
      return {
        originalDevengado: employee.total_devengado || 0,
        newDevengado: employee.total_devengado || 0,
        originalDeducciones: employee.total_deducciones || 0,
        newDeducciones: employee.total_deducciones || 0,
        originalNeto: employee.neto_pagado || 0,
        newNeto: employee.neto_pagado || 0,
        originalIBC: employee.ibc || 0,
        newIBC: employee.ibc || 0,
        pendingCount: 0,
        hasPending: false
      };
    }

    // Calculate adjustments from pending novedades using liquidation module logic
    let devengoAdjustment = 0;
    let explicitDeductions = 0;

    // Convert pending novedades to proper format for IBC calculation
    const novedadesForIBC = convertNovedadesToIBC(pending.map(p => ({
      tipo_novedad: p.tipo_novedad,
      valor: p.valor,
      constitutivo_salario: p.novedadData?.constitutivo_salario,
      dias: p.novedadData?.dias,
      subtipo: p.novedadData?.subtipo
    })));

    // Process each pending novedad
    pending.forEach(p => {
      const valor = p.valor || 0;
      
      // Classify novedad types for devengado/deduction adjustments
      const isDeduction = [
        'descuento_voluntario', 'multa', 'libranza', 'retencion_fuente'
      ].includes(p.tipo_novedad);
      
      if (isDeduction) {
        explicitDeductions += Math.abs(valor);
      } else {
        devengoAdjustment += valor;
      }
    });

    // Calculate IBC adjustment from constitutive novedades only
    let constitutiveIBCAdjustment = 0;
    novedadesForIBC.forEach(novedad => {
      if (novedad.constitutivo_salario && novedad.valor > 0) {
        constitutiveIBCAdjustment += novedad.valor;
      }
    });

    // Get original values first
    const originalDevengado = employee.total_devengado || 0;
    const originalDeducciones = employee.total_deducciones || 0;
    const originalNeto = employee.neto_pagado || 0;
    const originalIBC = employee.ibc || 0;

    // Calculate new devengado early
    const newDevengado = originalDevengado + devengoAdjustment;

    // Calculate new IBC using baseline + constitutive adjustments
    const baseIBC = employee.ibc || employee.salario_base || 0;
    let newIBC = baseIBC + constitutiveIBCAdjustment;
    
    // Get correct SMMLV for the year
    const config = ConfigurationService.getConfigurationSync('2025');
    const SMMLV = config.salarioMinimo;
    
    // Apply IBC constraints
    newIBC = Math.max(newIBC, SMMLV);
    newIBC = Math.min(newIBC, SMMLV * 25);

    // Calculate legal deductions based on new IBC
    const deductionResult = DeductionCalculationService.calculateDeductions(newIBC);
    
    // Total deductions = legal deductions + explicit deduction novelties
    const newDeducciones = deductionResult.totalDeducciones + explicitDeductions;
    const newNeto = newDevengado - newDeducciones;

    return {
      originalDevengado,
      newDevengado,
      originalDeducciones,
      newDeducciones,
      originalNeto,
      newNeto,
      originalIBC,
      newIBC,
      pendingCount: pending.length,
      hasPending: true
    };
  }, [getPendingForEmployee]);

  // Apply all pending adjustments with full re-liquidation
  const applyPendingAdjustments = useCallback(async (
    justification: string,
    periodData: any,
    companyId: string
  ) => {
    if (pendingNovedades.length === 0) {
      toast({
        title: "Sin ajustes pendientes",
        description: "No hay ajustes pendientes para aplicar",
        variant: "destructive"
      });
      return { success: false };
    }

    setIsApplying(true);
    console.log('🔄 Applying pending adjustments with re-liquidation...');
    
    try {
      // Group pending adjustments by employee
      const employeeGroups = pendingNovedades.reduce((groups, pending) => {
        const employeeId = pending.employee_id;
        if (!groups[employeeId]) {
          groups[employeeId] = {
            employeeId: employeeId,
            employeeName: pending.employee_name,
            novedades: []
          };
        }
        groups[employeeId].novedades.push(pending);
        return groups;
      }, {} as Record<string, { employeeId: string; employeeName: string; novedades: PendingNovedad[] }>);

      // Apply adjustments using the new re-liquidation service
      const result = await PendingNovedadesService.applyPendingAdjustments({
        periodId: periodData.id,
        periodo: periodData.periodo,
        companyId,
        employeeGroups: Object.values(employeeGroups),
        justification
      });

      if (result.success) {
        // Clear pending adjustments
        clearAllPending();
        
        // Show enhanced success message with re-liquidation details
        const details = [];
        if (result.employeesAffected) details.push(`${result.employeesAffected} empleados`);
        if (result.correctionsApplied) details.push(`${result.correctionsApplied} correcciones`);
        if (result.periodReopened) details.push('período reabierto temporalmente');
        
        toast({
          title: "✅ Re-liquidación Completada",
          description: `${result.adjustmentsApplied} ajustes aplicados y período reliquidado: ${details.join(', ')}`,
          className: "border-green-200 bg-green-50"
        });

        console.log('✅ Re-liquidation completed successfully:', result);
        return { success: true, ...result };
      } else {
        toast({
          title: "❌ Error en Re-liquidación",
          description: result.message,
          variant: "destructive"
        });
        console.error('❌ Error in re-liquidation:', result);
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error in applyPendingAdjustments:', error);
      toast({
        title: "❌ Error Inesperado",
        description: "Ocurrió un error al aplicar los ajustes y reliquidar",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setIsApplying(false);
    }
  }, [pendingNovedades, clearAllPending, toast]);

  // Get total pending count
  const totalPendingCount = pendingNovedades.length;

  // Get unique employees with pending adjustments
  const employeesWithPending = Array.from(
    new Set(pendingNovedades.map(p => p.employee_id))
  );

  return {
    // State
    pendingNovedades,
    totalPendingCount,
    employeesWithPending,
    isApplying,
    
    // Actions
    addPendingNovedad,
    removePendingNovedad,
    removePendingNovedadesForEmployee,
    clearAllPending,
    applyPendingAdjustments,
    
    // Utilities
    getPendingCount,
    getPendingForEmployee,
    calculateEmployeePreview
  };
};