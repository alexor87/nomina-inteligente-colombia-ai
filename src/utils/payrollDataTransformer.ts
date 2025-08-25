
import { PayrollEmployee } from '@/types/payroll';

// Interface para los datos que vienen del historial (payrolls + employees)
export interface PayrollHistoryData {
  employee_id: string;
  employee_name: string;
  employee_lastname: string;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  salario_base: number;
  dias_trabajados?: number;
  ibc?: number;
  // Campos específicos de la tabla payrolls
  auxilio_transporte?: number;
  salud_empleado?: number;
  pension_empleado?: number;
  horas_extra?: number;
  bonificaciones?: number;
  comisiones?: number;
  cesantias?: number;
  prima?: number;
  vacaciones?: number;
  incapacidades?: number;
  otros_devengos?: number;
  otros_descuentos?: number;
  retencion_fuente?: number;
  completeEmployeeData?: {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string;
    email: string;
    telefono: string;
    cargo: string;
    salario_base: number;
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    eps: string;
    afp: string;
    arl: string;
    caja_compensacion: string;
  };
}

/**
 * Transforma datos del historial de nómina al formato PayrollEmployee
 * que espera el VoucherPreviewModal - AHORA CON VALORES HISTÓRICOS REALES
 */
export function transformPayrollHistoryToEmployee(
  historyData: PayrollHistoryData
): PayrollEmployee {
  const emp = historyData.completeEmployeeData;
  
  // Validaciones básicas
  if (!emp) {
    throw new Error(`Datos de empleado incompletos para ID: ${historyData.employee_id}`);
  }

  // ✅ USAR VALORES HISTÓRICOS REALES DE LA LIQUIDACIÓN
  const totalDeductions = historyData.total_deducciones || 0;
  const healthDeduction = historyData.salud_empleado || 0;
  const pensionDeduction = historyData.pension_empleado || 0;
  
  // Calcular aportes patronales (aproximación)
  const baseSalary = historyData.salario_base || 0;
  const employerContributions = baseSalary * 0.205; // 20.5% aportes patronales

  // ✅ MAPEO COMPLETO CON VALORES HISTÓRICOS REALES
  return {
    id: historyData.employee_id,
    name: `${historyData.employee_name} ${historyData.employee_lastname}`,
    position: emp.cargo || 'Sin cargo definido',
    baseSalary: historyData.salario_base || 0,
    workedDays: historyData.dias_trabajados || 30,
    extraHours: historyData.horas_extra || 0,
    disabilities: historyData.incapacidades || 0,
    bonuses: historyData.bonificaciones || 0,
    absences: 0, // Calculado desde novedades si es necesario
    grossPay: historyData.total_devengado || 0,
    deductions: totalDeductions,
    netPay: historyData.neto_pagado || 0,
    status: 'valid' as const,
    errors: [],
    eps: emp.eps || '',
    afp: emp.afp || '',
    transportAllowance: historyData.auxilio_transporte || 0,
    employerContributions,
    ibc: historyData.ibc || historyData.salario_base || 0,
    // ✅ CRÍTICO: Usar valores históricos reales de deducciones
    healthDeduction: healthDeduction,
    pensionDeduction: pensionDeduction,
    // Campos adicionales necesarios para el PDF
    cedula: emp.cedula || '',
    email: emp.email || '',
    telefono: emp.telefono || '',
    banco: emp.banco || '',
    tipo_cuenta: emp.tipo_cuenta || '',
    numero_cuenta: emp.numero_cuenta || '',
    arl: emp.arl || '',
    caja_compensacion: emp.caja_compensacion || ''
  } as PayrollEmployee & {
    cedula: string;
    email: string;
    telefono: string;
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    arl: string;
    caja_compensacion: string;
  };
}

/**
 * Valida que un empleado tenga todos los datos necesarios para generar voucher
 */
export function validateEmployeeForVoucher(employee: PayrollEmployee): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validaciones críticas
  if (!employee.name || employee.name.trim() === '') {
    errors.push('Nombre del empleado requerido');
  }

  if (!employee.baseSalary || employee.baseSalary <= 0) {
    errors.push('Salario base inválido');
  }

  if (!employee.grossPay || employee.grossPay < 0) {
    errors.push('Total devengado inválido');
  }

  if (!employee.netPay || employee.netPay < 0) {
    errors.push('Neto pagado inválido');
  }

  // Validaciones de afiliaciones (warnings)
  if (!employee.eps) {
    errors.push('EPS no definida');
  }

  if (!employee.afp) {
    errors.push('AFP no definida');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
