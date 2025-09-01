import { useState, useCallback, useEffect } from 'react';
import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { useToast } from '@/hooks/use-toast';

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

    // Calculate adjustments from pending novedades
    let devengoAdjustment = 0;
    let deduccionAdjustment = 0;
    let constitutiveIBCAdjustment = 0;
    let nonRemuneratedDays = 0;

    pending.forEach(p => {
      const valor = p.valor || 0;
      const dias = p.novedadData?.dias || 0;
      
      // Classify novedad types
      const isDeduction = [
        'descuento_voluntario', 'multa', 'libranza', 'retencion_fuente'
      ].includes(p.tipo_novedad);
      
      // Core constitutive types (always constitutive by nature)
      const alwaysConstitutiveTypes = [
        'horas_extra', 'recargo_nocturno', 'recargo_dominical', 'comision', 
        'bonificacion', 'vacaciones', 'licencia_remunerada'
      ];
      
      const isNonRemunerated = [
        'ausencia', 'licencia_no_remunerada', 'incapacidad'
      ].includes(p.tipo_novedad);
      
      if (isDeduction) {
        deduccionAdjustment += valor;
      } else {
        devengoAdjustment += valor;
      }
      
      // Unified IBC constitutive logic: always constitutive OR explicitly marked
      const isConstitutiveForIBC = alwaysConstitutiveTypes.includes(p.tipo_novedad) || 
                                   p.novedadData?.constitutivo_salario === true;
      
      if (isConstitutiveForIBC) {
        constitutiveIBCAdjustment += valor;
      }
      
      // Count non-remunerated days for IBC calculation
      if (isNonRemunerated) {
        nonRemuneratedDays += dias;
      }
    });

    const originalDevengado = employee.total_devengado || 0;
    const originalDeducciones = employee.total_deducciones || 0;
    const originalNeto = employee.neto_pagado || 0;
    const originalIBC = employee.ibc || 0;

    const newDevengado = originalDevengado + devengoAdjustment;
    const newDeducciones = originalDeducciones + deduccionAdjustment;
    const newNeto = originalNeto + devengoAdjustment - deduccionAdjustment;
    
    // Calculate new IBC with adjustments
    const salarioBase = employee.salario_base || 0;
    const diasTrabajados = employee.dias_trabajados || 30;
    const effectiveDays = Math.max(0, diasTrabajados - nonRemuneratedDays);
    
    // Recalculate IBC: (salario_base / 30 * effective_days) + constitutive_adjustments
    const ibcBase = (salarioBase / 30) * effectiveDays;
    let newIBC = ibcBase + constitutiveIBCAdjustment;
    
    // Apply maximum cap (25 SMMLV)
    const SMMLV_2025 = 1300000;
    newIBC = Math.min(newIBC, SMMLV_2025 * 25);

    return {
      originalDevengado,
      newDevengado,
      originalDeducciones,
      newDeducciones,
      originalNeto,
      newNeto,
      originalIBC,
      newIBC: Math.round(newIBC),
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