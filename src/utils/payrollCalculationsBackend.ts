
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollEmployee, BaseEmployeeData, PayrollSummary, NovedadForIBC } from '@/types/payroll';

export const calculateEmployeeBackend = async (
  baseEmployee: BaseEmployeeData, 
  periodType: 'quincenal' | 'mensual'
): Promise<PayrollEmployee> => {
  console.log('🔍 calculateEmployeeBackend: Procesando empleado con novedades:', {
    employeeId: baseEmployee.id,
    name: baseEmployee.name,
    novedadesCount: baseEmployee.novedades?.length || 0,
    novedades: baseEmployee.novedades
  });

  const input: PayrollCalculationInput = {
    baseSalary: baseEmployee.baseSalary,
    workedDays: baseEmployee.workedDays,
    extraHours: 0, // No longer used directly
    disabilities: baseEmployee.disabilities,
    bonuses: baseEmployee.bonuses, // Now includes all positive novedades
    absences: baseEmployee.absences,
    periodType,
    // ✅ NUEVO: Incluir novedades para cálculo correcto de IBC
    novedades: baseEmployee.novedades || []
  };

  try {
    const [calculation, validation] = await Promise.all([
      PayrollCalculationBackendService.calculatePayroll(input),
      PayrollCalculationBackendService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp)
    ]);

    console.log('✅ calculateEmployeeBackend: Cálculo completado:', {
      employeeId: baseEmployee.id,
      ibc: calculation.ibc,
      healthDeduction: calculation.healthDeduction,
      pensionDeduction: calculation.pensionDeduction
    });

    return {
      ...baseEmployee,
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      employerContributions: calculation.employerContributions,
      // ✅ NUEVO: Incluir IBC calculado
      ibc: calculation.ibc,
      status: validation.isValid ? 'valid' : 'error',
      errors: [...validation.errors, ...validation.warnings],
      healthDeduction: calculation.healthDeduction || 0,
      pensionDeduction: calculation.pensionDeduction || 0
    };
  } catch (error) {
    console.error('Error calculating employee payroll:', error);
    return {
      ...baseEmployee,
      grossPay: 0,
      deductions: 0,
      netPay: 0,
      transportAllowance: 0,
      employerContributions: 0,
      ibc: 0,
      status: 'error',
      errors: ['Error en el cálculo de nómina: ' + (error instanceof Error ? error.message : 'Error desconocido')],
      healthDeduction: 0,
      pensionDeduction: 0
    };
  }
};

export const calculatePayrollSummary = (employees: PayrollEmployee[]): PayrollSummary => {
  const totalEmployees = employees.length;
  const validEmployees = employees.filter(emp => emp.status === 'valid').length;
  const totalGrossPay = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions, 0);
  const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);
  const employerContributions = employees.reduce((sum, emp) => sum + emp.employerContributions, 0);
  const totalPayrollCost = totalNetPay + employerContributions;

  return {
    totalEmployees,
    validEmployees,
    totalGrossPay,
    totalDeductions,
    totalNetPay,
    employerContributions,
    totalPayrollCost
  };
};

export const convertToBaseEmployeeData = (employee: PayrollEmployee): BaseEmployeeData => {
  return {
    id: employee.id,
    name: employee.name,
    position: employee.position,
    baseSalary: employee.baseSalary,
    workedDays: employee.workedDays,
    extraHours: employee.extraHours,
    disabilities: employee.disabilities,
    bonuses: employee.bonuses,
    absences: employee.absences,
    eps: employee.eps,
    afp: employee.afp,
    // ✅ CONSERVAR: novedades si existen
    novedades: employee.novedades || []
  };
};

// ✅ NUEVA FUNCIÓN: Convertir novedades de base de datos a formato para IBC
export const convertNovedadesToIBC = (novedades: any[]): NovedadForIBC[] => {
  return novedades.map(novedad => ({
    valor: Number(novedad.valor || 0),
    constitutivo_salario: Boolean(novedad.constitutivo_salario),
    tipo_novedad: novedad.tipo_novedad || 'otros'
  }));
};
