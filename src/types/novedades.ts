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
  | 'salario_base'
  | 'auxilio_transporte'
  | 'horas_extra'
  | 'recargo_nocturno'
  | 'vacaciones'
  | 'licencia_remunerada'
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
        subtipos: ['diurnas', 'nocturnas', 'dominicales', 'festivas']
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
      incapacidad: {
        label: 'Incapacidad',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        subtipos: ['general', 'laboral', 'maternidad']
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
        label: 'Ausencia',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        subtipos: ['injustificada', 'permiso_no_remunerado', 'suspension']
      },
      descuento_voluntario: {
        label: 'Descuento Voluntario',
        requiere_horas: false,
        requiere_dias: false,
        auto_calculo: false,
        subtipos: ['ahorro', 'prestamo', 'seguro', 'otros']
      }
    }
  }
} as const;

export const HORAS_EXTRA_FACTORS = {
  diurna: 1.25,
  nocturna: 1.75,
  dominical_diurna: 1.75,
  dominical_nocturna: 2.10,
  festiva_diurna: 1.75,
  festiva_nocturna: 2.10
} as const;

// Función para calcular automáticamente el valor de una novedad
export const calcularValorNovedad = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number
): { valor: number; baseCalculo: BaseCalculoData } => {
  const category = Object.values(NOVEDAD_CATEGORIES).find(cat => 
    cat.types[tipoNovedad as keyof typeof cat.types]
  );
  
  if (!category) {
    return { valor: 0, baseCalculo: { salario_base: salarioBase, factor_calculo: 0, detalle_calculo: 'Tipo no encontrado' } };
  }

  const tipoConfig = category.types[tipoNovedad as keyof typeof category.types];
  let valor = 0;
  let detalleCalculo = '';
  let factorCalculo = 0;

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && subtipo) {
        const factor = HORAS_EXTRA_FACTORS[subtipo as keyof typeof HORAS_EXTRA_FACTORS] || 1.25;
        const tarifaHora = salarioBase / 240; // 30 días × 8 horas
        valor = Math.round(tarifaHora * factor * horas);
        factorCalculo = factor;
        detalleCalculo = `(${salarioBase} / 240) × ${factor} × ${horas} horas`;
      }
      break;

    case 'incapacidad':
      if (dias && subtipo === 'eps') {
        // EPS paga 66.7% desde el día 4
        const diasPagados = Math.max(0, dias - 3);
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * 0.667 * diasPagados);
        factorCalculo = 0.667;
        detalleCalculo = `(${salarioBase} / 30) × 0.667 × ${diasPagados} días (desde día 4)`;
      } else if (dias && subtipo === 'arl') {
        // ARL paga 100% desde el día 1
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase} / 30) × ${dias} días`;
      }
      break;

    case 'vacaciones':
      if (dias) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase} / 30) × ${dias} días`;
      }
      break;

    case 'ausencia':
      if (dias) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase} / 30) × ${dias} días`;
      }
      break;

    case 'recargo_nocturno':
      if (horas) {
        const tarifaHora = salarioBase / 240;
        valor = Math.round(tarifaHora * 0.35 * horas); // 35% de recargo
        factorCalculo = 0.35;
        detalleCalculo = `(${salarioBase} / 240) × 0.35 × ${horas} horas`;
      }
      break;

    case 'salud':
      valor = Math.round(salarioBase * 0.04);
      factorCalculo = 0.04;
      detalleCalculo = `${salarioBase} × 4%`;
      break;

    case 'pension':
      valor = Math.round(salarioBase * 0.04);
      factorCalculo = 0.04;
      detalleCalculo = `${salarioBase} × 4%`;
      break;

    default:
      valor = 0;
      detalleCalculo = 'Cálculo manual requerido';
      break;
  }

  return {
    valor,
    baseCalculo: {
      salario_base: salarioBase,
      factor_calculo: factorCalculo,
      tarifa_hora: tipoNovedad.includes('hora') ? salarioBase / 240 : undefined,
      dias_periodo: dias,
      detalle_calculo: detalleCalculo
    }
  };
};
