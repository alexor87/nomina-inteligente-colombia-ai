import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollEmployee, BaseEmployeeData, PayrollSummary, NovedadForIBC } from '@/types/payroll';
import { NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';

export const calculateEmployeeBackend = async (
  baseEmployee: BaseEmployeeData, 
  periodType: 'quincenal' | 'mensual'
): Promise<PayrollEmployee> => {
  console.log('🔍 calculateEmployeeBackend: Procesando empleado con periodicidad y novedades:', {
    employeeId: baseEmployee.id,
    name: baseEmployee.name,
    periodType,
    workedDays: baseEmployee.workedDays,
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
    periodType, // ✅ CORRECCIÓN: Enviar periodicidad al backend
    // ✅ NUEVO: Incluir novedades para cálculo correcto de IBC automático
    novedades: baseEmployee.novedades || []
  };

  try {
    const [calculation, validation] = await Promise.all([
      PayrollCalculationBackendService.calculatePayroll(input),
      PayrollCalculationBackendService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp)
    ]);

    console.log('✅ calculateEmployeeBackend: Cálculo completado con breakdown detallado:', {
      employeeId: baseEmployee.id,
      periodType,
      breakdown: calculation.breakdown,
      ibc: calculation.ibc,
      netPay: calculation.netPay
    });

    // ✅ NUEVO: Usar breakdown detallado del backend
    const breakdown = calculation.breakdown || {};

    return {
      ...baseEmployee,
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      employerContributions: calculation.employerContributions,
      // ✅ NUEVO: Incluir IBC calculado automáticamente
      ibc: calculation.ibc,
      status: validation.isValid ? 'valid' : 'error',
      errors: [...validation.errors, ...validation.warnings],
      healthDeduction: calculation.healthDeduction || 0,
      pensionDeduction: calculation.pensionDeduction || 0,
      // ✅ NUEVO: Breakdown detallado para mostrar en frontend
      payrollBreakdown: {
        salaryForWorkedDays: breakdown.salaryForWorkedDays || 0,
        incapacityPay: breakdown.incapacityPay || 0,
        otherConstitutive: breakdown.otherConstitutive || 0,
        nonConstitutive: breakdown.nonConstitutive || 0,
        transportAllowance: breakdown.transportAllowance || 0,
        totalGross: breakdown.totalGross || calculation.grossPay,
        totalDeductions: breakdown.totalDeductions || calculation.totalDeductions,
        netPay: breakdown.netPay || calculation.netPay,
        effectiveWorkedDays: breakdown.effectiveWorkedDays || baseEmployee.workedDays,
        totalIncapacityDays: breakdown.totalIncapacityDays || 0,
        ibcMode: breakdown.ibcMode || 'proportional',
        policy: breakdown.policy || 'standard_2d_100_rest_66'
      }
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
      pensionDeduction: 0,
      payrollBreakdown: {
        salaryForWorkedDays: 0,
        incapacityPay: 0,
        otherConstitutive: 0,
        nonConstitutive: 0,
        transportAllowance: 0,
        totalGross: 0,
        totalDeductions: 0,
        netPay: 0,
        effectiveWorkedDays: 0,
        totalIncapacityDays: 0,
        ibcMode: 'proportional',
        policy: 'standard_2d_100_rest_66'
      }
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

// ✅ FUNCIÓN NORMATIVA CORREGIDA: Determinar si una novedad es constitutiva según normas laborales
export const isNovedadConstitutiva = (tipoNovedad: string, valorExplícito?: boolean): boolean => {
  // Si hay valor explícito, usarlo (usuario ha decidido conscientemente)
  if (valorExplícito !== null && valorExplícito !== undefined) {
    return Boolean(valorExplícito);
  }

  // ✅ CORREGIDO: Buscar en categorías de devengados con nuevos defaults
  const categoria = Object.entries(NOVEDAD_CATEGORIES.devengados.types).find(
    ([key]) => key === tipoNovedad
  );

  if (categoria) {
    const constitutivo = categoria[1].constitutivo_default ?? false;
    
    // ✅ LOG para verificar la corrección
    if (tipoNovedad === 'horas_extra' || tipoNovedad === 'recargo_nocturno') {
      console.log(`🔧 CONSTITUTIVIDAD CORREGIDA: ${tipoNovedad} = ${constitutivo} (antes era false)`);
    }
    
    return constitutivo;
  }

  // Por defecto, no constitutivo (conservador)
  return false;
};

// ✅ NUEVO: Normalizador de subtipos de incapacidad para que el backend no reciba "comun"
const normalizeIncapacitySubtype = (subtipo?: string): 'general' | 'laboral' | undefined => {
  if (!subtipo) return undefined;
  const s = subtipo.toLowerCase().trim();

  // Mapear variantes comunes a los subtipos esperados por el backend
  if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) {
    return 'general';
  }
  if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) {
    return 'laboral';
  }
  return undefined; // si no es conocido, no forzar
};

// ✅ FUNCIÓN NORMATIVA: Convertir novedades aplicando reglas constitutivas CORREGIDAS
export const convertNovedadesToIBC = (novedades: any[]): NovedadForIBC[] => {
  return novedades.map(novedad => {
    // ✅ USAR FUNCIÓN NORMATIVA CENTRALIZADA CORREGIDA
    const constitutivo = isNovedadConstitutiva(
      novedad.tipo_novedad, 
      novedad.constitutivo_salario
    );

    // Normalizar solo para incapacidades
    const normalizedSubtype = novedad.tipo_novedad === 'incapacidad'
      ? normalizeIncapacitySubtype(novedad.subtipo) ?? novedad.subtipo
      : novedad.subtipo;

    console.log('🔍 Aplicando constitutividad y normalización de incapacidad (IBC automático):', {
      tipo: novedad.tipo_novedad,
      valorOriginal: novedad.constitutivo_salario,
      constitutivo,
      valor: novedad.valor,
      dias: novedad.dias,
      subtipoOriginal: novedad.subtipo,
      subtipoNormalizado: normalizedSubtype
    });

    const mapped: NovedadForIBC = {
      valor: Number(novedad.valor || 0),
      constitutivo_salario: constitutivo,
      tipo_novedad: novedad.tipo_novedad || 'otros',
      // ✅ Pasar detalles necesarios para incapacidades y otros cálculos en backend
      dias: typeof novedad.dias === 'number' ? novedad.dias : (novedad.dias ? Number(novedad.dias) : undefined),
      subtipo: normalizedSubtype || undefined
    };

    return mapped;
  });
};
