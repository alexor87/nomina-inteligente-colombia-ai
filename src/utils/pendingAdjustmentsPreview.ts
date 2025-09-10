import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';

/**
 * Calculate preview impact of pending novedades on employee payroll using backend service
 */
export const calculateEmployeePreviewImpact = async (
  employee: any,
  pendingNovedades: PendingNovedad[]
): Promise<EmployeeNovedadPreview> => {
  if (pendingNovedades.length === 0) {
    return {
      originalDevengado: employee.total_devengado || 0,
      newDevengado: employee.total_devengado || 0,
      originalDeducciones: employee.total_deducciones || 0,
      newDeducciones: employee.total_deducciones || 0,
      originalNeto: employee.neto_pagado || 0,
      newNeto: employee.neto_pagado || 0,
      originalIBC: employee.ibc || 0,
      newIBC: employee.ibc || 0,
      pendingCount: 0,
      hasPending: false
    };
  }

  try {
    // Convert pending novedades to backend format
    const pendingNovedadesForBackend = convertNovedadesToIBC(pendingNovedades.map(pending => ({
      tipo_novedad: pending.tipo_novedad,
      valor: pending.valor,
      constitutivo_salario: pending.novedadData?.constitutivo_salario,
      dias: pending.novedadData?.dias,
      subtipo: pending.novedadData?.subtipo
    })));

    // Prepare base calculation input
    const baseInput: PayrollCalculationInput = {
      baseSalary: employee.salario_base || 0,
      workedDays: employee.dias_trabajados || 30,
      extraHours: 0,
      disabilities: 0,
      bonuses: 0,
      absences: 0,
      periodType: employee.periodo_type === 'quincenal' ? 'quincenal' : 'mensual',
      year: '2025'
    };

    // Calculate original values (without pending novedades, only existing ones)
    const existingNovedades = employee.novedades || [];
    const originalInput = {
      ...baseInput,
      novedades: existingNovedades
    };

    // Calculate new values (with all novedades: existing + pending)
    const newInput = {
      ...baseInput,
      novedades: [...existingNovedades, ...pendingNovedadesForBackend]
    };

    // Call backend for both calculations
    const [originalResult, newResult] = await Promise.all([
      PayrollCalculationBackendService.calculatePayroll(originalInput),
      PayrollCalculationBackendService.calculatePayroll(newInput)
    ]);

    return {
      originalDevengado: originalResult.grossPay,
      newDevengado: newResult.grossPay,
      originalDeducciones: originalResult.totalDeductions,
      newDeducciones: newResult.totalDeductions,
      originalNeto: originalResult.netPay,
      newNeto: newResult.netPay,
      originalIBC: Math.round(originalResult.ibc),
      newIBC: Math.round(newResult.ibc),
      pendingCount: pendingNovedades.length,
      hasPending: true
    };
  } catch (error) {
    console.error('Error calculating employee preview with backend:', error);
    
    // Fallback to current stored values if backend fails
    return {
      originalDevengado: employee.total_devengado || 0,
      newDevengado: employee.total_devengado || 0,
      originalDeducciones: employee.total_deducciones || 0,
      newDeducciones: employee.total_deducciones || 0,
      originalNeto: employee.neto_pagado || 0,
      newNeto: employee.neto_pagado || 0,
      originalIBC: employee.ibc || 0,
      newIBC: employee.ibc || 0,
      pendingCount: pendingNovedades.length,
      hasPending: true
    };
  }
};

/**
 * Check if a novedad type is a deduction
 */
export const isDeductionType = (tipoNovedad: string): boolean => {
  const deductionTypes = [
    'descuento_voluntario',
    'multa',
    'libranza',
    'retencion_fuente',
    'descuento_seguridad_social',
    'descuento_salud',
    'descuento_pension',
    'fondo_solidaridad'
  ];
  
  return deductionTypes.includes(tipoNovedad);
};

/**
 * Check if a novedad type is an earning
 */
export const isEarningType = (tipoNovedad: string): boolean => {
  const earningTypes = [
    'horas_extra',
    'recargo_nocturno',
    'bonificacion',
    'comision',
    'otros_ingresos',
    'auxilio_transporte',
    'auxilio_alimentacion',
    'prima_servicio',
    'vacaciones'
  ];
  
  return earningTypes.includes(tipoNovedad);
};

/**
 * Get human-readable description for novedad type
 */
export const getNovedadTypeDescription = (tipoNovedad: string): string => {
  const descriptions: Record<string, string> = {
    'horas_extra': 'Horas Extra',
    'recargo_nocturno': 'Recargo Nocturno',
    'bonificacion': 'Bonificación',
    'comision': 'Comisión',
    'otros_ingresos': 'Otros Ingresos',
    'descuento_voluntario': 'Descuento Voluntario',
    'multa': 'Multa',
    'libranza': 'Libranza',
    'retencion_fuente': 'Retención en la Fuente',
    'incapacidad': 'Incapacidad',
    'licencia_remunerada': 'Licencia Remunerada',
    'vacaciones': 'Vacaciones',
    'auxilio_transporte': 'Auxilio de Transporte',
    'auxilio_alimentacion': 'Auxilio de Alimentación'
  };
  
  return descriptions[tipoNovedad] || tipoNovedad;
};

/**
 * Format currency value for display
 */
export const formatPreviewCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Calculate the total impact of all pending adjustments
 */
export const calculateTotalImpact = async (
  employees: any[],
  pendingNovedades: PendingNovedad[]
): Promise<{
  totalDevengoChange: number;
  totalDeduccionChange: number;
  totalNetoChange: number;
  employeesAffected: number;
  totalAdjustments: number;
}> => {
  // Group pending novedades by employee
  const pendingByEmployee = pendingNovedades.reduce((acc, pending) => {
    if (!acc[pending.employee_id]) acc[pending.employee_id] = [];
    acc[pending.employee_id].push(pending);
    return acc;
  }, {} as Record<string, PendingNovedad[]>);

  // Calculate previews for affected employees
  const previews = await Promise.all(
    Object.keys(pendingByEmployee).map(async (employeeId) => {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return null;
      
      return await calculateEmployeePreviewImpact(employee, pendingByEmployee[employeeId]);
    })
  );

  // Filter out null results and calculate totals
  const validPreviews = previews.filter(p => p !== null) as EmployeeNovedadPreview[];
  
  return validPreviews.reduce((acc, preview) => {
    const devengoChange = preview.newDevengado - preview.originalDevengado;
    const deduccionChange = preview.newDeducciones - preview.originalDeducciones;
    const netoChange = preview.newNeto - preview.originalNeto;
    
    return {
      totalDevengoChange: acc.totalDevengoChange + devengoChange,
      totalDeduccionChange: acc.totalDeduccionChange + deduccionChange,
      totalNetoChange: acc.totalNetoChange + netoChange,
      employeesAffected: acc.employeesAffected + (preview.hasPending ? 1 : 0),
      totalAdjustments: acc.totalAdjustments + preview.pendingCount
    };
  }, {
    totalDevengoChange: 0,
    totalDeduccionChange: 0,
    totalNetoChange: 0,
    employeesAffected: 0,
    totalAdjustments: 0
  });
};