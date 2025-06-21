
import { PayrollPeriod, BaseEmployeeData } from '@/types/payroll';

export const mockPeriod: PayrollPeriod = {
  id: '1',
  startDate: '2025-06-01',
  endDate: '2025-06-15',
  status: 'in_progress',
  type: 'quincenal'
};

export const mockEmployeesBase: BaseEmployeeData[] = [
  {
    id: '1',
    name: 'María García',
    position: 'Desarrolladora Senior',
    baseSalary: 2600000,
    workedDays: 15,
    extraHours: 8,
    disabilities: 0,
    bonuses: 200000,
    absences: 0,
    eps: 'Compensar',
    afp: 'Protección'
  },
  {
    id: '2',
    name: 'Carlos López',
    position: 'Contador',
    baseSalary: 1800000,
    workedDays: 13,
    extraHours: 0,
    disabilities: 2,
    bonuses: 0,
    absences: 2,
    eps: 'Sura',
    afp: 'Porvenir'
  },
  {
    id: '3',
    name: 'Ana Rodríguez',
    position: 'Gerente Comercial',
    baseSalary: 4200000,
    workedDays: 15,
    extraHours: 5,
    disabilities: 0,
    bonuses: 500000,
    absences: 0,
    eps: 'Compensar',
    afp: 'Colfondos'
  }
];
