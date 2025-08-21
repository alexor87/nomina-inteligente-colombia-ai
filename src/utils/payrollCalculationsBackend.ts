
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollEmployee, BaseEmployeeData, PayrollSummary, NovedadForIBC } from '@/types/payroll';
import { NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';

// ✅ NUEVA FUNCIÓN: Calcular días de intersección de incapacidad con período
const calculateIncapacityDaysInPeriod = (
  novedad: any,
  periodStart: string,
  periodEnd: string
): number => {
  if (novedad.tipo_novedad !== 'incapacidad' || !novedad.fecha_inicio || !novedad.fecha_fin) {
    return 0;
  }

  const incapacityStart = new Date(novedad.fecha_inicio);
  const incapacityEnd = new Date(novedad.fecha_fin);
  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  // Calcular intersección
  const intersectionStart = new Date(Math.max(incapacityStart.getTime(), periodStartDate.getTime()));
  const intersectionEnd = new Date(Math.min(incapacityEnd.getTime(), periodEndDate.getTime()));

  // Si no hay intersección, retornar 0
  if (intersectionStart > intersectionEnd) {
    return 0;
  }

  // Calcular días de intersección (inclusive)
  const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(0, diffDays);
};

// ✅ NUEVA FUNCIÓN: Calcular días trabajados efectivos
const calculateEffectiveWorkedDays = (
  legalDays: number,
  novedades: any[],
  periodStart: string,
  periodEnd: string
): number => {
  let totalIncapacityDaysInPeriod = 0;

  for (const novedad of novedades) {
    if (novedad.tipo_novedad === 'incapacidad') {
      const incapacityDays = calculateIncapacityDaysInPeriod(novedad, periodStart, periodEnd);
      totalIncapacityDaysInPeriod += incapacityDays;
    }
  }

  // Días efectivos = días legales del período - días de incapacidad en el período
  const effectiveWorkedDays = Math.max(0, Math.min(legalDays - totalIncapacityDaysInPeriod, legalDays));

  console.log('🧮 Cálculo días efectivos:', {
    legalDays,
    totalIncapacityDaysInPeriod,
    effectiveWorkedDays
  });

  return effectiveWorkedDays;
};

export const calculateEmployeeBackend = async (
  baseEmployee: BaseEmployeeData, 
  periodType: 'quincenal' | 'mensual',
  periodStart?: string,
  periodEnd?: string
): Promise<PayrollEmployee> => {
  console.log('🔍 calculateEmployeeBackend: Procesando empleado con periodicidad y novedades:', {
    employeeId: baseEmployee.id,
    name: baseEmployee.name,
    periodType,
    originalWorkedDays: baseEmployee.workedDays,
    novedadesCount: baseEmployee.novedades?.length || 0,
    novedades: baseEmployee.novedades,
    periodStart,
    periodEnd
  });

  // ✅ PASO 1: Calcular días trabajados efectivos (descontando incapacidades del período)
  const legalDays = periodType === 'quincenal' ? 15 : 30;
  let effectiveWorkedDays = baseEmployee.workedDays;

  if (periodStart && periodEnd && baseEmployee.novedades?.length) {
    effectiveWorkedDays = calculateEffectiveWorkedDays(
      legalDays,
      baseEmployee.novedades,
      periodStart,
      periodEnd
    );
  }

  // ✅ PASO 2: Ajustar novedades para que solo incluyan días del período actual
  const adjustedNovedades = baseEmployee.novedades?.map(novedad => {
    if (novedad.tipo_novedad === 'incapacidad' && novedad.fecha_inicio && novedad.fecha_fin && periodStart && periodEnd) {
      const daysInPeriod = calculateIncapacityDaysInPeriod(novedad, periodStart, periodEnd);
      return {
        ...novedad,
        dias: daysInPeriod // ✅ Ajustar días al período actual
      };
    }
    return novedad;
  }) || [];

  const input: PayrollCalculationInput = {
    baseSalary: baseEmployee.baseSalary,
    workedDays: effectiveWorkedDays, // ✅ CORRECCIÓN: Usar días efectivos
    extraHours: 0,
    disabilities: baseEmployee.disabilities,
    bonuses: baseEmployee.bonuses,
    absences: baseEmployee.absences,
    periodType,
    novedades: adjustedNovedades // ✅ Novedades ajustadas al período
  };

  console.log('🎯 Input al backend con días efectivos:', {
    employeeId: baseEmployee.id,
    originalWorkedDays: baseEmployee.workedDays,
    effectiveWorkedDays,
    adjustedNovedadesCount: adjustedNovedades.length
  });

  try {
    const [calculation, validation] = await Promise.all([
      PayrollCalculationBackendService.calculatePayroll(input),
      PayrollCalculationBackendService.validateEmployee(input, baseEmployee.eps, baseEmployee.afp)
    ]);

    console.log('✅ calculateEmployeeBackend: Cálculo completado con días efectivos:', {
      employeeId: baseEmployee.id,
      periodType,
      effectiveWorkedDays,
      ibc: calculation.ibc,
      transportAllowance: calculation.transportAllowance,
      healthDeduction: calculation.healthDeduction,
      pensionDeduction: calculation.pensionDeduction,
      netPay: calculation.netPay
    });

    return {
      ...baseEmployee,
      workedDays: effectiveWorkedDays, // ✅ Actualizar con días efectivos
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      employerContributions: calculation.employerContributions,
      ibc: calculation.ibc,
      status: validation.isValid ? 'valid' : 'error',
      errors: [...validation.errors, ...validation.warnings],
      healthDeduction: calculation.healthDeduction || 0,
      pensionDeduction: calculation.pensionDeduction || 0,
      // ✅ Conservar novedades ajustadas
      novedades: adjustedNovedades
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
    novedades: employee.novedades || []
  };
};

export const isNovedadConstitutiva = (tipoNovedad: string, valorExplícito?: boolean): boolean => {
  if (valorExplícito !== null && valorExplícito !== undefined) {
    return Boolean(valorExplícito);
  }

  const categoria = Object.entries(NOVEDAD_CATEGORIES.devengados.types).find(
    ([key]) => key === tipoNovedad
  );

  if (categoria) {
    const constitutivo = categoria[1].constitutivo_default ?? false;
    
    if (tipoNovedad === 'horas_extra' || tipoNovedad === 'recargo_nocturno') {
      console.log(`🔧 CONSTITUTIVIDAD CORREGIDA: ${tipoNovedad} = ${constitutivo} (antes era false)`);
    }
    
    return constitutivo;
  }

  return false;
};

const normalizeIncapacitySubtype = (subtipo?: string): 'general' | 'laboral' | undefined => {
  if (!subtipo) return undefined;
  const s = subtipo.toLowerCase().trim();

  if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) {
    return 'general';
  }
  if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) {
    return 'laboral';
  }
  return undefined;
};

export const convertNovedadesToIBC = (novedades: any[]): NovedadForIBC[] => {
  return novedades.map(novedad => {
    const constitutivo = isNovedadConstitutiva(
      novedad.tipo_novedad, 
      novedad.constitutivo_salario
    );

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
      subtipoNormalizado: normalizedSubtype,
      fecha_inicio: novedad.fecha_inicio,
      fecha_fin: novedad.fecha_fin
    });

    const mapped: NovedadForIBC = {
      valor: Number(novedad.valor || 0),
      constitutivo_salario: constitutivo,
      tipo_novedad: novedad.tipo_novedad || 'otros',
      dias: typeof novedad.dias === 'number' ? novedad.dias : (novedad.dias ? Number(novedad.dias) : undefined),
      subtipo: normalizedSubtype || undefined,
      // ✅ Pasar fechas cuando existan para calcular intersecciones de incapacidad
      fecha_inicio: novedad.fecha_inicio ? String(novedad.fecha_inicio) : undefined,
      fecha_fin: novedad.fecha_fin ? String(novedad.fecha_fin) : undefined,
    };

    return mapped;
  });
};
