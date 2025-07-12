import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';

export class EmployeeUnifiedService {
  static async getAll(includeDeleted: boolean = false): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching all employees');
      
      let query = supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      // Por defecto, excluir empleados eliminados
      if (!includeDeleted) {
        query = query.neq('estado', 'eliminado');
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching employees:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Fetched', data?.length || 0, 'employees');
      
      return {
        success: true,
        data: (data || []).map(mapDatabaseToUnified)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService getAll error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getById(id: string): Promise<{ success: boolean; data?: EmployeeUnified | null; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching employee by ID:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error fetching employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Fetched employee:', data?.nombre, data?.apellido);
      
      return {
        success: true,
        data: data ? mapDatabaseToUnified(data) : null
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService getById error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeById(id: string): Promise<{ success: boolean; data?: EmployeeUnified | null; error?: string }> {
    return this.getById(id);
  }

  static async create(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Creating employee with data:', employeeData);
      
      // Get current user's company ID
      const { data: companyData, error: companyError } = await supabase
        .rpc('get_current_user_company_id');

      if (companyError || !companyData) {
        console.error('❌ Error getting company ID:', companyError);
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Map to database format
      const dbData = mapUnifiedToDatabase({
        ...employeeData,
        id: '',
        company_id: companyData
      } as EmployeeUnified);

      const { data, error } = await supabase
        .from('employees')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating employee:', error);
        throw error;
      }

      console.log('✅ EmployeeUnifiedService: Employee created successfully:', data);
      
      return {
        success: true,
        data: mapDatabaseToUnified(data)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService create error:', error);
      return {
        success: false,
        error: error.message || 'Error creating employee'
      };
    }
  }

  static async update(id: string, employeeData: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Updating employee:', id, 'with data:', employeeData);
      
      // Map to database format
      const dbData = mapUnifiedToDatabase({
        ...employeeData,
        id
      } as EmployeeUnified);
      
      const { data, error } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee updated successfully:', data);
      
      return {
        success: true,
        data: mapDatabaseToUnified(data)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService update error:', error);
      return {
        success: false,
        error: error.message || 'Error updating employee'
      };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Logically deleting employee:', id);
      
      // Verificar si el empleado tiene registros relacionados
      const hasRelatedRecords = await this.checkRelatedRecords(id);
      
      if (hasRelatedRecords.hasRecords) {
        console.log('⚠️ Employee has related records:', hasRelatedRecords.details);
      }

      // Cambiar estado a 'eliminado' en lugar de eliminar físicamente
      const { error } = await supabase
        .from('employees')
        .update({ 
          estado: 'eliminado',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error logically deleting employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee logically deleted successfully:', id);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService delete error:', error);
      return { success: false, error: error.message };
    }
  }

  static async physicalDelete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Physically deleting employee:', id);
      
      // Verificar registros relacionados antes de eliminación física
      const hasRelatedRecords = await this.checkRelatedRecords(id);
      
      if (hasRelatedRecords.hasRecords) {
        return { 
          success: false, 
          error: `No se puede eliminar físicamente: el empleado tiene ${hasRelatedRecords.details.join(', ')}` 
        };
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error physically deleting employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee physically deleted successfully:', id);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService physicalDelete error:', error);
      return { success: false, error: error.message };
    }
  }

  static async restore(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Restoring employee:', id);
      
      const { error } = await supabase
        .from('employees')
        .update({ 
          estado: 'activo',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error restoring employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee restored successfully:', id);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService restore error:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkRelatedRecords(employeeId: string): Promise<{ 
    hasRecords: boolean; 
    details: string[];
    counts: Record<string, number>;
  }> {
    try {
      const details: string[] = [];
      const counts: Record<string, number> = {};

      // Verificar registros de nómina
      const { count: payrollCount } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId);

      if (payrollCount && payrollCount > 0) {
        details.push(`${payrollCount} registros de nómina`);
        counts.payrolls = payrollCount;
      }

      // Verificar notas del empleado
      const { count: notesCount } = await supabase
        .from('employee_notes')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId);

      if (notesCount && notesCount > 0) {
        details.push(`${notesCount} notas`);
        counts.notes = notesCount;
      }

      // Verificar balances de vacaciones
      const { count: balancesCount } = await supabase
        .from('employee_vacation_balances')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId);

      if (balancesCount && balancesCount > 0) {
        details.push(`${balancesCount} balances de vacaciones`);
        counts.vacation_balances = balancesCount;
      }

      // Verificar períodos de vacaciones
      const { count: vacationPeriodsCount } = await supabase
        .from('employee_vacation_periods')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId);

      if (vacationPeriodsCount && vacationPeriodsCount > 0) {
        details.push(`${vacationPeriodsCount} períodos de vacaciones`);
        counts.vacation_periods = vacationPeriodsCount;
      }

      // Verificar comprobantes de nómina
      const { count: vouchersCount } = await supabase
        .from('payroll_vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId);

      if (vouchersCount && vouchersCount > 0) {
        details.push(`${vouchersCount} comprobantes de nómina`);
        counts.vouchers = vouchersCount;
      }

      return {
        hasRecords: details.length > 0,
        details,
        counts
      };
    } catch (error) {
      console.error('❌ Error checking related records:', error);
      return { hasRecords: false, details: [], counts: {} };
    }
  }

  static async changeStatus(id: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Changing employee status:', id, 'to', newStatus);
      
      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) {
        console.error('❌ Error changing employee status:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee status changed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService changeStatus error:', error);
      return { success: false, error: error.message };
    }
  }
}
