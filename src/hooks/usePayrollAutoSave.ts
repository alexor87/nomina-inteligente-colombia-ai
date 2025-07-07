
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
}

export const usePayrollAutoSave = ({ 
  periodId, 
  employees, 
  removedEmployeeIds = [],
  enabled = true,
  onSaveSuccess
}: UsePayrollAutoSaveOptions) => {
  const { toast } = useToast();
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * MEJORADO: Trigger auto-save con mejor manejo de concurrencia
   */
  const triggerAutoSave = async () => {
    if (!enabled || !periodId) {
      console.log('⚠️ Auto-save skipped: disabled or no period ID');
      return;
    }
    
    if (employees.length === 0 && removedEmployeeIds.length === 0) {
      console.log('⚠️ Auto-save skipped: no employees to save or remove');
      return;
    }

    // MEJORADO: Prevenir llamadas concurrentes más robustamente
    if (isSaving || PayrollAutoSaveService.isCurrentlySaving) {
      console.log('⚠️ Auto-save skipped: already saving');
      return;
    }
    
    console.log('🔄 Manual auto-save triggered (IMPROVED):', {
      employees: employees.length,
      removedEmployeeIds: removedEmployeeIds.length,
      periodId,
      enabled
    });
    
    setIsSaving(true);
    
    try {
      // CRÍTICO: Usar el servicio mejorado con eliminaciones atómicas
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employees, removedEmployeeIds);
      await PayrollAutoSaveService.updatePeriodActivity(periodId);
      setLastSaveTime(new Date());
      
      // IMPORTANTE: Solo llamar callback después de éxito confirmado
      console.log('✅ Auto-save successful, calling success callback');
      onSaveSuccess?.();
      
      console.log('✅ Manual auto-save completed successfully');
    } catch (error) {
      console.error('❌ Manual auto-save failed:', error);
      
      // MEJORADO: Manejo de errores más específico
      if (error?.message?.includes('duplicate key value')) {
        console.log('🔄 Duplicate key error - will be resolved on next save');
        // No mostrar toast para errores de duplicados
      } else if (error?.message?.includes('period_id')) {
        toast({
          title: "Error de período",
          description: "Problema con el período de nómina. Intente recargar la página.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error al guardar",
          description: "No se pudieron guardar los cambios automáticamente. Se reintentará pronto.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    triggerAutoSave,
    isSaving: isSaving || PayrollAutoSaveService.isCurrentlySaving,
    lastSaveTime
  };
};
