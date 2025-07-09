
import { Database } from '@/integrations/supabase/types';

// Use the database enum directly from the correct path
export type NovedadType = Database['public']['Enums']['novedad_type'];

export const NOVEDAD_TYPE_LABELS: Record<NovedadType, string> = {
  // Income types
  horas_extra: 'Horas Extra',
  recargo_nocturno: 'Recargo Nocturno',
  bonificacion: 'Bonificación',
  comision: 'Comisión',
  prima: 'Prima',
  otros_ingresos: 'Otros Ingresos',
  
  // Time-related
  vacaciones: 'Vacaciones',
  incapacidad: 'Incapacidad',
  licencia_remunerada: 'Licencia Remunerada',
  licencia_no_remunerada: 'Licencia No Remunerada',
  
  // Deductions
  salud: 'Descuento Salud',
  pension: 'Descuento Pensión',
  arl: 'Descuento ARL',
  retencion_fuente: 'Retención en la Fuente',
  fondo_solidaridad: 'Fondo de Solidaridad',
  ausencia: 'Ausencia'
};

export interface CreateNovedadData {
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  valor: number; // Required field
  dias?: number;
  horas?: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
  adjunto_url?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  valor?: number;
  dias?: number;
  horas?: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
  adjunto_url?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface NovedadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NovedadCalculationParams {
  employeeSalary: number;
  workingDays: number;
  workingHours: number;
  tipo_novedad: NovedadType;
  valor?: number;
  dias?: number;
  horas?: number;
}

export interface NovedadCalculationResult {
  calculatedValue: number;
  basis: string;
  formula: string;
  breakdown: {
    baseValue: number;
    multiplier: number;
    days?: number;
    hours?: number;
  };
}

// Mapping utilities
export const mapNovedadFromDB = (dbNovedad: any): PayrollNovedad => {
  return {
    id: dbNovedad.id,
    company_id: dbNovedad.company_id,
    empleado_id: dbNovedad.empleado_id,
    periodo_id: dbNovedad.periodo_id,
    tipo_novedad: dbNovedad.tipo_novedad,
    valor: dbNovedad.valor,
    dias: dbNovedad.dias,
    horas: dbNovedad.horas,
    observacion: dbNovedad.observacion,
    constitutivo_salario: dbNovedad.constitutivo_salario,
    base_calculo: dbNovedad.base_calculo,
    subtipo: dbNovedad.subtipo,
    adjunto_url: dbNovedad.adjunto_url,
    fecha_inicio: dbNovedad.fecha_inicio,
    fecha_fin: dbNovedad.fecha_fin,
    creado_por: dbNovedad.creado_por,
    created_at: dbNovedad.created_at,
    updated_at: dbNovedad.updated_at
  };
};

export const mapNovedadToDB = (novedad: CreateNovedadData | Partial<PayrollNovedad>) => {
  return {
    company_id: novedad.company_id,
    empleado_id: novedad.empleado_id,
    periodo_id: novedad.periodo_id,
    tipo_novedad: novedad.tipo_novedad,
    valor: novedad.valor || 0,
    dias: novedad.dias || null,
    horas: novedad.horas || null,
    observacion: novedad.observacion || null,
    constitutivo_salario: novedad.constitutivo_salario || false,
    base_calculo: novedad.base_calculo || null,
    subtipo: novedad.subtipo || null,
    adjunto_url: novedad.adjunto_url || null,
    fecha_inicio: novedad.fecha_inicio || null,
    fecha_fin: novedad.fecha_fin || null
  };
};

// Helper functions
export const getNovedadLabel = (tipo: NovedadType): string => {
  return NOVEDAD_TYPE_LABELS[tipo] || tipo;
};

export const getNovedadColor = (tipo: NovedadType): string => {
  const ingresos: NovedadType[] = ['horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'];
  const deducciones: NovedadType[] = ['salud', 'pension', 'arl', 'retencion_fuente', 'fondo_solidaridad'];
  const tiempos: NovedadType[] = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'];
  
  if (ingresos.includes(tipo)) return 'bg-green-100 text-green-800';
  if (deducciones.includes(tipo)) return 'bg-red-100 text-red-800';
  if (tiempos.includes(tipo)) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

export const isIngreso = (tipo: NovedadType): boolean => {
  return ['horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(tipo);
};

export const isDeduccion = (tipo: NovedadType): boolean => {
  return ['salud', 'pension', 'arl', 'retencion_fuente', 'fondo_solidaridad'].includes(tipo);
};

export const isTiempo = (tipo: NovedadType): boolean => {
  return ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(tipo);
};

// Enhanced calculation function
export const calcularValorNovedadEnhanced = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number,
  fechaPeriodo: Date = new Date()
): { valor: number; formula: string; breakdown: any } => {
  let valor = 0;
  let formula = '';
  let breakdown = {};

  const salarioDiario = salarioBase / 30;
  const salarioHora = salarioBase / (30 * 8);

  switch (tipoNovedad) {
    case 'vacaciones':
      if (dias) {
        valor = salarioDiario * dias;
        formula = `(${salarioBase} / 30) * ${dias} días`;
        breakdown = { salarioBase, salarioDiario, dias };
      }
      break;

    case 'horas_extra':
      if (horas) {
        const factor = subtipo === 'nocturna' ? 1.75 : 1.25; // Recargo nocturno vs diurno
        valor = salarioHora * horas * factor;
        formula = `(${salarioBase} / 240) * ${horas} * ${factor}`;
        breakdown = { salarioBase, salarioHora, horas, factor };
      }
      break;

    case 'incapacidad':
      if (dias) {
        // Primeros 2 días: 0%, día 3 en adelante: 66.67%
        const diasPagados = Math.max(0, dias - 2);
        valor = salarioDiario * diasPagados * 0.6667;
        formula = `(${salarioBase} / 30) * ${diasPagados} días * 66.67%`;
        breakdown = { salarioBase, salarioDiario, dias, diasPagados };
      }
      break;

    case 'licencia_remunerada':
      if (dias) {
        valor = salarioDiario * dias;
        formula = `(${salarioBase} / 30) * ${dias} días`;
        breakdown = { salarioBase, salarioDiario, dias };
      }
      break;

    case 'ausencia':
      if (dias) {
        valor = -(salarioDiario * dias); // Negativo para descuentos
        formula = `-(${salarioBase} / 30) * ${dias} días`;
        breakdown = { salarioBase, salarioDiario, dias };
      }
      break;

    default:
      valor = 0;
      formula = 'Cálculo manual requerido';
      break;
  }

  return {
    valor: Math.round(valor),
    formula,
    breakdown
  };
};

// Calculation helper
export const calcularValorNovedad = (params: NovedadCalculationParams): NovedadCalculationResult => {
  const { employeeSalary, workingDays, workingHours, tipo_novedad, valor, dias, horas } = params;
  
  let calculatedValue = valor || 0;
  let basis = 'Valor fijo';
  let formula = `${calculatedValue}`;
  
  const breakdown = {
    baseValue: employeeSalary,
    multiplier: 1,
    days: dias,
    hours: horas
  };

  // Simple calculation based on type
  switch (tipo_novedad) {
    case 'horas_extra':
      if (horas) {
        const hourlyRate = employeeSalary / (workingDays * workingHours);
        calculatedValue = hourlyRate * horas * 1.25; // 25% extra
        basis = 'Horas trabajadas';
        formula = `(${employeeSalary} / ${workingDays * workingHours}) * ${horas} * 1.25`;
        breakdown.multiplier = 1.25;
      }
      break;
    case 'vacaciones':
      if (dias) {
        const dailyRate = employeeSalary / workingDays;
        calculatedValue = dailyRate * dias;
        basis = 'Días de vacaciones';
        formula = `(${employeeSalary} / ${workingDays}) * ${dias}`;
      }
      break;
    default:
      calculatedValue = valor || 0;
      break;
  }

  return {
    calculatedValue,
    basis,
    formula,
    breakdown
  };
};
