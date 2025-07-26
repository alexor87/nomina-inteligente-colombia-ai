import { SecureEmployeeService } from './SecureEmployeeService';
import { EmployeeUnified } from '@/types/employee-unified';

/**
 * 🔒 SECURITY MIGRATION: EmployeeService now delegates to SecureEmployeeService
 * This provides backward compatibility while ensuring all operations are secure
 * @deprecated Use SecureEmployeeService directly for better security
 */
export class EmployeeService {
  /**
   * Get all employees for the current company (excluding soft deleted)
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async getEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.getEmployees is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.getEmployees();
  }

  /**
   * Get employee by ID (excluding soft deleted)
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    console.warn('🔒 [SECURITY] EmployeeService.getEmployeeById is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.getEmployeeById(id);
  }

  /**
   * Create new employee
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.createEmployee is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.createEmployee(employeeData);
  }

  /**
   * Update employee
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.updateEmployee is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.updateEmployee(id, updates);
  }

  /**
   * Delete employee (soft delete - changes status to 'eliminado')
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.deleteEmployee is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.deleteEmployee(id);
  }

  /**
   * Get deleted employees (for recovery purposes)
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async getDeletedEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.getDeletedEmployees is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.getDeletedEmployees();
  }

  /**
   * Restore a soft deleted employee
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async restoreEmployee(id: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.restoreEmployee is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.restoreEmployee(id);
  }

  /**
   * Bulk delete employees (soft delete - changes status to 'eliminado')
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async bulkDeleteEmployees(employeeIds: string[]): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.bulkDeleteEmployees is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.bulkDeleteEmployees(employeeIds);
  }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error eliminando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      console.log(`✅ EmployeeService: Bulk delete completed - ${results.successful} successful, ${results.failed} failed`);
      return { success: true, results };
    } catch (error) {
      console.error('❌ EmployeeService: Error in bulkDeleteEmployees:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Bulk update employee status
   * 🔒 SECURITY: Delegated to SecureEmployeeService
   */
  static async bulkUpdateStatus(employeeIds: string[], newStatus: 'activo' | 'inactivo' | 'eliminado'): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    console.warn('🔒 [SECURITY] EmployeeService.bulkUpdateStatus is deprecated. Use SecureEmployeeService.');
    return SecureEmployeeService.bulkUpdateStatus(employeeIds, newStatus);
  }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error actualizando empleado ${employeeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      console.log(`✅ EmployeeService: Bulk update completed - ${results.successful} successful, ${results.failed} failed`);
      return { success: true, results };
    } catch (error) {
      console.error('❌ EmployeeService: Error in bulkUpdateStatus:', error);
      return { 
        success: false, 
        results: { successful: 0, failed: employeeIds.length, errors: [] },
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
