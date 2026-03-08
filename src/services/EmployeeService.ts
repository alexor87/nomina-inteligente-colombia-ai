import { SecureEmployeeService } from './SecureEmployeeService';
import { EmployeeUnified } from '@/types/employee-unified';

/**
 * @deprecated Use SecureEmployeeService directly
 */
export class EmployeeService {
  static async getEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    return SecureEmployeeService.getEmployees();
  }

  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    return SecureEmployeeService.getEmployeeById(id);
  }

  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    return SecureEmployeeService.createEmployee(employeeData);
  }

  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    return SecureEmployeeService.updateEmployee(id, updates);
  }

  static async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    return SecureEmployeeService.deleteEmployee(id);
  }

  static async getDeletedEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    return SecureEmployeeService.getDeletedEmployees();
  }

  static async restoreEmployee(id: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    return SecureEmployeeService.restoreEmployee(id);
  }

  static async bulkDeleteEmployees(employeeIds: string[]): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    return SecureEmployeeService.bulkDeleteEmployees(employeeIds);
  }

  static async bulkUpdateStatus(employeeIds: string[], newStatus: 'activo' | 'inactivo' | 'eliminado'): Promise<{ success: boolean; results: { successful: number; failed: number; errors: string[] }; error?: string }> {
    return SecureEmployeeService.bulkUpdateStatus(employeeIds, newStatus);
  }
}
