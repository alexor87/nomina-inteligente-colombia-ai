
import { useEffect, useState } from 'react';
import { useAutoSave } from './useAutoSave';
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

  const saveData = async () => {
    if (!periodId) {
      console.log('⚠️ Auto-save skipped: no period ID');
      return;
    }
    
    if (employees.length === 0 && removedEmployeeIds.length === 0) {
      console.log('⚠️ Auto-save skipped: no employees to save or remove');
      return;
    }
    
    console.log('🔄 Auto-saving payroll data:', {
      employees: employees.length,
      removedEmployeeIds: removedEmployeeIds.length,
      periodId
    });
    
    try {
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employees, removedEmployeeIds);
      await PayrollAutoSaveService.updatePeriodActivity(periodId);
      setLastSaveTime(new Date());
      
      // Call success callback to clear removed employee IDs
      onSaveSuccess?.();
      
      console.log('✅ Payroll auto-save completed');
    } catch (error) {
      console.error('❌ Payroll auto-save failed:', error);
      throw error; // Re-throw to let useAutoSave handle it
    }
  };

  const { triggerAutoSave, isSaving } = useAutoSave({
    onSave: saveData,
    delay: 5000, // 5 seconds delay to reduce calls
    enabled: enabled && !!periodId && (employees.length > 0 || removedEmployeeIds.length > 0)
  });

  // Trigger auto-save when employees or removed IDs change
  useEffect(() => {
    if (enabled && periodId && (employees.length > 0 || removedEmployeeIds.length > 0)) {
      // Don't trigger auto-save if already saving
      if (!PayrollAutoSaveService.isCurrentlySaving) {
        triggerAutoSave();
      }
    }
  }, [employees, removedEmployeeIds, periodId, enabled, triggerAutoSave]);

  return {
    triggerAutoSave,
    isSaving: isSaving || PayrollAutoSaveService.isCurrentlySaving,
    lastSaveTime
  };
};
