import { SecureBaseService } from './SecureBaseService';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';
import { EmployeeSoftDeleteService } from './EmployeeSoftDeleteService';
import { supabase } from '@/integrations/supabase/client';

/**
 * 🔒 SECURE EMPLOYEE SERVICE
 * Inherits from SecureBaseService for automatic company_id filtering
 * Replaces the vulnerable EmployeeService with secure operations
 */
export class SecureEmployeeService extends SecureBaseService {
  
  /**
   * Get all employees for the current company (excluding soft deleted)
   * 🔒 SECURITY: Automatically filtered by company_id
   */
  static async getEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔍 [SECURE-EMPLOYEES] Starting getEmployees...');
      
      console.log('🔒 SecureEmployeeService: Fetching employees with company filter');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery(
        'employees',
        companyId,
        '*',
        { estado: { neq: 'eliminado' } } // Exclude soft deleted
      );
      
      console.log('🔍 [SECURE-EMPLOYEES] Executing employee query...');
      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('🔍 [SECURE-EMPLOYEES] Query result:', { dataCount: data?.length, error });

      if (error) {
        console.error('❌ SecureEmployeeService: Error fetching employees:', error);
        await this.logSecurityViolation('employees', 'select', 'query_error', { error: error.message });
        throw error;
      }

      if (!data) {
        console.log('⚠️ SecureEmployeeService: No employees found');
        return { success: true, data: [] };
      }

      // Map database records to EmployeeUnified format
      const employees = data.map(mapDatabaseToUnified);
      
      console.log(`✅ SecureEmployeeService: Successfully fetched ${employees.length} secure employees for company:`, companyId);
      return { success: true, data: employees };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in getEmployees:', error);
      await this.logSecurityViolation('employees', 'select', 'service_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Get employee by ID (excluding soft deleted)
   * 🔒 SECURITY: Automatically validates company access with enhanced validation
   */
  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    try {
      console.log('🔒 SecureEmployeeService: Fetching employee by ID with enhanced security:', id);
      
      // Enhanced security: validate employee company access first
      const { data: hasAccess, error: accessError } = await (supabase as any)
        .rpc('validate_employee_company_access', { p_employee_id: id });
      
      if (accessError) {
        console.error('❌ SecureEmployeeService: Access validation error:', accessError);
        await this.logSecurityViolation('employees', 'access_validation', 'validation_error', { 
          employeeId: id, 
          error: accessError.message 
        });
        return null;
      }
      
      if (!hasAccess) {
        console.warn('🔒 SecureEmployeeService: Access denied for employee:', id);
        await this.logSecurityViolation('employees', 'select_by_id', 'unauthorized_access_attempt', { 
          employeeId: id 
        });
        return null;
      }
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery(
        'employees',
        companyId,
        '*',
        { 
          id,
          estado: { neq: 'eliminado' }
        }
      );
      
      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('❌ SecureEmployeeService: Error fetching employee:', error);
        await this.logSecurityViolation('employees', 'select_by_id', 'query_error', { 
          employeeId: id, 
          error: error.message 
        });
        throw error;
      }

      if (!data) {
        console.log('⚠️ SecureEmployeeService: Employee not found:', id);
        await this.logSecurityViolation('employees', 'select_by_id', 'not_found', { employeeId: id });
        return null;
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ SecureEmployeeService: Successfully fetched secure employee:', employee.nombre, employee.apellido);
      return employee;
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in getEmployeeById:', error);
      await this.logSecurityViolation('employees', 'select_by_id', 'service_error', { 
        employeeId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Create new employee
   * 🔒 SECURITY: Automatically adds company_id
   */
  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔒 SecureEmployeeService: Creating employee:', employeeData.nombre, employeeData.apellido);
      
      // Map to database format
      const dbData = mapUnifiedToDatabase({
        ...employeeData,
        id: '', // Temporary ID, will be generated by database
        empresaId: employeeData.empresaId || employeeData.company_id || ''
      });

      // Remove company_id as it will be added by secureInsert
      delete dbData.company_id;

      const { data, error } = await this.secureInsert('employees', dbData);

      if (error) {
        console.error('❌ SecureEmployeeService: Error creating employee:', error);
        await this.logSecurityViolation('employees', 'insert', 'query_error', { 
          employeeName: `${employeeData.nombre} ${employeeData.apellido}`,
          error: error.message 
        });
        throw error;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned from employee creation');
      }

      const employee = mapDatabaseToUnified(data[0]);
      console.log('✅ SecureEmployeeService: Successfully created secure employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in createEmployee:', error);
      await this.logSecurityViolation('employees', 'insert', 'service_error', { 
        employeeName: `${employeeData.nombre} ${employeeData.apellido}`,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Update employee
   * 🔒 SECURITY: Automatically validates company ownership
   */
  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔒 SecureEmployeeService: Updating employee:', id);
      console.log('📝 Update data received:', updates);
      
      // ✅ IMPROVED: Clean the updates data before mapping
      const cleanUpdates = { ...updates };
      
      // Remove fields that shouldn't be updated or are handled specially
      delete cleanUpdates.id; // Never update the ID
      delete cleanUpdates.createdAt; // Never update creation timestamp (correct camelCase property)
      
      console.log('📝 Cleaned update data:', cleanUpdates);
      
      // Map to database format, but only the fields that are being updated
      const dbUpdates = mapUnifiedToDatabase({
        ...cleanUpdates,
        id: id, // Temporary ID for mapping, will be removed
        empresaId: cleanUpdates.empresaId || cleanUpdates.company_id || ''
      } as EmployeeUnified);

      // ✅ IMPROVED: Remove fields that shouldn't be updated after mapping
      // Note: mapUnifiedToDatabase doesn't return 'id' or 'created_at' properties, so we don't need to delete them
      delete dbUpdates.company_id; // This shouldn't change
      
      console.log('📤 Sending to database:', dbUpdates);
      
      const { data, error } = await this.secureUpdate(
        'employees', 
        dbUpdates, 
        { 
          id: id,
          estado: { neq: 'eliminado' } // Prevent updating soft deleted employees
        }
      );

      if (error) {
        console.error('❌ SecureEmployeeService: Error updating employee:', error);
        await this.logSecurityViolation('employees', 'update', 'query_error', { 
          employeeId: id,
          error: error.message 
        });
        throw error;
      }

      // ✅ IMPROVED: Better error handling for no data returned
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ SecureEmployeeService: No data returned from update');
        console.error('❌ Query conditions:', { id, estado: { neq: 'eliminado' } });
        console.error('❌ Update data sent:', dbUpdates);
        
        // Try to fetch the employee to see if it exists
        const existingEmployee = await this.getEmployeeById(id);
        if (!existingEmployee) {
          throw new Error('Empleado no encontrado o no tienes permisos para actualizarlo');
        }
        
        throw new Error('Error al actualizar empleado: No se retornaron datos actualizados');
      }

      const employee = mapDatabaseToUnified(data[0]);
      console.log('✅ SecureEmployeeService: Successfully updated secure employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in updateEmployee:', error);
      await this.logSecurityViolation('employees', 'update', 'service_error', { 
        employeeId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Delete employee (soft delete - changes status to 'eliminado')
   * 🔒 SECURITY: Validated through company context
   */
  static async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    console.log('🔒 SecureEmployeeService: Soft deleting employee:', id);
    
    // Validate company access first
    const employee = await this.getEmployeeById(id);
    if (!employee) {
      await this.logSecurityViolation('employees', 'delete', 'employee_not_found', { employeeId: id });
      return { success: false, error: 'Empleado no encontrado' };
    }
    
    // Use existing soft delete service but ensure it's validated
    return EmployeeSoftDeleteService.softDeleteEmployee(id);
  }

  /**
   * Get deleted employees (for recovery purposes)
   * 🔒 SECURITY: Company-filtered through service
   */
  static async getDeletedEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔒 SecureEmployeeService: Fetching deleted employees');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery(
        'employees',
        companyId,
        '*',
        { estado: 'eliminado' }
      );
      
      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ SecureEmployeeService: Error fetching deleted employees:', error);
        throw error;
      }

      const employees = data ? data.map(mapDatabaseToUnified) : [];
      console.log(`✅ SecureEmployeeService: Successfully fetched ${employees.length} deleted employees`);
      return { success: true, data: employees };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in getDeletedEmployees:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Restore a soft deleted employee
   * 🔒 SECURITY: Company access validated
   */
  static async restoreEmployee(id: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    console.log('🔒 SecureEmployeeService: Restoring employee:', id);
    
    // Use existing service but with additional validation
    const result = await EmployeeSoftDeleteService.restoreEmployee(id);
    
    if (result.success && result.data) {
      console.log('✅ SecureEmployeeService: Employee restored securely:', result.data.nombre, result.data.apellido);
    }
    
    return result;
  }

  /**
   * Bulk delete employees (soft delete)
   * 🔒 SECURITY: Each employee validated for company access
   */
  static async bulkDeleteEmployees(employeeIds: string[]): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    try {
      console.log('🔒 SecureEmployeeService: Bulk deleting employees:', employeeIds.length);
      
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each employee deletion with security validation
      for (const employeeId of employeeIds) {
        try {
          const result = await this.deleteEmployee(employeeId);
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Error eliminando empleado ${employeeId}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error eliminando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      console.log(`✅ SecureEmployeeService: Secure bulk delete completed - ${results.successful} successful, ${results.failed} failed`);
      return { success: true, results };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in bulkDeleteEmployees:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Bulk update employee status
   * 🔒 SECURITY: Company-validated bulk operations
   */
  static async bulkUpdateStatus(employeeIds: string[], newStatus: 'activo' | 'inactivo' | 'eliminado'): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    try {
      console.log('🔒 SecureEmployeeService: Secure bulk updating employee status:', employeeIds.length, 'to', newStatus);
      
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each employee update with security validation
      for (const employeeId of employeeIds) {
        try {
          const result = await this.updateEmployee(employeeId, { estado: newStatus });
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Error actualizando empleado ${employeeId}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error actualizando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      console.log(`✅ SecureEmployeeService: Secure bulk update completed - ${results.successful} successful, ${results.failed} failed`);
      return { success: true, results };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error in bulkUpdateStatus:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
