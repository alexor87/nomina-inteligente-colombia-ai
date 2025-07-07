
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

  const triggerAutoSave = async () => {
    if (!enabled || !periodId) {
      console.log('⚠️ Auto-save skipped: disabled or no period ID');
      return;
    }
    
    if (employees.length === 0 && removedEmployeeIds.length === 0) {
      console.log('⚠️ Auto-save skipped: no employees to save or remove');
      return;
    }

    // Prevent concurrent saves
    if (isSaving || PayrollAutoSaveService.isCurrentlySaving) {
      console.log('⚠️ Auto-save skipped: already saving');
      return;
    }
    
    console.log('🔄 Manual auto-save triggered:', {
      employees: employees.length,
      removedEmployeeIds: removedEmployeeIds.length,
      periodId
    });
    
    setIsSaving(true);
    
    try {
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employees, removedEmployeeIds);
      await PayrollAutoSaveService.updatePeriodActivity(periodId);
      setLastSaveTime(new Date());
      
      // Call success callback to clear removed employee IDs
      onSaveSuccess?.();
      
      console.log('✅ Manual auto-save completed');
    } catch (error) {
      console.error('❌ Manual auto-save failed:', error);
      
      // Only show toast for errors that aren't duplicates
      if (!error?.message?.includes('duplicate key value')) {
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
