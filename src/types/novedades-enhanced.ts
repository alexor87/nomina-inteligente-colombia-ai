export interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  subtipo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  horas?: number;
  valor: number;
  base_calculo?: BaseCalculoData;
  observacion?: string;
  adjunto_url?: string;
  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface BaseCalculoData {
  salario_base: number;
  factor_calculo: number;
  tarifa_hora?: number;
  porcentaje_ley?: number;
  dias_periodo?: number;
  detalle_calculo: string;
}

// ✅ UNIFIED: Usar la misma interfaz que el servicio
export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  company_id: string; // ✅ Required field
  tipo_novedad: NovedadType;
  subtipo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  horas?: number;
  valor: number; // ✅ Required field
  base_calculo?: BaseCalculoData;
  observacion?: string;
  adjunto_url?: string;
  constitutivo_salario?: boolean;
}

export interface NovedadFormData {
  tipo_novedad: NovedadType;
  subtipo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  horas?: number;
  valor?: number;
  observacion?: string;
}

export type NovedadType = 
  // Devengados
  | 'horas_extra'
  | 'recargo_nocturno'
  | 'vacaciones'
  | 'licencia_remunerada'
  | 'licencia_no_remunerada'
  | 'incapacidad'
  | 'bonificacion'
  | 'comision'
  | 'prima'
  | 'otros_ingresos'
  // Deducciones
  | 'salud'
  | 'pension'
  | 'fondo_solidaridad'
  | 'retencion_fuente'
  | 'libranza'
  | 'deduccion_especial'
  | 'ausencia'
  | 'multa'
  | 'descuento_voluntario';

// ✅ Re-export the missing NOVEDAD_TYPE_LABELS
export const NOVEDAD_TYPE_LABELS: Record<NovedadType, string> = {
  horas_extra: 'Horas Extra',
  recargo_nocturno: 'Recargo Nocturno',
  vacaciones: 'Vacaciones',
  licencia_remunerada: 'Licencia Remunerada',
  licencia_no_remunerada: 'Licencia No Remunerada',
  incapacidad: 'Incapacidad',
  bonificacion: 'Bonificación',
  comision: 'Comisión',
  prima: 'Prima',
  otros_ingresos: 'Otros Ingresos',
  salud: 'Salud',
  pension: 'Pensión',
  fondo_solidaridad: 'Fondo de Solidaridad',
  retencion_fuente: 'Retención en la Fuente',
  libranza: 'Libranza',
  deduccion_especial: 'Deducción Especial',
  ausencia: 'Ausencia',
  multa: 'Multa',
  descuento_voluntario: 'Descuento Voluntario'
};

export const NOVEDAD_CATEGORIES = {
  devengados: {
    label: 'Devengados',
    color: 'green',
    types: {
      horas_extra: {
        label: 'Horas Extra',
        requiere_horas: true,
        requiere_dias: false,
        auto_calculo: true,
        constitutivo_default: false, // ✅ Horas extra NO son constitutivas de salario
        subtipos: ['diurnas', 'nocturnas', 'dominicales_diurnas', 'dominicales_nocturnas', 'festivas_diurnas', 'festivas_nocturnas']
      },
      recargo_nocturno: {
        label: 'Recargo Nocturno',
        requiere_horas: true,
        requiere_dias: false,
        auto_calculo: true,
        constitutivo_default: false, // ✅ Recargos NO son constitutivos de salario
        subtipos: ['nocturno', 'nocturno_dominical', 'nocturno_festivo']
      },
      bonificacion: {
        label: 'Bonificación',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        constitutivo_default: false, // ⚠️ Depende si es habitual (usuario decide)
        subtipos: ['productividad', 'ventas', 'puntualidad', 'permanencia']
      },
      comision: {
        label: 'Comisión',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        constitutivo_default: true, // ✅ Comisiones generalmente SÍ son constitutivas
        subtipos: ['ventas', 'cobranza', 'meta']
      },
      prima: {
        label: 'Prima Extralegal',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        constitutivo_default: true, // ✅ Primas extralegales SÍ son constitutivas
        subtipos: ['servicios', 'navidad', 'vacaciones']
      },
      vacaciones: {
        label: 'Vacaciones',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        constitutivo_default: true, // ✅ Vacaciones SÍ son constitutivas
        subtipos: []
      },
      incapacidad: {
        label: 'Incapacidad',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        constitutivo_default: false, // ✅ Incapacidades NO son constitutivas
        subtipos: ['general', 'laboral', 'maternidad']
      },
      licencia_remunerada: {
        label: 'Licencia Remunerada',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        constitutivo_default: true, // ✅ Licencias remuneradas SÍ son constitutivas
        subtipos: ['paternidad', 'matrimonio', 'luto', 'estudio']
      },
      licencia_no_remunerada: {
        label: 'Licencia No Remunerada',
        description: 'Permiso autorizado sin pago que mantiene el vínculo laboral',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        constitutivo_default: false, // ✅ Licencias no remuneradas NO son constitutivas
        legal_note: 'Suspende temporalmente prestaciones sociales según Art. 51 CST',
        affects_benefits: true,
        subtipos: [
          'personal', 
          'estudios', 
          'familiar', 
          'salud_no_eps', 
          'maternidad_extendida',
          'cuidado_hijo_menor',
          'emergencia_familiar'
        ]
      },
      otros_ingresos: {
        label: 'Otros Ingresos',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        constitutivo_default: false, // ⚠️ Depende del tipo específico (usuario decide)
        subtipos: ['subsidios', 'reintegros', 'compensaciones']
      }
    }
  },
  deducciones: {
    label: 'Deducciones',
    color: 'red',
    types: {
      libranza: {
        label: 'Libranza',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['banco', 'cooperativa', 'empresa']
      },
      multa: {
        label: 'Multa',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['disciplinaria', 'reglamentaria', 'contractual']
      },
      ausencia: {
        label: 'Ausencia Injustificada',
        description: 'Ausencias que generan descuento salarial por incumplimiento laboral',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        legal_note: 'Genera descuento proporcional del salario según Art. 57 CST',
        subtipos: ['injustificada', 'abandono_puesto', 'suspension_disciplinaria', 'tardanza_excesiva']
      },
      descuento_voluntario: {
        label: 'Descuento Voluntario',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['ahorro', 'prestamo', 'seguro', 'otros']
      },
      retencion_fuente: {
        label: 'Retención en la Fuente',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: []
      },
      fondo_solidaridad: {
        label: 'Fondo de Solidaridad',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: true,
        subtipos: []
      }
    }
  }
} as const;

// Factores corregidos según legislación colombiana (Art. 168 CST)
export const HORAS_EXTRA_FACTORS = {
  diurnas: 1.25,
  nocturnas: 1.75,
  dominicales_diurnas: 2.0,
  dominicales_nocturnas: 2.5,
  festivas_diurnas: 2.0,
  festivas_nocturnas: 2.5
} as const;

/**
 * ⚠️ FUNCIÓN MARCADA COMO OBSOLETA - MIGRACIÓN A BACKEND
 * @deprecated Usar useNovedadBackendCalculation hook en su lugar
 * Todos los cálculos de novedades ahora se realizan en el backend para mayor consistencia
 */
export const calcularValorNovedadEnhanced = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number,
  fechaPeriodo?: Date
): { valor: number; baseCalculo: BaseCalculoData } => {
  console.warn('⚠️ calcularValorNovedadEnhanced está obsoleto. Usar useNovedadBackendCalculation hook');
  console.warn('⚠️ Los cálculos ahora se realizan en el backend con jornada legal dinámica');
  
  // Retornar valor básico para evitar errores durante la migración
  return {
    valor: 0,
    baseCalculo: {
      salario_base: salarioBase,
      factor_calculo: 0,
      detalle_calculo: 'Migrado a backend calculation service - usar useNovedadBackendCalculation hook'
    }
  };
};

/**
 * ⚠️ FUNCIÓN MARCADA COMO OBSOLETA - MIGRACIÓN A BACKEND
 * @deprecated Usar useNovedadBackendCalculation hook en su lugar
 */
export const calcularValorNovedad = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number
): { valor: number; baseCalculo: BaseCalculoData } => {
  console.warn('⚠️ calcularValorNovedad está obsoleto. Usar calcularValorNovedadEnhanced o mejor aún useNovedadBackendCalculation hook');
  return calcularValorNovedadEnhanced(tipoNovedad, subtipo, salarioBase, dias, horas);
};
