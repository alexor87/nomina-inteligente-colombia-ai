
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
    pilaFileUrl: '/files/pila-mayo-15.txt',
    dianStatus: 'enviado',
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
    dianStatus: 'rechazado',
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
    pilaFileUrl: '/files/pila-abril-15-v2.txt',
    dianStatus: 'enviado',
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
    pilaFileUrl: '/files/pila-marzo.txt',
    dianStatus: 'enviado',
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
    netPay: 4200000,
    dianStatus: 'enviado',
    paymentStatus: 'pagado',
    payslipUrl: '/payslips/ana-rodriguez-mayo-15.pdf'
  },
  {
    id: '2',
    periodId: '1',
    name: 'Carlos Mendoza',
    position: 'Diseñador UX',
    netPay: 3800000,
    dianStatus: 'enviado',
    paymentStatus: 'pagado',
    payslipUrl: '/payslips/carlos-mendoza-mayo-15.pdf'
  }
];
