import { EmployeeUnified } from '@/types/employee-unified';

export interface EmployeeDataWithBanking extends Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> {
  // Make tipoCuenta required to match schema
  tipoCuenta: 'ahorros' | 'corriente';
}
