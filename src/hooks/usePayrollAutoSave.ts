
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
   * MEJORADO: Trigger auto-save con diagnóstico completo y manejo robusto de errores
   */
  const triggerAutoSave = async (): Promise<boolean> => {
    console.log('🔄 triggerAutoSave - INICIANDO con diagnóstico completo');
    console.log('📊 triggerAutoSave - Estado inicial:', {
      enabled,
      periodId,
      employeesCount: employees.length,
      removedEmployeeIds: removedEmployeeIds.length,
      currentlySaving: isSaving
    });

    if (!enabled || !periodId) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: disabled o no period ID', { enabled, periodId });
      return false;
    }
    
    if (employees.length === 0 && removedEmployeeIds.length === 0) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: no hay empleados para guardar o eliminar');
      return false;
    }

    // MEJORADO: Prevenir llamadas concurrentes más robustamente
    if (isSaving || PayrollAutoSaveService.isCurrentlySaving) {
      console.warn('⚠️ triggerAutoSave - CANCELADO: ya se está guardando');
      return false;
    }
    
    console.log('💾 triggerAutoSave - EJECUTANDO guardado automático');
    setIsSaving(true);
    
    try {
      console.log('🔄 triggerAutoSave - Llamando PayrollAutoSaveService.saveDraftEmployees');
      
      // CRÍTICO: Usar el servicio mejorado con eliminaciones atómicas
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employees, removedEmployeeIds);
      
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
        employeesCount: employees.length
      });
      
      // MEJORADO: Manejo de errores más específico y callback de error
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
