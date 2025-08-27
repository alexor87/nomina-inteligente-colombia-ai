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
        pendingCount: 0,
        hasPending: false
      };
    }

    // Calculate adjustments from pending novedades
    let devengoAdjustment = 0;
    let deduccionAdjustment = 0;

    pending.forEach(p => {
      const valor = p.valor || 0;
      
      // Classify novedad types (simplified logic - you might need more specific rules)
      const isDeduction = [
        'descuento_voluntario', 'multa', 'libranza', 'retencion_fuente'
      ].includes(p.tipo_novedad);
      
      if (isDeduction) {
        deduccionAdjustment += valor;
      } else {
        devengoAdjustment += valor;
      }
    });

    const originalDevengado = employee.total_devengado || 0;
    const originalDeducciones = employee.total_deducciones || 0;
    const originalNeto = employee.neto_pagado || 0;

    const newDevengado = originalDevengado + devengoAdjustment;
    const newDeducciones = originalDeducciones + deduccionAdjustment;
    const newNeto = originalNeto + devengoAdjustment - deduccionAdjustment;

    return {
      originalDevengado,
      newDevengado,
      originalDeducciones,
      newDeducciones,
      originalNeto,
      newNeto,
      pendingCount: pending.length,
      hasPending: true
    };
  }, [getPendingForEmployee]);

  // Apply all pending adjustments
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
    
    try {
      // Group pending adjustments by employee
      const employeeGroups = pendingNovedades.reduce((groups, pending) => {
        const employeeId = pending.employee_id;
        if (!groups[employeeId]) {
          groups[employeeId] = {
            employee_id: employeeId,
            employee_name: pending.employee_name,
            novedades: []
          };
        }
        groups[employeeId].novedades.push(pending.novedadData);
        return groups;
      }, {} as Record<string, { employee_id: string; employee_name: string; novedades: CreateNovedadData[] }>);

      // Apply adjustments for each employee
      let totalAdjustments = 0;
      let totalEmployees = 0;
      const results = [];

      for (const group of Object.values(employeeGroups)) {
        const adjustmentData: PendingAdjustmentData = {
          periodId: periodData.id,
          employeeId: group.employee_id,
          employeeName: group.employee_name,
          justification,
          novedades: group.novedades
        };

        const result = await PendingNovedadesService.applyPendingAdjustments(adjustmentData);
        results.push(result);
        
        if (result.success) {
          totalAdjustments += result.total_adjustments || 0;
          totalEmployees += result.affected_employees || 0;
        } else {
          throw new Error(`Error procesando ${group.employee_name}: ${result.message}`);
        }
      }
      
      clearAllPending();
      
      toast({
        title: "✅ Ajustes aplicados exitosamente",
        description: `Se aplicaron ${totalAdjustments} ajustes a ${totalEmployees} empleados`,
        className: "border-green-200 bg-green-50"
      });
      
      return { success: true, results, totalAdjustments, totalEmployees };
      
    } catch (error: any) {
      console.error('❌ Error applying pending adjustments:', error);
      
      toast({
        title: "Error aplicando ajustes",
        description: error.message || "No se pudieron aplicar los ajustes",
        variant: "destructive"
      });
      
      return { success: false, error: error.message };
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