
import { Employee } from '@/types';
import { EmployeeCRUDService } from './EmployeeCRUDService';
import { EmployeeStatusService } from './EmployeeStatusService';

interface EmployeeDataWithBanking extends Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  segundoNombre?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
}

export class EmployeeService {
  static async create(employeeData: EmployeeDataWithBanking) {
    return EmployeeCRUDService.create(employeeData);
  }

  static async update(id: string, updates: Partial<Employee & { segundoNombre?: string; tipoCotizanteId?: string; subtipoCotizanteId?: string }>) {
    return EmployeeCRUDService.update(id, updates);
  }

  static async checkEmployeeHasPayrolls(employeeId: string): Promise<boolean> {
    return EmployeeCRUDService.checkEmployeeHasPayrolls(employeeId);
  }

  static async delete(id: string) {
    return EmployeeCRUDService.delete(id);
  }

  static async changeStatus(id: string, newStatus: string) {
    return EmployeeStatusService.changeStatus(id, newStatus);
  }

  static async updateCentroCosto(id: string, centroCosto: string) {
    return EmployeeStatusService.updateCentroCosto(id, centroCosto);
  }

  static async updateNivelRiesgoARL(id: string, nivelRiesgo: 'I' | 'II' | 'III' | 'IV' | 'V') {
    return EmployeeStatusService.updateNivelRiesgoARL(id, nivelRiesgo);
  }
}
