
import { useEffect, useState } from 'react';
import { useAutoSave } from './useAutoSave';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';

interface UsePayrollAutoSaveOptions {
  periodId: string | null;
  employees: PayrollEmployee[];
  enabled?: boolean;
}

export const usePayrollAutoSave = ({ 
  periodId, 
  employees, 
  enabled = true 
}: UsePayrollAutoSaveOptions) => {
  const { toast } = useToast();
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const saveData = async () => {
    if (!periodId || employees.length === 0) {
      console.log('⚠️ Auto-save skipped: no period or employees');
      return;
    }
    
    console.log('🔄 Auto-saving payroll data for', employees.length, 'employees...');
    
    try {
      await PayrollAutoSaveService.saveDraftEmployees(periodId, employees);
      await PayrollAutoSaveService.updatePeriodActivity(periodId);
      setLastSaveTime(new Date());
      
      console.log('✅ Payroll auto-save completed');
    } catch (error) {
      console.error('❌ Payroll auto-save failed:', error);
      throw error; // Re-throw to let useAutoSave handle it
    }
  };

  const { triggerAutoSave, isSaving } = useAutoSave({
    onSave: saveData,
    delay: 5000, // Aumentado a 5 segundos para reducir llamadas
    enabled: enabled && !!periodId && employees.length > 0
  });

  // Trigger auto-save when employees change, but with better logic
  useEffect(() => {
    if (enabled && periodId && employees.length > 0) {
      // No disparar auto-guardado si ya se está guardando
      if (!PayrollAutoSaveService.isCurrentlySaving) {
        triggerAutoSave();
      }
    }
  }, [employees, periodId, enabled, triggerAutoSave]);

  return {
    triggerAutoSave,
    isSaving: isSaving || PayrollAutoSaveService.isCurrentlySaving,
    lastSaveTime
  };
};
