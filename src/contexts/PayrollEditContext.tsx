import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeCompositionService, CompositionChange } from '@/services/EmployeeCompositionService';
import { PayrollVersionService } from '@/services/PayrollVersionService';
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';

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

      // Enrich snapshot with employee identity data
      const employeeIds = [...new Set((payrolls || []).map(p => p.employee_id))];
      const { data: employeesIdentity, error: employeesError } = await supabase
        .from('employees')
        .select('id, nombre, apellido, tipo_documento, cedula')
        .in('id', employeeIds);

      if (employeesError) {
        console.warn('Warning: Could not fetch employee identity:', employeesError);
      }

      const employeeIdentityMap = new Map(
        (employeesIdentity || []).map(emp => [emp.id, emp])
      );

      // Embed identity directly into each payroll item for self-contained snapshots
      const enrichedPayrolls = (payrolls || []).map(p => {
        const emp = employeeIdentityMap.get(p.employee_id);
        return {
          ...p,
          employee_nombre: emp?.nombre ?? null,
          employee_apellido: emp?.apellido ?? null,
          employee_cedula: emp?.cedula ?? null,
          employee_tipo_documento: emp?.tipo_documento ?? null,
        };
      });

      const snapshotData = {
        payrolls: enrichedPayrolls,
        employeeIdentity: Object.fromEntries(employeeIdentityMap),
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

  const calculateDiasTrabajados = (period: any): number => {
    const daysInfo = PayrollCalculationService.getDaysInfo({
      tipo_periodo: period.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
      fecha_inicio: period.fecha_inicio,
      fecha_fin: period.fecha_fin
    });
    return daysInfo.legalDays;
  };

  const applyChanges = useCallback(async (changesSummary: string) => {
    if (!editMode.sessionId || !editMode.periodId || !editMode.companyId) {
      throw new Error('Edit mode not active');
    }

    try {
      setEditMode(prev => ({ ...prev, isLoading: true }));
      console.log('💾 Applying changes...');

      // ========== PROCESAR CAMBIOS DE COMPOSICIÓN (SNAPSHOTS) ==========
      console.log('🔍 Procesando snapshots de composición...');

      // 1. Leer snapshots de la sesión
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('period_edit_snapshots')
        .select('*')
        .eq('session_id', editMode.sessionId);

      if (snapshotsError) {
        console.error('Error loading snapshots:', snapshotsError);
        throw snapshotsError;
      }

      if (snapshots && snapshots.length > 0) {
        console.log(`📊 Found ${snapshots.length} composition changes to apply`);
        
        // 2. Procesar ADICIONES (is_added = true)
        const addedSnapshots = (snapshots as any[]).filter((s: any) => s.is_added);
        for (const snapshot of addedSnapshots) {
          try {
            const employeeId = (snapshot as any).employee_id;
            const modifiedData = (snapshot as any).modified_data;
            
            console.log(`➕ Processing added employee: ${employeeId}`);
            
            // Cargar datos completos del empleado
            const { data: employee, error: empError } = await supabase
              .from('employees')
              .select('*')
              .eq('id', employeeId)
              .single();
            
            if (empError || !employee) {
              console.error(`Error loading employee ${employeeId}:`, empError);
              continue;
            }
            
            // Cargar datos del período
            const { data: period, error: periodError } = await supabase
              .from('payroll_periods_real')
              .select('*')
              .eq('id', editMode.periodId)
              .single();
            
            if (periodError || !period) {
              console.error('Error loading period:', periodError);
              continue;
            }
            
            // Calcular días trabajados
            const diasTrabajados = calculateDiasTrabajados(period);
            
            // Cargar novedades del empleado para este período
            const { data: novedades, error: novedadesError } = await supabase
              .from('payroll_novedades')
              .select('*')
              .eq('periodo_id', editMode.periodId)
              .eq('empleado_id', employeeId);
            
            if (novedadesError) {
              console.warn('Warning loading novedades:', novedadesError);
            }
            
            // Convertir novedades al formato del backend
            const novedadesForIBC = convertNovedadesToIBC(novedades || []);
            
            // Calcular valores con backend
            const calculationInput: PayrollCalculationInput = {
              baseSalary: employee.salario_base,
              workedDays: diasTrabajados,
              extraHours: 0,
              disabilities: 0,
              bonuses: 0,
              absences: 0,
              periodType: period.tipo_periodo === 'quincenal' ? 'quincenal' : 'mensual',
              novedades: novedadesForIBC,
              year: new Date(period.fecha_inicio).getFullYear().toString()
            };
            
            const result = await PayrollCalculationBackendService.calculatePayroll(calculationInput);
            
            console.log(`✅ Calculated payroll for ${employee.nombre} ${employee.apellido}:`, {
              grossPay: result.grossPay,
              netPay: result.netPay,
              ibc: result.ibc
            });
            
            // Insertar en tabla payrolls
            const { error: insertError } = await supabase
              .from('payrolls')
              .insert({
                company_id: editMode.companyId,
                period_id: editMode.periodId,
                employee_id: employeeId,
                periodo: period.periodo,
                salario_base: employee.salario_base,
                dias_trabajados: diasTrabajados,
                total_devengado: result.grossPay,
                total_deducciones: result.totalDeductions,
                neto_pagado: result.netPay,
                auxilio_transporte: result.transportAllowance,
                salud_empleado: result.healthDeduction,
                pension_empleado: result.pensionDeduction,
                ibc: result.ibc,
                estado: period.estado,
                created_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error(`Error inserting payroll for ${employeeId}:`, insertError);
              throw insertError;
            }
            
            console.log(`✅ Employee ${employee.nombre} ${employee.apellido} added to payrolls`);
          } catch (error) {
            console.error('Error processing added employee:', error);
            throw error;
          }
        }
        
        // 3. Procesar ELIMINACIONES (is_removed = true)
        const removedSnapshots = (snapshots as any[]).filter((s: any) => s.is_removed);
        for (const snapshot of removedSnapshots) {
          const employeeId = (snapshot as any).employee_id;
          console.log(`➖ Processing removed employee: ${employeeId}`);
          
          const { error: deleteError } = await supabase
            .from('payrolls')
            .delete()
            .eq('period_id', editMode.periodId)
            .eq('employee_id', employeeId);
          
          if (deleteError) {
            console.error(`Error deleting payroll for ${employeeId}:`, deleteError);
            throw deleteError;
          }
          
          console.log(`✅ Employee ${employeeId} removed from payrolls`);
        }
        
        // 4. Actualizar totales del período
        const { data: allPayrolls, error: totalsError } = await supabase
          .from('payrolls')
          .select('total_devengado, total_deducciones, neto_pagado')
          .eq('period_id', editMode.periodId);
        
        if (totalsError) {
          console.error('Error calculating totals:', totalsError);
          throw totalsError;
        }
        
        const totals = (allPayrolls || []).reduce((acc, p) => ({
          devengado: acc.devengado + (p.total_devengado || 0),
          deducciones: acc.deducciones + (p.total_deducciones || 0),
          neto: acc.neto + (p.neto_pagado || 0)
        }), { devengado: 0, deducciones: 0, neto: 0 });
        
        const { error: updateTotalsError } = await supabase
          .from('payroll_periods_real')
          .update({
            empleados_count: allPayrolls.length,
            total_devengado: totals.devengado,
            total_deducciones: totals.deducciones,
            total_neto: totals.neto,
            updated_at: new Date().toISOString()
          })
          .eq('id', editMode.periodId);
        
        if (updateTotalsError) {
          console.error('Error updating period totals:', updateTotalsError);
          throw updateTotalsError;
        }
        
        console.log(`✅ Period totals updated: ${allPayrolls.length} employees`);
        
        // 5. Limpiar snapshots procesados
        const { error: cleanupError } = await supabase
          .from('period_edit_snapshots')
          .delete()
          .eq('session_id', editMode.sessionId);
        
        if (cleanupError) {
          console.warn('Warning cleaning up snapshots:', cleanupError);
        } else {
          console.log('✅ Snapshots cleaned up');
        }
      }
      // ========== FIN PROCESAMIENTO DE SNAPSHOTS ==========

      // Get updated payroll data for new snapshot
      const { data: updatedPayrolls, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', editMode.periodId);

      if (payrollError) {
        throw payrollError;
      }

      // Enrich snapshot with employee identity data
      const employeeIds = [...new Set((updatedPayrolls || []).map(p => p.employee_id))];
      const { data: employeesIdentity, error: employeesError } = await supabase
        .from('employees')
        .select('id, nombre, apellido, tipo_documento, cedula')
        .in('id', employeeIds);

      if (employeesError) {
        console.warn('Warning: Could not fetch employee identity:', employeesError);
      }

      const employeeIdentityMap = new Map(
        (employeesIdentity || []).map(emp => [emp.id, emp])
      );

      // Embed identity directly into each payroll item for self-contained snapshots
      const enrichedPayrolls = (updatedPayrolls || []).map(p => {
        const emp = employeeIdentityMap.get(p.employee_id);
        return {
          ...p,
          employee_nombre: emp?.nombre ?? null,
          employee_apellido: emp?.apellido ?? null,
          employee_cedula: emp?.cedula ?? null,
          employee_tipo_documento: emp?.tipo_documento ?? null,
        };
      });

      const newSnapshotData = {
        payrolls: enrichedPayrolls,
        employeeIdentity: Object.fromEntries(employeeIdentityMap),
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