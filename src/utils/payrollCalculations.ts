import { PayrollEmployee, BaseEmployeeData, PayrollSummary, Novedad } from '@/types/payroll';

export const calculateEmployee = async (
  baseEmployee: BaseEmployeeData, 
  periodType: 'quincenal' | 'mensual'
): Promise<PayrollEmployee> => {
  // TODO: Implementar cálculos reales de nómina
  const salarioDiario = baseEmployee.baseSalary / 30;
  const diasTrabajados = periodType === 'quincenal' ? 15 : 30;
  const salarioBruto = salarioDiario * diasTrabajados;
  
  const descuentos = salarioBruto * 0.08; // 8% aproximado para salud y pensión
  const salarioNeto = salarioBruto - descuentos;
  
  return {
    ...baseEmployee,
    grossPay: salarioBruto,
    deductions: descuentos,
    netPay: salarioNeto,
    transportAllowance: 0,
    employerContributions: salarioBruto * 0.205, // Aproximado
    ibc: salarioBruto,
    status: 'valid' as const,
    errors: [],
    healthDeduction: salarioBruto * 0.04,
    pensionDeduction: salarioBruto * 0.04,
    effectiveWorkedDays: diasTrabajados,
    incapacityDays: 0,
    incapacityValue: 0,
    legalBasis: 'Cálculo estándar'
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
