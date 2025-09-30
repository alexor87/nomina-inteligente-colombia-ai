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

export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  subtipo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  horas?: number;
  valor?: number;
  base_calculo?: BaseCalculoData;
  observacion?: string;
  adjunto_url?: string;
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
  | 'ausencia'
  | 'multa'
  | 'descuento_voluntario';

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
        subtipos: ['diurnas', 'nocturnas', 'dominicales_diurnas', 'dominicales_nocturnas', 'festivas_diurnas', 'festivas_nocturnas']
      },
      recargo_nocturno: {
        label: 'Recargo Nocturno',
        requiere_horas: true,
        requiere_dias: false,
        auto_calculo: true,
        subtipos: []
      },
      bonificacion: {
        label: 'Bonificación',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['productividad', 'ventas', 'puntualidad', 'permanencia']
      },
      comision: {
        label: 'Comisión',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['ventas', 'cobranza', 'meta']
      },
      prima: {
        label: 'Prima Extralegal',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['servicios', 'navidad', 'vacaciones']
      },
      vacaciones: {
        label: 'Vacaciones',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        subtipos: []
      },
      incapacidad: {
        label: 'Incapacidad',
        description: 'Incapacidades médicas por enfermedad o accidente',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        legal_note: 'Pago según normativa de seguridad social',
        subtipos: ['general', 'laboral']
      },
      licencia_remunerada: {
        label: 'Licencia Remunerada',
        description: 'Licencias laborales con pago del 100% del salario',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        legal_note: 'Derecho del trabajador según Arts. 57, 230 CST y normas especiales',
        subtipos: ['paternidad', 'maternidad', 'matrimonio', 'luto', 'estudio']
      },
      licencia_no_remunerada: {
        label: 'Licencia No Remunerada',
        description: 'Permiso autorizado sin pago que mantiene el vínculo laboral',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: false,
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
  diurnas: 1.25,                    // 25% de recargo (Art. 168 CST)
  nocturnas: 1.75,                  // 75% de recargo (Art. 168 CST)
  dominicales_diurnas: 2.0,         // 100% de recargo para trabajo dominical diurno
  dominicales_nocturnas: 2.5,       // 150% de recargo para trabajo dominical nocturno
  festivas_diurnas: 2.0,            // 100% de recargo para días festivos diurnos
  festivas_nocturnas: 2.5           // 150% de recargo para días festivos nocturnos
} as const;

/**
 * ⚠️ FUNCIÓN COMPLETAMENTE ELIMINADA - SOLO BACKEND
 * @deprecated Todos los cálculos se realizan exclusivamente en el backend
 * @removed Esta función de 250+ líneas de cálculos frontend ha sido eliminada
 * 
 * ✅ USAR: useNovedadBackendCalculation hook
 * ✅ BACKEND: supabase/functions/payroll-calculations
 * ✅ SERVICIO: NovedadesCalculationService
 */
