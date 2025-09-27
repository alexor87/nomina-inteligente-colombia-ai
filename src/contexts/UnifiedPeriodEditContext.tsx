import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayrollCalculationBackendService } from '@/services/PayrollCalculationBackendService';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

// Types for unified editing
export interface PeriodEmployee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  payroll_id?: string;
  isNew?: boolean; // Added in this editing session
  isRemoved?: boolean; // Removed in this editing session
}

export interface PeriodNovedad {
  id: string;
  employee_id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  dias?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observacion?: string;
  isNew?: boolean; // Added in this editing session
  isModified?: boolean; // Modified in this editing session
  isRemoved?: boolean; // Removed in this editing session
}

export interface PeriodTotals {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

export interface UnifiedEditState {
  isActive: boolean;
  periodId: string | null;
  companyId: string | null;
  employees: PeriodEmployee[];
  novedades: PeriodNovedad[];
  originalTotals: PeriodTotals;
  currentTotals: PeriodTotals;
  hasChanges: boolean;
  isRecalculating: boolean;
  sessionId: string | null;
}

interface UnifiedPeriodEditContextType {
  editState: UnifiedEditState;
  startEditSession: (periodId: string, companyId: string) => Promise<void>;
  endEditSession: () => Promise<void>;
  addEmployee: (employeeId: string) => Promise<void>;
  removeEmployee: (employeeId: string) => void;
  addNovedad: (novedad: Omit<PeriodNovedad, 'id' | 'isNew'>) => void;
  updateNovedad: (novedadId: string, updates: Partial<PeriodNovedad>) => void;
  removeNovedad: (novedadId: string) => void;
  recalculatePreview: () => Promise<void>;
  saveChanges: (justification: string) => Promise<void>;
  discardChanges: () => void;
}

const UnifiedPeriodEditContext = createContext<UnifiedPeriodEditContextType | undefined>(undefined);

export const useUnifiedPeriodEdit = () => {
  const context = useContext(UnifiedPeriodEditContext);
  if (!context) {
    throw new Error('useUnifiedPeriodEdit must be used within a UnifiedPeriodEditProvider');
  }
  return context;
};

interface UnifiedPeriodEditProviderProps {
  children: React.ReactNode;
}

export const UnifiedPeriodEditProvider: React.FC<UnifiedPeriodEditProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [editState, setEditState] = useState<UnifiedEditState>({
    isActive: false,
    periodId: null,
    companyId: null,
    employees: [],
    novedades: [],
    originalTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
    currentTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
    hasChanges: false,
    isRecalculating: false,
    sessionId: null
  });

  // Debounced recalculation - trigger after 500ms of no changes
  const debouncedRecalculate = useDebounce(recalculatePreview, 500);

  // Auto-recalculate when employees or novedades change
  useEffect(() => {
    if (editState.isActive && editState.hasChanges) {
      console.log('🔄 Changes detected, scheduling recalculation...');
      debouncedRecalculate();
    }
  }, [editState.employees, editState.novedades, editState.hasChanges, debouncedRecalculate]);

  // Load period data and start editing session
  const startEditSession = useCallback(async (periodId: string, companyId: string) => {
    try {
      setEditState(prev => ({ ...prev, isRecalculating: true }));
      console.log('🚀 Starting unified editing session for period:', periodId);

      // Load existing employees from payrolls
      const { data: payrolls, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employee:employees(id, nombre, apellido, cedula, cargo, salario_base)
        `)
        .eq('period_id', periodId);

      if (payrollError) throw payrollError;

      // Transform to PeriodEmployee format
      const employees: PeriodEmployee[] = (payrolls || []).map(p => ({
        id: p.employee_id,
        nombre: p.employee?.nombre || '',
        apellido: p.employee?.apellido || '',
        cedula: p.employee?.cedula || '',
        cargo: p.employee?.cargo || '',
        salario_base: p.employee?.salario_base || p.salario_base,
        dias_trabajados: p.dias_trabajados,
        total_devengado: p.total_devengado,
        total_deducciones: p.total_deducciones,
        neto_pagado: p.neto_pagado,
        payroll_id: p.id
      }));

      // Load existing novedades
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('periodo_id', periodId);

      if (novedadesError) throw novedadesError;

      const periodNovedades: PeriodNovedad[] = (novedades || []).map(n => ({
        id: n.id,
        employee_id: n.empleado_id,
        tipo_novedad: n.tipo_novedad,
        subtipo: n.subtipo,
        valor: n.valor,
        dias: n.dias,
        fecha_inicio: n.fecha_inicio,
        fecha_fin: n.fecha_fin,
        observacion: n.observacion
      }));

      // Calculate original totals
      const originalTotals = calculateTotals(employees);

      // Create editing session
      const { data: session, error: sessionError } = await supabase
        .from('period_edit_sessions')
        .insert({
          period_id: periodId,
          company_id: companyId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'active',
          is_composition_edit: true
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      setEditState({
        isActive: true,
        periodId,
        companyId,
        employees,
        novedades: periodNovedades,
        originalTotals,
        currentTotals: originalTotals,
        hasChanges: false,
        isRecalculating: false,
        sessionId: session.id
      });

      // Save session state to sessionStorage for recovery
      sessionStorage.setItem(`unified-edit-${periodId}`, JSON.stringify({
        employees,
        novedades: periodNovedades,
        originalTotals
      }));

      toast({
        title: "Editor Unificado Activado",
        description: "Ahora puedes editar empleados y novedades en tiempo real",
        className: "border-blue-200 bg-blue-50"
      });

      console.log('✅ Unified editing session started:', session.id);
    } catch (error) {
      console.error('❌ Error starting unified edit session:', error);
      setEditState(prev => ({ ...prev, isRecalculating: false }));
      toast({
        title: "Error al iniciar edición",
        description: "No se pudo iniciar la sesión de edición unificada",
        variant: "destructive"
      });
    }
  }, [toast]);

  // End editing session
  const endEditSession = useCallback(async () => {
    try {
      if (editState.sessionId) {
        await supabase
          .from('period_edit_sessions')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', editState.sessionId);
      }

      // Clear session storage
      if (editState.periodId) {
        sessionStorage.removeItem(`unified-edit-${editState.periodId}`);
      }

      setEditState({
        isActive: false,
        periodId: null,
        companyId: null,
        employees: [],
        novedades: [],
        originalTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        currentTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        hasChanges: false,
        isRecalculating: false,
        sessionId: null
      });

      console.log('✅ Unified editing session ended');
    } catch (error) {
      console.error('❌ Error ending unified edit session:', error);
    }
  }, [editState.sessionId, editState.periodId]);

  // Add employee to period
  const addEmployee = useCallback(async (employeeId: string) => {
    try {
      // Load employee data
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error || !employee) throw error || new Error('Employee not found');

      const newEmployee: PeriodEmployee = {
        id: employeeId,
        nombre: employee.nombre,
        apellido: employee.apellido,
        cedula: employee.cedula,
        cargo: employee.cargo || '',
        salario_base: employee.salario_base,
        dias_trabajados: 30, // Default for new employee
        total_devengado: employee.salario_base,
        total_deducciones: employee.salario_base * 0.08,
        neto_pagado: employee.salario_base * 0.92,
        isNew: true
      };

      setEditState(prev => ({
        ...prev,
        employees: [...prev.employees, newEmployee],
        hasChanges: true
      }));

      // Save to session storage
      saveToSessionStorage();

      toast({
        title: "Empleado agregado",
        description: `${employee.nombre} ${employee.apellido} agregado al período`,
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
  }, []);

  // Remove employee from period
  const removeEmployee = useCallback((employeeId: string) => {
    setEditState(prev => ({
      ...prev,
      employees: prev.employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isRemoved: true }
          : emp
      ),
      hasChanges: true
    }));

    saveToSessionStorage();

    toast({
      title: "Empleado removido",
      description: "El empleado será removido del período al guardar cambios",
      className: "border-orange-200 bg-orange-50"
    });
  }, []);

  // Add novedad
  const addNovedad = useCallback((novedad: Omit<PeriodNovedad, 'id' | 'isNew'>) => {
    const newNovedad: PeriodNovedad = {
      ...novedad,
      id: `temp-${Date.now()}`,
      isNew: true
    };

    setEditState(prev => ({
      ...prev,
      novedades: [...prev.novedades, newNovedad],
      hasChanges: true
    }));

    saveToSessionStorage();
  }, []);

  // Update novedad
  const updateNovedad = useCallback((novedadId: string, updates: Partial<PeriodNovedad>) => {
    setEditState(prev => ({
      ...prev,
      novedades: prev.novedades.map(nov => 
        nov.id === novedadId 
          ? { ...nov, ...updates, isModified: true }
          : nov
      ),
      hasChanges: true
    }));

    saveToSessionStorage();
  }, []);

  // Remove novedad
  const removeNovedad = useCallback((novedadId: string) => {
    setEditState(prev => ({
      ...prev,
      novedades: prev.novedades.map(nov => 
        nov.id === novedadId 
          ? { ...nov, isRemoved: true }
          : nov
      ),
      hasChanges: true
    }));

    saveToSessionStorage();
  }, []);

  // Recalculate preview using backend service
  async function recalculatePreview() {
    if (!editState.isActive || editState.isRecalculating) return;

    try {
      setEditState(prev => ({ ...prev, isRecalculating: true }));
      console.log('🧮 Recalculating period preview...');

      const activeEmployees = editState.employees.filter(emp => !emp.isRemoved);
      const activeNovedades = editState.novedades.filter(nov => !nov.isRemoved);

      // Calculate each employee with their novedades
      const updatedEmployees = await Promise.all(
        activeEmployees.map(async (employee) => {
          try {
            const employeeNovedades = activeNovedades.filter(nov => nov.employee_id === employee.id);
            
            // Convert to IBC format for backend calculation
            const novedadesForIBC = employeeNovedades.map(nov => ({
              tipo_novedad: nov.tipo_novedad,
              subtipo: nov.subtipo,
              valor: nov.valor,
              dias: nov.dias,
              es_deduccion: ['descuento_voluntario', 'libranza', 'retencion_fuente', 'multa'].includes(nov.tipo_novedad),
              constitutivo_salario: !['descuento_voluntario', 'libranza', 'retencion_fuente', 'multa'].includes(nov.tipo_novedad)
            }));

            const result = await PayrollCalculationBackendService.calculatePayroll({
              baseSalary: employee.salario_base,
              workedDays: employee.dias_trabajados,
              extraHours: 0,
              disabilities: 0,
              bonuses: 0,
              absences: 0,
              periodType: 'mensual',
              novedades: novedadesForIBC,
              year: '2025'
            });

            return {
              ...employee,
              total_devengado: result.grossPay,
              total_deducciones: result.totalDeductions,
              neto_pagado: result.netPay
            };
          } catch (error) {
            console.error(`Error calculating employee ${employee.id}:`, error);
            return employee;
          }
        })
      );

      const newTotals = calculateTotals(updatedEmployees);

      setEditState(prev => ({
        ...prev,
        employees: prev.employees.map(emp => {
          const updated = updatedEmployees.find(upd => upd.id === emp.id);
          return updated || emp;
        }),
        currentTotals: newTotals,
        isRecalculating: false
      }));

      console.log('✅ Preview recalculation completed');
    } catch (error) {
      console.error('❌ Error recalculating preview:', error);
      setEditState(prev => ({ ...prev, isRecalculating: false }));
    }
  }

  // Save changes atomically using edge function
  const saveChanges = useCallback(async (justification: string) => {
    if (!editState.periodId || !editState.companyId || !editState.sessionId) {
      throw new Error('No active editing session');
    }

    try {
      setEditState(prev => ({ ...prev, isRecalculating: true }));
      console.log('💾 Saving unified changes atomically...');

      // Prepare changes summary
      const addedEmployees = editState.employees.filter(emp => emp.isNew && !emp.isRemoved);
      const removedEmployees = editState.employees.filter(emp => emp.isRemoved);
      const addedNovedades = editState.novedades.filter(nov => nov.isNew && !nov.isRemoved);
      const modifiedNovedades = editState.novedades.filter(nov => nov.isModified && !nov.isRemoved);
      const removedNovedades = editState.novedades.filter(nov => nov.isRemoved);

      // Call enhanced edge function for atomic save
      const { data, error } = await supabase.functions.invoke('reliquidate-period-adjustments', {
        body: {
          periodId: editState.periodId,
          unifiedChanges: {
            addedEmployees: addedEmployees.map(emp => emp.id),
            removedEmployees: removedEmployees.map(emp => emp.id),
            addedNovedades,
            modifiedNovedades,
            removedNovedades: removedNovedades.map(nov => nov.id)
          },
          justification,
          changeType: 'unified_edit'
        }
      });

      if (error) throw error;

      // Mark session as completed
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', editState.sessionId);

      // Clear session storage
      sessionStorage.removeItem(`unified-edit-${editState.periodId}`);

      setEditState({
        isActive: false,
        periodId: null,
        companyId: null,
        employees: [],
        novedades: [],
        originalTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        currentTotals: { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        hasChanges: false,
        isRecalculating: false,
        sessionId: null
      });

      toast({
        title: "Cambios guardados exitosamente",
        description: `Período reliquidado con ${data.employeesAffected} empleados afectados`,
        className: "border-green-200 bg-green-50"
      });

      console.log('✅ Unified changes saved successfully:', data);
    } catch (error) {
      console.error('❌ Error saving unified changes:', error);
      setEditState(prev => ({ ...prev, isRecalculating: false }));
      toast({
        title: "Error al guardar cambios",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
      throw error;
    }
  }, [editState, toast]);

  // Discard changes
  const discardChanges = useCallback(() => {
    if (editState.periodId) {
      sessionStorage.removeItem(`unified-edit-${editState.periodId}`);
    }

    setEditState(prev => ({
      ...prev,
      employees: prev.employees.filter(emp => !emp.isNew).map(emp => ({
        ...emp,
        isRemoved: false,
        isModified: false
      })),
      novedades: prev.novedades.filter(nov => !nov.isNew).map(nov => ({
        ...nov,
        isRemoved: false,
        isModified: false
      })),
      currentTotals: prev.originalTotals,
      hasChanges: false
    }));

    toast({
      title: "Cambios descartados",
      description: "Todos los cambios han sido revertidos",
      className: "border-gray-200 bg-gray-50"
    });
  }, [editState.periodId, toast]);

  // Helper functions
  const calculateTotals = (employees: PeriodEmployee[]): PeriodTotals => {
    const activeEmployees = employees.filter(emp => !emp.isRemoved);
    return {
      totalEmployees: activeEmployees.length,
      totalGrossPay: activeEmployees.reduce((sum, emp) => sum + emp.total_devengado, 0),
      totalDeductions: activeEmployees.reduce((sum, emp) => sum + emp.total_deducciones, 0),
      totalNetPay: activeEmployees.reduce((sum, emp) => sum + emp.neto_pagado, 0)
    };
  };

  const saveToSessionStorage = () => {
    if (editState.periodId) {
      sessionStorage.setItem(`unified-edit-${editState.periodId}`, JSON.stringify({
        employees: editState.employees,
        novedades: editState.novedades,
        originalTotals: editState.originalTotals
      }));
    }
  };

  const value: UnifiedPeriodEditContextType = {
    editState,
    startEditSession,
    endEditSession,
    addEmployee,
    removeEmployee,
    addNovedad,
    updateNovedad,
    removeNovedad,
    recalculatePreview,
    saveChanges,
    discardChanges
  };

  return (
    <UnifiedPeriodEditContext.Provider value={value}>
      {children}
    </UnifiedPeriodEditContext.Provider>
  );
};