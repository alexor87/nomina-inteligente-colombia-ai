
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollEmployee, BaseEmployeeData, PayrollSummary } from '@/types/payroll';

export const calculateEmployeeBackend = async (
  baseEmployee: BaseEmployeeData, 
  periodType: 'quincenal' | 'mensual'
): Promise<PayrollEmployee> => {
  const input: PayrollCalculationInput = {
    baseSalary: baseEmployee.baseSalary,
    workedDays: baseEmployee.workedDays,
    extraHours: baseEmployee.extraHours,
    disabilities: baseEmployee.disabilities,
    bonuses: baseEmployee.bonuses,
    absences: baseEmployee.absences,
    periodType
  };

  try {
    const [calculation, validation] = await Promise.all([
      PayrollCalculationBackendService.calculatePayroll(input),
      PayrollCalculationBackendService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp)
    ]);

    return {
      ...baseEmployee,
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      employerContributions: calculation.employerContributions,
      status: validation.isValid ? 'valid' : 'error',
      errors: [...validation.errors, ...validation.warnings]
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
      status: 'error',
      errors: ['Error en el cálculo de nómina: ' + (error instanceof Error ? error.message : 'Error desconocido')]
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
    afp: employee.afp
  };
};
