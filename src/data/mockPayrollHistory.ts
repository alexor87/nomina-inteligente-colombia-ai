
import { PayrollHistoryPeriod, PayrollHistoryEmployee } from '@/types/payroll-history';

export const mockPayrollHistoryPeriods: PayrollHistoryPeriod[] = [
  {
    id: '1',
    period: '1 al 15 de Mayo 2025',
    startDate: '2025-05-01',
    endDate: '2025-05-15',
    type: 'quincenal',
    employeesCount: 12,
    status: 'cerrado',
    totalGrossPay: 45000000,
    totalNetPay: 38500000,
    totalDeductions: 6500000,
    totalCost: 51750000,
    employerContributions: 6750000,
    pilaFileUrl: '/files/pila-mayo-15.txt',
    paymentStatus: 'pagado',
    version: 1,
    createdAt: '2025-05-16T08:00:00Z',
    updatedAt: '2025-05-16T08:00:00Z'
  },
  {
    id: '2',
    period: '16 al 31 de Abril 2025',
    startDate: '2025-04-16',
    endDate: '2025-04-30',
    type: 'quincenal',
    employeesCount: 11,
    status: 'con_errores',
    totalGrossPay: 42000000,
    totalNetPay: 36200000,
    totalDeductions: 5800000,
    totalCost: 48300000,
    employerContributions: 6300000,
    paymentStatus: 'parcial',
    version: 1,
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z'
  },
  {
    id: '3',
    period: '1 al 15 de Abril 2025',
    startDate: '2025-04-01',
    endDate: '2025-04-15',
    type: 'quincenal',
    employeesCount: 11,
    status: 'editado',
    totalGrossPay: 41500000,
    totalNetPay: 35800000,
    totalDeductions: 5700000,
    totalCost: 47700000,
    employerContributions: 6200000,
    pilaFileUrl: '/files/pila-abril-15-v2.txt',
    paymentStatus: 'pagado',
    version: 2,
    originalId: '3-original',
    createdAt: '2025-04-16T08:00:00Z',
    updatedAt: '2025-04-18T10:30:00Z',
    editedBy: 'admin@empresa.com',
    editReason: 'Corrección de horas extra'
  },
  {
    id: '4',
    period: 'Marzo 2025',
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    type: 'mensual',
    employeesCount: 10,
    status: 'cerrado',
    totalGrossPay: 85000000,
    totalNetPay: 72500000,
    totalDeductions: 12500000,
    totalCost: 97750000,
    employerContributions: 12750000,
    pilaFileUrl: '/files/pila-marzo.txt',
    paymentStatus: 'pagado',
    version: 1,
    createdAt: '2025-04-01T08:00:00Z',
    updatedAt: '2025-04-01T08:00:00Z'
  }
];

export const mockPayrollHistoryEmployees: PayrollHistoryEmployee[] = [
  {
    id: '1',
    periodId: '1',
    name: 'Ana María Rodríguez',
    position: 'Desarrolladora Senior',
    grossPay: 4800000,
    deductions: 720000,
    netPay: 4080000,
    baseSalary: 5200000, // Salario base mensual completo
    paymentStatus: 'pagado',
    payslipUrl: '/payslips/ana-rodriguez-mayo-15.pdf'
  },
  {
    id: '2',
    periodId: '1',
    name: 'Carlos Mendoza',
    position: 'Diseñador UX',
    grossPay: 4200000,
    deductions: 630000,
    netPay: 3570000,
    baseSalary: 4500000, // Salario base mensual completo
    paymentStatus: 'pagado',
    payslipUrl: '/payslips/carlos-mendoza-mayo-15.pdf'
  }
];
