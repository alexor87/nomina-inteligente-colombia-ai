import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';

export interface AvailableEmployee {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  salario_base: number;
  estado: string;
}

export interface CompositionChange {
  employeeId: string;
  employeeName: string;
  action: 'add' | 'remove';
  timestamp: string;
}

export class EmployeeCompositionService {
  /**
   * Get employees that can be added to a payroll period (not currently in the period)
   */
  static async getAvailableEmployees(periodId: string, companyId: string): Promise<AvailableEmployee[]> {
    try {
      console.log('🔍 Getting available employees for period:', periodId);

      // Get all active employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, salario_base, estado')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        throw employeesError;
      }

      // Get employees already in this period
      const { data: payrollEmployees, error: payrollError } = await supabase
        .from('payrolls')
        .select('employee_id')
        .eq('period_id', periodId);

      if (payrollError) {
        console.error('❌ Error fetching payroll employees:', payrollError);
        throw payrollError;
      }

      const existingEmployeeIds = new Set(payrollEmployees?.map(p => p.employee_id) || []);
      
      // Filter out employees already in the period
      const availableEmployees = (allEmployees || []).filter(
        emp => !existingEmployeeIds.has(emp.id)
      );

      console.log('✅ Available employees found:', availableEmployees.length);
      return availableEmployees;
    } catch (error) {
      console.error('❌ Error in getAvailableEmployees:', error);
      throw error;
    }
  }

  /**
   * Add an employee to a payroll period
   */
  static async addEmployeeToPeriod(
    periodId: string, 
    employeeId: string, 
    sessionId: string,
    companyId: string
  ): Promise<void> {
    try {
      console.log('➕ Adding employee to period:', { periodId, employeeId, sessionId });

      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        throw new Error('Employee not found');
      }

      // Get period data for calculation
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        throw new Error('Period not found');
      }

      // Create snapshot record using direct insert
      const { error: snapshotError } = await supabase
        .from('period_edit_snapshots')
        .insert({
          company_id: companyId,
          period_id: periodId,
          session_id: sessionId,
          employee_id: employeeId,
          original_data: {},
          modified_data: {
            employee: employee,
            period: period,
            action: 'add'
          },
          is_added: true,
          is_removed: false
        } as any);

      // Update session composition changes
      const { data: session, error: sessionFetchError } = await supabase
        .from('period_edit_sessions')
        .select('composition_changes')
        .eq('id', sessionId)
        .single();

      if (sessionFetchError) {
        throw sessionFetchError;
      }

      const currentChanges = (session?.composition_changes as any) || { added_employees: [], removed_employees: [] };
      currentChanges.added_employees.push({
        employeeId,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        action: 'add',
        timestamp: new Date().toISOString()
      });

      const { error: sessionError } = await supabase
        .from('period_edit_sessions')
        .update({ 
          composition_changes: currentChanges,
          is_composition_edit: true
        })
        .eq('id', sessionId);

      if (sessionError) {
        throw sessionError;
      }

      console.log('✅ Employee added to period successfully');
    } catch (error) {
      console.error('❌ Error adding employee to period:', error);
      throw error;
    }
  }

  /**
   * Remove an employee from a payroll period
   */
  static async removeEmployeeFromPeriod(
    periodId: string, 
    employeeId: string, 
    sessionId: string,
    companyId: string
  ): Promise<void> {
    try {
      console.log('➖ Removing employee from period:', { periodId, employeeId, sessionId });

      // Get current payroll data for this employee
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', periodId)
        .eq('employee_id', employeeId)
        .single();

      if (payrollError) {
        console.error('❌ Error fetching payroll:', payrollError);
        throw payrollError;
      }

      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('nombre, apellido')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        throw new Error('Employee not found');
      }

      // Create snapshot record using direct insert
      const { error: snapshotError } = await supabase
        .from('period_edit_snapshots')
        .insert({
          company_id: companyId,
          period_id: periodId,
          session_id: sessionId,
          employee_id: employeeId,
          original_data: { payroll },
          modified_data: { action: 'remove' },
          is_added: false,
          is_removed: true
        } as any);

      if (snapshotError) {
        console.error('❌ Error creating snapshot:', snapshotError);
        throw snapshotError;
      }

      // Update session composition changes
      const { data: session, error: sessionFetchError } = await supabase
        .from('period_edit_sessions')
        .select('composition_changes')
        .eq('id', sessionId)
        .single();

      if (sessionFetchError) {
        throw sessionFetchError;
      }

      const currentChanges = (session?.composition_changes as any) || { added_employees: [], removed_employees: [] };
      currentChanges.removed_employees.push({
        employeeId,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        action: 'remove',
        timestamp: new Date().toISOString()
      });

      const { error: sessionError } = await supabase
        .from('period_edit_sessions')
        .update({ 
          composition_changes: currentChanges,
          is_composition_edit: true
        })
        .eq('id', sessionId);

      if (sessionError) {
        throw sessionError;
      }

      console.log('✅ Employee removed from period successfully');
    } catch (error) {
      console.error('❌ Error removing employee from period:', error);
      throw error;
    }
  }

  /**
   * Get composition changes for a session
   */
  static async getCompositionChanges(sessionId: string): Promise<CompositionChange[]> {
    try {
      const { data: session, error } = await supabase
        .from('period_edit_sessions')
        .select('composition_changes')
        .eq('id', sessionId)
        .single();

      if (error) {
        throw error;
      }

      const changes = (session?.composition_changes as any) || { added_employees: [], removed_employees: [] };
      return [...changes.added_employees, ...changes.removed_employees];
    } catch (error) {
      console.error('❌ Error getting composition changes:', error);
      throw error;
    }
  }
}