
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface MagicEditContextType {
  editingPeriod: PayrollHistoryPeriod | null;
  hasUnsavedChanges: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  startMagicEdit: (period: PayrollHistoryPeriod) => void;
  finishMagicEdit: () => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  triggerAutoSave: () => Promise<void>;
}

const MagicEditContext = createContext<MagicEditContextType | null>(null);

interface MagicEditProviderProps {
  children: ReactNode;
}

export const MagicEditProvider = ({ children }: MagicEditProviderProps) => {
  const [editingPeriod, setEditingPeriod] = useState<PayrollHistoryPeriod | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const startMagicEdit = useCallback((period: PayrollHistoryPeriod) => {
    setEditingPeriod(period);
    setHasUnsavedChanges(false);
    setLastSaved(null);
  }, []);

  const finishMagicEdit = useCallback(() => {
    setEditingPeriod(null);
    setHasUnsavedChanges(false);
    setIsAutoSaving(false);
    setLastSaved(null);
  }, []);

  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const triggerAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setIsAutoSaving(true);
    
    // Simulate auto-save delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsAutoSaving(false);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  }, [hasUnsavedChanges]);

  const value: MagicEditContextType = {
    editingPeriod,
    hasUnsavedChanges,
    isAutoSaving,
    lastSaved,
    startMagicEdit,
    finishMagicEdit,
    setUnsavedChanges,
    triggerAutoSave
  };

  return (
    <MagicEditContext.Provider value={value}>
      {children}
    </MagicEditContext.Provider>
  );
};

export const useMagicEdit = () => {
  const context = useContext(MagicEditContext);
  if (!context) {
    throw new Error('useMagicEdit must be used within a MagicEditProvider');
  }
  return context;
};
