import { SecureBaseService } from './SecureBaseService';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';
import { EmployeeSoftDeleteService } from './EmployeeSoftDeleteService';
import { logger } from '@/lib/logger';

/**
 * 🔒 SECURE EMPLOYEE SERVICE
 * Inherits from SecureBaseService for automatic company_id filtering
 */
export class SecureEmployeeService extends SecureBaseService {
  
  static async getEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery(
        'employees',
        companyId,
        '*',
        { estado: { neq: 'eliminado' } }
      );
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ SecureEmployeeService: Error fetching employees:', error);
        await this.logSecurityViolation('employees', 'select', 'query_error', { error: error.message });
        throw error;
      }

      if (!data) {
        return { success: true, data: [] };
      }

      const employees = data.map(mapDatabaseToUnified);
      logger.debug(`✅ SecureEmployeeService: Fetched ${employees.length} employees`);
      return { success: true, data: employees };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in getEmployees:', error);
      await this.logSecurityViolation('employees', 'select', 'service_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery(
        'employees',
        companyId,
        '*',
        { id, estado: { neq: 'eliminado' } }
      );
      
      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error('❌ SecureEmployeeService: Error fetching employee:', error);
        await this.logSecurityViolation('employees', 'select_by_id', 'query_error', { employeeId: id, error: error.message });
        throw error;
      }

      if (!data) {
        await this.logSecurityViolation('employees', 'select_by_id', 'not_found', { employeeId: id });
        return null;
      }

      return mapDatabaseToUnified(data);
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in getEmployeeById:', error);
      await this.logSecurityViolation('employees', 'select_by_id', 'service_error', { 
        employeeId: id, error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      const dbData = mapUnifiedToDatabase({
        ...employeeData,
        id: '',
        empresaId: employeeData.empresaId || employeeData.company_id || ''
      });

      delete dbData.company_id;

      const { data, error } = await this.secureInsert('employees', dbData);

      if (error) {
        logger.error('❌ SecureEmployeeService: Error creating employee:', error);
        await this.logSecurityViolation('employees', 'insert', 'query_error', { error: error.message });
        throw error;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned from employee creation');
      }

      const employee = mapDatabaseToUnified(data[0]);
      return { success: true, data: employee };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in createEmployee:', error);
      await this.logSecurityViolation('employees', 'insert', 'service_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      const dbUpdates = mapUnifiedToDatabase({
        ...updates,
        id: id,
        empresaId: updates.empresaId || updates.company_id || ''
      } as EmployeeUnified);

      delete dbUpdates.company_id;
      
      const { data, error } = await this.secureUpdate(
        'employees', 
        dbUpdates, 
        { id: id, estado: { neq: 'eliminado' } }
      );

      if (error) {
        logger.error('❌ SecureEmployeeService: Error updating employee:', error);
        await this.logSecurityViolation('employees', 'update', 'query_error', { employeeId: id, error: error.message });
        throw error;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned from employee update');
      }

      const employee = mapDatabaseToUnified(data[0]);
      return { success: true, data: employee };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in updateEmployee:', error);
      await this.logSecurityViolation('employees', 'update', 'service_error', { 
        employeeId: id, error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    const employee = await this.getEmployeeById(id);
    if (!employee) {
      await this.logSecurityViolation('employees', 'delete', 'employee_not_found', { employeeId: id });
      return { success: false, error: 'Empleado no encontrado' };
    }
    return EmployeeSoftDeleteService.softDeleteEmployee(id);
  }

  static async getDeletedEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const query = this.secureQuery('employees', companyId, '*', { estado: 'eliminado' });
      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        logger.error('❌ SecureEmployeeService: Error fetching deleted employees:', error);
        throw error;
      }

      const employees = data ? data.map(mapDatabaseToUnified) : [];
      return { success: true, data: employees };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in getDeletedEmployees:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async restoreEmployee(id: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    return EmployeeSoftDeleteService.restoreEmployee(id);
  }

  static async bulkDeleteEmployees(employeeIds: string[]): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    try {
      const results = { successful: 0, failed: 0, errors: [] as string[] };

      for (const employeeId of employeeIds) {
        try {
          const result = await this.deleteEmployee(employeeId);
          if (result.success) results.successful++;
          else {
            results.failed++;
            results.errors.push(`Error eliminando empleado ${employeeId}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error eliminando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in bulkDeleteEmployees:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async bulkUpdateStatus(employeeIds: string[], newStatus: 'activo' | 'inactivo' | 'eliminado'): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    try {
      const results = { successful: 0, failed: 0, errors: [] as string[] };

      for (const employeeId of employeeIds) {
        try {
          const result = await this.updateEmployee(employeeId, { estado: newStatus });
          if (result.success) results.successful++;
          else {
            results.failed++;
            results.errors.push(`Error actualizando empleado ${employeeId}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error actualizando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('❌ SecureEmployeeService: Error in bulkUpdateStatus:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
