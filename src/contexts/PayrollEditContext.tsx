import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeCompositionService, CompositionChange } from '@/services/EmployeeCompositionService';
import { PayrollVersionService } from '@/services/PayrollVersionService';
import { useToast } from '@/hooks/use-toast';

interface EditModeState {
  isActive: boolean;
  sessionId: string | null;
  periodId: string | null;
  companyId: string | null;
  compositionChanges: CompositionChange[];
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

interface PayrollEditContextType {
  editMode: EditModeState;
  enterEditMode: (periodId: string, companyId: string) => Promise<void>;
  exitEditMode: () => Promise<void>;
  addEmployeeToPeriod: (employeeId: string) => Promise<void>;
  removeEmployeeFromPeriod: (employeeId: string) => Promise<void>;
  applyChanges: (changesSummary: string) => Promise<void>;
  discardChanges: () => Promise<void>;
  refreshCompositionChanges: () => Promise<void>;
}

const PayrollEditContext = createContext<PayrollEditContextType | undefined>(undefined);

export const usePayrollEdit = () => {
  const context = useContext(PayrollEditContext);
  if (!context) {
    throw new Error('usePayrollEdit must be used within a PayrollEditProvider');
  }
  return context;
};

interface PayrollEditProviderProps {
  children: React.ReactNode;
}

export const PayrollEditProvider: React.FC<PayrollEditProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState<EditModeState>({
    isActive: false,
    sessionId: null,
    periodId: null,
    companyId: null,
    compositionChanges: [],
    isLoading: false,
    hasUnsavedChanges: false
  });

  const enterEditMode = useCallback(async (periodId: string, companyId: string) => {
    try {
      setEditMode(prev => ({ ...prev, isLoading: true }));
      console.log('🔄 Entering edit mode for period:', periodId);

      // Get current payroll data for snapshot
      const { data: payrolls, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', periodId);

      if (payrollError) {
        throw payrollError;
      }

      const snapshotData = {
        payrolls: payrolls || [],
        timestamp: new Date().toISOString()
      };

      // Create initial version
      await PayrollVersionService.createInitialVersion(periodId, companyId, snapshotData);

      // Create edit session
      const sessionData = {
        period_id: periodId,
        company_id: companyId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'active',
        changes: {},
        is_composition_edit: true,
        original_snapshot: snapshotData
      };

      const { data: session, error: sessionError } = await supabase
        .from('period_edit_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (sessionError) {
        throw sessionError;
      }

      setEditMode({
        isActive: true,
        sessionId: session.id,
        periodId,
        companyId,
        compositionChanges: [],
        isLoading: false,
        hasUnsavedChanges: false
      });

      toast({
        title: "Modo de edición activado",
        description: "Ahora puedes modificar la composición de empleados del período",
        className: "border-blue-200 bg-blue-50"
      });

      console.log('✅ Edit mode activated with session:', session.id);
    } catch (error) {
      console.error('❌ Error entering edit mode:', error);
      setEditMode(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error al activar modo de edición",
        description: "No se pudo activar el modo de edición",
        variant: "destructive"
      });
    }
  }, [toast]);

  const exitEditMode = useCallback(async () => {
    try {
      if (editMode.sessionId) {
        // Complete the session
        await supabase
          .from('period_edit_sessions')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', editMode.sessionId);
      }

      setEditMode({
        isActive: false,
        sessionId: null,
        periodId: null,
        companyId: null,
        compositionChanges: [],
        isLoading: false,
        hasUnsavedChanges: false
      });

      console.log('✅ Edit mode exited');
    } catch (error) {
      console.error('❌ Error exiting edit mode:', error);
    }
  }, [editMode.sessionId]);

  const addEmployeeToPeriod = useCallback(async (employeeId: string) => {
    if (!editMode.sessionId || !editMode.periodId || !editMode.companyId) {
      throw new Error('Edit mode not active');
    }

    try {
      await EmployeeCompositionService.addEmployeeToPeriod(
        editMode.periodId,
        employeeId,
        editMode.sessionId,
        editMode.companyId
      );

      setEditMode(prev => ({ ...prev, hasUnsavedChanges: true }));
      await refreshCompositionChanges();

      toast({
        title: "Empleado agregado",
        description: "El empleado ha sido agregado al período",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      toast({
        title: "Error al agregar empleado",
        description: "No se pudo agregar el empleado al período",
        variant: "destructive"
      });
    }
  }, [editMode.sessionId, editMode.periodId, editMode.companyId, toast]);

  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!editMode.sessionId || !editMode.periodId || !editMode.companyId) {
      throw new Error('Edit mode not active');
    }

    try {
      await EmployeeCompositionService.removeEmployeeFromPeriod(
        editMode.periodId,
        employeeId,
        editMode.sessionId,
        editMode.companyId
      );

      setEditMode(prev => ({ ...prev, hasUnsavedChanges: true }));
      await refreshCompositionChanges();

      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido del período",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error removing employee:', error);
      toast({
        title: "Error al remover empleado",
        description: "No se pudo remover el empleado del período",
        variant: "destructive"
      });
    }
  }, [editMode.sessionId, editMode.periodId, editMode.companyId, toast]);

  const refreshCompositionChanges = useCallback(async () => {
    if (!editMode.sessionId) return;

    try {
      const changes = await EmployeeCompositionService.getCompositionChanges(editMode.sessionId);
      setEditMode(prev => ({ ...prev, compositionChanges: changes }));
    } catch (error) {
      console.error('❌ Error refreshing composition changes:', error);
    }
  }, [editMode.sessionId]);

  const applyChanges = useCallback(async (changesSummary: string) => {
    if (!editMode.sessionId || !editMode.periodId || !editMode.companyId) {
      throw new Error('Edit mode not active');
    }

    try {
      setEditMode(prev => ({ ...prev, isLoading: true }));
      console.log('💾 Applying changes...');

      // Get updated payroll data for new snapshot
      const { data: updatedPayrolls, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', editMode.periodId);

      if (payrollError) {
        throw payrollError;
      }

      const newSnapshotData = {
        payrolls: updatedPayrolls || [],
        compositionChanges: editMode.compositionChanges,
        timestamp: new Date().toISOString()
      };

      // Create new version
      await PayrollVersionService.createNewVersion(
        editMode.periodId,
        editMode.companyId,
        newSnapshotData,
        changesSummary
      );

      // Complete the session
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', editMode.sessionId);

      setEditMode({
        isActive: false,
        sessionId: null,
        periodId: null,
        companyId: null,
        compositionChanges: [],
        isLoading: false,
        hasUnsavedChanges: false
      });

      toast({
        title: "Cambios aplicados correctamente",
        description: "Se ha creado una nueva versión del período con los cambios realizados",
        className: "border-green-200 bg-green-50"
      });

      console.log('✅ Changes applied successfully');
    } catch (error) {
      console.error('❌ Error applying changes:', error);
      setEditMode(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error al aplicar cambios",
        description: "No se pudieron aplicar los cambios",
        variant: "destructive"
      });
    }
  }, [editMode, toast]);

  const discardChanges = useCallback(async () => {
    if (!editMode.sessionId) return;

    try {
      setEditMode(prev => ({ ...prev, isLoading: true }));
      console.log('🗑️ Discarding changes...');

      // Delete all snapshots for this session
      await supabase
        .from('period_edit_snapshots')
        .delete()
        .eq('session_id', editMode.sessionId);

      // Complete the session as cancelled
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', editMode.sessionId);

      setEditMode({
        isActive: false,
        sessionId: null,
        periodId: null,
        companyId: null,
        compositionChanges: [],
        isLoading: false,
        hasUnsavedChanges: false
      });

      toast({
        title: "Cambios descartados",
        description: "Todos los cambios han sido descartados y el período vuelve a su estado original",
        className: "border-gray-200 bg-gray-50"
      });

      console.log('✅ Changes discarded successfully');
    } catch (error) {
      console.error('❌ Error discarding changes:', error);
      setEditMode(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error al descartar cambios",
        description: "No se pudieron descartar los cambios",
        variant: "destructive"
      });
    }
  }, [editMode.sessionId, toast]);

  const value: PayrollEditContextType = {
    editMode,
    enterEditMode,
    exitEditMode,
    addEmployeeToPeriod,
    removeEmployeeFromPeriod,
    applyChanges,
    discardChanges,
    refreshCompositionChanges
  };

  return (
    <PayrollEditContext.Provider value={value}>
      {children}
    </PayrollEditContext.Provider>
  );
};