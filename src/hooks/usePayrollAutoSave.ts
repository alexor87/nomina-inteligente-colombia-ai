
import { useState } from 'react';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';

interface UsePayrollAutoSaveOptions {
  periodId: string | null;
  employees: PayrollEmployee[];
  removedEmployeeIds?: string[];
  enabled?: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
}

export const usePayrollAutoSave = ({ 
  periodId, 
  employees, 
  removedEmployeeIds = [],
  enabled = true,
  onSaveSuccess,
  onSaveError
}: UsePayrollAutoSaveOptions) => {
  const { toast } = useToast();
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * CORREGIDO: Trigger auto-save con parámetro opcional para empleados explícitos
   */
  const triggerAutoSave = async (explicitEmployees?: PayrollEmployee[]): Promise<boolean> => {
    console.log('🔄 triggerAutoSave - INICIANDO con corrección de closure');
    
    // CORRECCIÓN CRÍTICA: Usar empleados explícitos si se proporcionan
    const employeesToSave = explicitEmployees || employees;
    
    console.log('📊 triggerAutoSave - Estado de empleados:', {
      enabled,
      periodId,
      employeesFromState: employees.length,
      explicitEmployees: explicitEmployees?.length || 0,
      employeesToSave: employeesToSave.length,
      removedEmployeeIds: removedEmployeeIds.length,
      currentlySaving: isSaving,
      usingExplicitEmployees: !!explicitEmployees
    });

    if (!enabled || !periodId) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: disabled o no period ID', { enabled, periodId });
      return false;
    }
    
    if (employeesToSave.length === 0 && removedEmployeeIds.length === 0) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: no hay empleados para guardar o eliminar');
      return false;
    }

    // Prevenir llamadas concurrentes
    if (isSaving || PayrollAutoSaveService.isCurrentlySaving) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: ya se está guardando');
      return false;
    }
    
    console.log('💾 triggerAutoSave - EJECUTANDO guardado automático con empleados correctos');
    console.log('👥 triggerAutoSave - Empleados a guardar:', employeesToSave.map(emp => `${emp.name} (${emp.id})`));
    
    setIsSaving(true);
    
    try {
      console.log('🔄 triggerAutoSave - Llamando PayrollAutoSaveService.saveDraftEmployees');
      
      // CRÍTICO: Pasar los empleados correctos al servicio
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employeesToSave, removedEmployeeIds);
      
      console.log('✅ triggerAutoSave - saveDraftEmployees completado, actualizando actividad del período');
      await PayrollAutoSaveService.updatePeriodActivity(periodId);
      
      setLastSaveTime(new Date());
      
      console.log('✅ triggerAutoSave - ÉXITO COMPLETO, ejecutando callback de éxito');
      onSaveSuccess?.();
      
      console.log('✅ triggerAutoSave - Guardado automático completado exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ triggerAutoSave - ERROR CRÍTICO en guardado automático:', error);
      console.error('❌ triggerAutoSave - Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        periodId,
        employeesToSaveCount: employeesToSave.length,
        explicitEmployeesProvided: !!explicitEmployees
      });
      
      // Manejo de errores mejorado
      onSaveError?.(error);
      
      if (error?.message?.includes('duplicate key value')) {
        console.log('🔄 triggerAutoSave - Error de duplicados - será resuelto en próximo guardado');
        // No mostrar toast para errores de duplicados
      } else if (error?.message?.includes('period_id')) {
        console.error('❌ triggerAutoSave - Error de período, mostrando toast específico');
        toast({
          title: "Error de período",
          description: "Problema con el período de nómina. Intente recargar la página.",
          variant: "destructive"
        });
      } else {
        console.error('❌ triggerAutoSave - Error general, mostrando toast genérico');
        toast({
          title: "Error al guardar",
          description: "No se pudieron guardar los cambios automáticamente. Se reintentará pronto.",
          variant: "destructive"
        });
      }
      
      return false;
    } finally {
      console.log('🏁 triggerAutoSave - FINALIZANDO, limpiando estado de guardado');
      setIsSaving(false);
    }
  };

  return {
    triggerAutoSave,
    isSaving: isSaving || PayrollAutoSaveService.isCurrentlySaving,
    lastSaveTime
  };
};
