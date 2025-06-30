
import { PayrollPeriod, BaseEmployeeData } from '@/types/payroll';

export const mockPeriod: PayrollPeriod = {
  id: '1',
  company_id: 'mock-company-id',
  fecha_inicio: '2025-06-01',
  fecha_fin: '2025-06-15',
  estado: 'en_proceso',
  tipo_periodo: 'quincenal',
  periodo: '2025-06',
  empleados_count: 3,
  total_devengado: 7600000,
  total_deducciones: 1520000,
  total_neto: 6080000,
  created_at: '2025-06-01T00:00:00Z'
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
