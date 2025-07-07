
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
    if (!periodId || employees.length === 0) return;
    
    console.log('🔄 Auto-saving payroll data...');
    await PayrollAutoSaveService.saveDraftEmployees(periodId, employees);
    await PayrollAutoSaveService.updatePeriodActivity(periodId);
    setLastSaveTime(new Date());
  };

  const { triggerAutoSave, isSaving } = useAutoSave({
    onSave: saveData,
    delay: 3000, // 3 segundos de delay
    enabled: enabled && !!periodId && employees.length > 0
  });

  // Trigger auto-save when employees change
  useEffect(() => {
    if (enabled && periodId && employees.length > 0) {
      triggerAutoSave();
    }
  }, [employees, periodId, enabled, triggerAutoSave]);

  return {
    triggerAutoSave,
    isSaving,
    lastSaveTime
  };
};
