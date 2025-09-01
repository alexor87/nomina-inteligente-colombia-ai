import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';

/**
 * Calculate preview impact of pending novedades on employee payroll
 */
export const calculateEmployeePreviewImpact = (
  employee: any,
  pendingNovedades: PendingNovedad[]
): EmployeeNovedadPreview => {
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

  // Calculate adjustments from pending novedades
  let devengoAdjustment = 0;
  let deduccionAdjustment = 0;

  pendingNovedades.forEach(pending => {
    const valor = pending.valor || 0;
    
    // Classify novedad types based on whether they add to earnings or deductions
    const isDeduction = isDeductionType(pending.tipo_novedad);
    const isEarning = isEarningType(pending.tipo_novedad);
    
    if (isDeduction) {
      deduccionAdjustment += Math.abs(valor); // Ensure positive for deductions
    } else if (isEarning) {
      devengoAdjustment += Math.abs(valor); // Ensure positive for earnings
    } else {
      // Handle neutral or mixed types
      if (valor < 0) {
        deduccionAdjustment += Math.abs(valor);
      } else {
        devengoAdjustment += valor;
      }
    }
  });

  const originalDevengado = employee.total_devengado || 0;
  const originalDeducciones = employee.total_deducciones || 0;
  const originalNeto = employee.neto_pagado || 0;

  const newDevengado = originalDevengado + devengoAdjustment;
  const newDeducciones = originalDeducciones + deduccionAdjustment;
  const newNeto = newDevengado - newDeducciones;

  // Calculate IBC impact from pending novedades
  let constitutiveIBCAdjustment = 0;
  let nonRemuneratedDays = 0;

  pendingNovedades.forEach(pending => {
    const valor = pending.valor || 0;
    const dias = pending.novedadData?.dias || 0;
    
    // Core constitutive types (always constitutive by nature)
    const alwaysConstitutiveTypes = [
      'horas_extra', 'recargo_nocturno', 'recargo_dominical', 'comision', 
      'bonificacion', 'vacaciones', 'licencia_remunerada'
    ];
    
    const isNonRemunerated = [
      'ausencia', 'licencia_no_remunerada', 'incapacidad'
    ].includes(pending.tipo_novedad);
    
    // Unified IBC constitutive logic: always constitutive OR explicitly marked
    const isConstitutiveForIBC = alwaysConstitutiveTypes.includes(pending.tipo_novedad) || 
                                 pending.novedadData?.constitutivo_salario === true;
    
    if (isConstitutiveForIBC) {
      constitutiveIBCAdjustment += valor;
    }
    
    if (isNonRemunerated) {
      nonRemuneratedDays += dias;
    }
  });

  // Calculate new IBC with adjustments
  const salarioBase = employee.salario_base || 0;
  const diasTrabajados = employee.dias_trabajados || 30;
  const effectiveDays = Math.max(0, diasTrabajados - nonRemuneratedDays);
  
  // Recalculate IBC: (salario_base / 30 * effective_days) + constitutive_adjustments
  const ibcBase = (salarioBase / 30) * effectiveDays;
  let newIBC = ibcBase + constitutiveIBCAdjustment;
  
  // Apply maximum cap (25 SMMLV)
  const SMMLV_2025 = 1300000;
  newIBC = Math.min(newIBC, SMMLV_2025 * 25);

  return {
    originalDevengado,
    newDevengado,
    originalDeducciones,
    newDeducciones,
    originalNeto,
    newNeto,
    originalIBC: employee.ibc || 0,
    newIBC: Math.round(newIBC),
    pendingCount: pendingNovedades.length,
    hasPending: true
  };
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
export const calculateTotalImpact = (previews: EmployeeNovedadPreview[]) => {
  return previews.reduce((acc, preview) => {
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