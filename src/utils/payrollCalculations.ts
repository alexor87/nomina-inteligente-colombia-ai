
import { PayrollCalculationService, PayrollCalculationInput } from '@/services/PayrollCalculationService';
import { PayrollEmployee, BaseEmployeeData, PayrollSummary } from '@/types/payroll';

export const calculateEmployee = async (
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

  const calculation = await PayrollCalculationService.calculatePayroll(input);
  const validation = PayrollCalculationService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp);

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
