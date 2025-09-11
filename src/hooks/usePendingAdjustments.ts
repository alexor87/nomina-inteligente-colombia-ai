import { useState, useCallback, useEffect } from 'react';
import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { PendingAdjustmentsService } from '@/services/PendingAdjustmentsService';
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';

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

  // Load pending adjustments from database
  const loadPendingFromDatabase = useCallback(async () => {
    if (!periodId) return [];
    
    try {
      const dbAdjustments = await PendingAdjustmentsService.getPendingAdjustmentsForPeriod(periodId);
      return dbAdjustments.map(adj => PendingAdjustmentsService.toPendingNovedad(adj));
    } catch (error) {
      console.error('Error loading pending adjustments from database:', error);
      return [];
    }
  }, [periodId]);

  // Enhanced loading from both session storage and database
  useEffect(() => {
    if (!periodId) return;
    
    const loadInitialData = async () => {
      try {
        console.log('🔄 Loading pending adjustments from database and session storage');
        
        // Load from database first (source of truth)
        const dbData = await loadPendingFromDatabase();
        
        // Load from session storage as fallback/cache
        const sessionData: PendingNovedad[] = [];
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              sessionData.push(...parsed);
            }
          } catch (error) {
            console.warn('⚠️ Invalid session storage data, ignoring');
          }
        }
        
        // Prioritize database data but include session-only items that haven't been saved yet
        const dbKeys = new Set(dbData.map(adj => `${adj.employee_id}_${adj.tipo_novedad}_${adj.valor}`));
        const sessionOnlyData = sessionData.filter(adj => !dbKeys.has(`${adj.employee_id}_${adj.tipo_novedad}_${adj.valor}`));
        
        const combined = [...dbData, ...sessionOnlyData];
        
        console.log(`✅ Loaded ${dbData.length} from DB, ${sessionOnlyData.length} session-only, ${combined.length} total`);
        
        setPendingNovedades(combined);
        
        // Update session storage with combined data
        if (combined.length > 0) {
          sessionStorage.setItem(storageKey, JSON.stringify(combined));
        } else {
          sessionStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('❌ Error loading pending adjustments:', error);
      }
    };
    
    loadInitialData();
  }, [periodId, storageKey, loadPendingFromDatabase]);

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

  // Create negative pending adjustment for deletion
  const addPendingDeletion = useCallback((
    employeeId: string, 
    employeeName: string, 
    originalNovedad: any
  ) => {
    const deletionAdjustment: PendingNovedad = {
      employee_id: employeeId,
      employee_name: employeeName,
      tipo_novedad: originalNovedad.tipo_novedad,
      valor: -originalNovedad.valor, // Negative value to reverse the original
      observacion: `Eliminación de: ${originalNovedad.tipo_novedad} (Original: ${originalNovedad.valor})`,
      novedadData: {
        tipo_novedad: originalNovedad.tipo_novedad,
        subtipo: originalNovedad.subtipo,
        valor: -originalNovedad.valor,
        dias: originalNovedad.dias,
        fecha_inicio: originalNovedad.fecha_inicio,
        fecha_fin: originalNovedad.fecha_fin,
        observacion: `Eliminación de: ${originalNovedad.tipo_novedad} (ID: ${originalNovedad.id})`,
        constitutivo_salario: originalNovedad.constitutivo_salario || false,
        empleado_id: employeeId,
        periodo_id: periodId,
        company_id: companyId
       }
     };

     setPendingNovedades(prev => [...prev, deletionAdjustment]);
    
    toast({
      title: "Eliminación agregada a ajustes pendientes",
      description: `Se creó ajuste para eliminar ${originalNovedad.tipo_novedad} de ${employeeName}`,
      className: "border-red-200 bg-red-50"
    });
  }, [periodId, companyId, toast]);

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

  // Calculate preview for an employee using backend calculation service
  const calculateEmployeePreview = useCallback(async (
    employee: any,
    employeePendingNovedades?: PendingNovedad[]
  ): Promise<EmployeeNovedadPreview> => {
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

    try {
      // Convert pending novedades to backend format
      const pendingNovedadesForBackend = convertNovedadesToIBC(pending.map(p => ({
        tipo_novedad: p.tipo_novedad,
        valor: p.valor,
        constitutivo_salario: p.novedadData?.constitutivo_salario,
        dias: p.novedadData?.dias,
        subtipo: p.novedadData?.subtipo
      })));

      // Prepare base calculation input
      const baseInput: PayrollCalculationInput = {
        baseSalary: employee.salario_base || 0,
        workedDays: employee.dias_trabajados || 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: employee.periodo_type === 'quincenal' ? 'quincenal' : 'mensual',
        year: '2025'
      };

      // Calculate original values (without pending novedades, only existing ones)
      const existingNovedades = employee.novedades || [];
      const originalInput = {
        ...baseInput,
        novedades: existingNovedades
      };

      // Calculate new values (with all novedades: existing + pending)
      const newInput = {
        ...baseInput,
        novedades: [...existingNovedades, ...pendingNovedadesForBackend]
      };

      // Call backend for both calculations
      const [originalResult, newResult] = await Promise.all([
        PayrollCalculationBackendService.calculatePayroll(originalInput),
        PayrollCalculationBackendService.calculatePayroll(newInput)
      ]);

      return {
        originalDevengado: originalResult.grossPay,
        newDevengado: newResult.grossPay,
        originalDeducciones: originalResult.totalDeductions,
        newDeducciones: newResult.totalDeductions,
        originalNeto: originalResult.netPay,
        newNeto: newResult.netPay,
        originalIBC: Math.round(originalResult.ibc),
        newIBC: Math.round(newResult.ibc),
        pendingCount: pending.length,
        hasPending: true
      };
    } catch (error) {
      console.error('Error calculating employee preview with backend:', error);
      
      // Fallback to current stored values if backend fails
      return {
        originalDevengado: employee.total_devengado || 0,
        newDevengado: employee.total_devengado || 0,
        originalDeducciones: employee.total_deducciones || 0,
        newDeducciones: employee.total_deducciones || 0,
        originalNeto: employee.neto_pagado || 0,
        newNeto: employee.neto_pagado || 0,
        originalIBC: employee.ibc || 0,
        newIBC: employee.ibc || 0,
        pendingCount: pending.length,
        hasPending: true
      };
    }
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
    addPendingDeletion,
    removePendingNovedad,
    removePendingNovedadesForEmployee,
    clearAllPending,
    applyPendingAdjustments,
    
    // Utilities
    getPendingCount,
    getPendingForEmployee,
    calculateEmployeePreview,
    loadPendingFromDatabase
  };
};