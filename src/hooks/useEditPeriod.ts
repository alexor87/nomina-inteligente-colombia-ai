import { useState, useCallback, useEffect } from 'react';
import { PeriodEditState, EditingSession, EditingChanges, NovedadData, ValidationResult } from '@/types/period-editing';
import { PeriodEditingService } from '@/services/PeriodEditingService';
import { useToast } from '@/hooks/use-toast';

interface UseEditPeriodProps {
  periodId: string;
  companyId?: string;
}

export const useEditPeriod = ({ periodId, companyId }: UseEditPeriodProps) => {
  const [editState, setEditState] = useState<PeriodEditState>('closed');
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);
  const [pendingChanges, setPendingChanges] = useState<EditingChanges>({
    employees: { added: [], removed: [] },
    novedades: { added: [], modified: [], deleted: [] },
    payrollData: {}
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!periodId) return;
      
      try {
        const session = await PeriodEditingService.getActiveSession(periodId);
        if (session) {
          setEditingSession(session);
          setEditState('editing');
          setPendingChanges(session.changes);
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
    };

    checkExistingSession();
  }, [periodId]);

  // Start editing mode
  const startEditing = useCallback(async () => {
    if (!periodId) return;

    setEditState('editing');
    try {
      const session = await PeriodEditingService.startEditingSession(periodId);
      setEditingSession(session);
      setEditState('editing');
      
      toast({
        title: "Modo edición activado",
        description: "El período está ahora en modo edición. Los cambios serán temporales hasta aplicarlos.",
        className: "border-blue-200 bg-blue-50"
      });
    } catch (error: any) {
      setEditState('closed');
      toast({
        title: "Error al iniciar edición",
        description: error.message || "No se pudo iniciar el modo edición",
        variant: "destructive"
      });
    }
  }, [periodId, toast]);

  // Apply all changes
  const applyChanges = useCallback(async () => {
    if (!editingSession) return;

    setEditState('saving');
    try {
      await PeriodEditingService.applyChanges(editingSession.id);
      
      // Reset state
      setEditingSession(null);
      setPendingChanges({
        employees: { added: [], removed: [] },
        novedades: { added: [], modified: [], deleted: [] },
        payrollData: {}
      });
      setValidationErrors([]);
      setEditState('closed');
      
      toast({
        title: "✅ Cambios aplicados",
        description: "Todos los cambios han sido aplicados exitosamente al período.",
        className: "border-green-200 bg-green-50"
      });

      return { success: true };
    } catch (error: any) {
      setEditState('editing');
      toast({
        title: "❌ Error aplicando cambios",
        description: error.message || "No se pudieron aplicar los cambios",
        variant: "destructive"
      });
      return { success: false };
    }
  }, [editingSession, toast]);

  // Discard all changes
  const discardChanges = useCallback(async () => {
    if (!editingSession) return;

    setEditState('discarding');
    try {
      await PeriodEditingService.discardChanges(editingSession.id);
      
      // Reset state
      setEditingSession(null);
      setPendingChanges({
        employees: { added: [], removed: [] },
        novedades: { added: [], modified: [], deleted: [] },
        payrollData: {}
      });
      setValidationErrors([]);
      setEditState('closed');
      
      toast({
        title: "Cambios descartados",
        description: "Todos los cambios pendientes han sido descartados.",
        className: "border-yellow-200 bg-yellow-50"
      });
    } catch (error: any) {
      setEditState('editing');
      toast({
        title: "Error descartando cambios",
        description: error.message || "No se pudieron descartar los cambios",
        variant: "destructive"
      });
    }
  }, [editingSession, toast]);

  // Add employee to period
  const addEmployee = useCallback((employeeId: string) => {
    if (editState !== 'editing') return;
    
    setPendingChanges(prev => ({
      ...prev,
      employees: {
        ...prev.employees,
        added: [...prev.employees.added, employeeId]
      }
    }));
  }, [editState]);

  // Remove employee from period
  const removeEmployee = useCallback((employeeId: string) => {
    if (editState !== 'editing') return;
    
    setPendingChanges(prev => ({
      ...prev,
      employees: {
        ...prev.employees,
        removed: [...prev.employees.removed, employeeId]
      }
    }));
  }, [editState]);

  // Add novedad
  const addNovedad = useCallback((novedadData: NovedadData) => {
    if (editState !== 'editing') return;
    
    setPendingChanges(prev => ({
      ...prev,
      novedades: {
        ...prev.novedades,
        added: [...prev.novedades.added, novedadData]
      }
    }));
    
    toast({
      title: "Novedad agregada",
      description: `Se agregó ${novedadData.tipo_novedad} a los cambios pendientes`,
      className: "border-blue-200 bg-blue-50"
    });
  }, [editState, toast]);

  // Remove novedad (mark for deletion)
  const removeNovedad = useCallback((novedadId: string) => {
    if (editState !== 'editing') return;
    
    setPendingChanges(prev => ({
      ...prev,
      novedades: {
        ...prev.novedades,
        deleted: [...prev.novedades.deleted, novedadId]
      }
    }));
    
    toast({
      title: "Novedad marcada para eliminación",
      description: "La novedad será eliminada al aplicar los cambios",
      className: "border-red-200 bg-red-50"
    });
  }, [editState, toast]);

  // Computed properties
  const hasChanges = useCallback(() => {
    return (
      pendingChanges.employees.added.length > 0 ||
      pendingChanges.employees.removed.length > 0 ||
      pendingChanges.novedades.added.length > 0 ||
      pendingChanges.novedades.modified.length > 0 ||
      pendingChanges.novedades.deleted.length > 0 ||
      Object.keys(pendingChanges.payrollData).length > 0
    );
  }, [pendingChanges]);

  const totalChangesCount = useCallback(() => {
    return (
      pendingChanges.employees.added.length +
      pendingChanges.employees.removed.length +
      pendingChanges.novedades.added.length +
      pendingChanges.novedades.modified.length +
      pendingChanges.novedades.deleted.length
    );
  }, [pendingChanges]);

  const isValid = validationErrors.length === 0;

  return {
    // State
    editState,
    editingSession,
    pendingChanges,
    validationErrors,
    
    // Computed
    hasChanges: hasChanges(),
    totalChangesCount: totalChangesCount(),
    isValid,
    
    // Actions
    startEditing,
    applyChanges,
    discardChanges,
    addEmployee,
    removeEmployee,
    addNovedad,
    removeNovedad
  };
};