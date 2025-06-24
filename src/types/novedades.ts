
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
    color: 'text-green-700 bg-green-50 border-green-200',
    icon: '💰',
    types: {
      salario_base: { label: 'Salario base', requiere_dias: true, auto_calculo: true },
      auxilio_transporte: { label: 'Auxilio de transporte', requiere_dias: true, auto_calculo: true },
      horas_extra: { 
        label: 'Horas extra', 
        requiere_horas: true, 
        auto_calculo: true,
        subtipos: {
          diurna: 'Diurna (125%)',
          nocturna: 'Nocturna (175%)',
          dominical_diurna: 'Dominical diurna (175%)',
          dominical_nocturna: 'Dominical nocturna (210%)',
          festiva_diurna: 'Festiva diurna (175%)',
          festiva_nocturna: 'Festiva nocturna (210%)'
        }
      },
      recargo_nocturno: { label: 'Recargo nocturno', requiere_horas: true, auto_calculo: true },
      vacaciones: { 
        label: 'Vacaciones', 
        requiere_dias: true, 
        auto_calculo: true,
        subtipos: {
          disfrutadas: 'Disfrutadas',
          compensadas: 'Compensadas en dinero'
        }
      },
      licencia_remunerada: { 
        label: 'Licencias remuneradas', 
        requiere_dias: true, 
        auto_calculo: true,
        subtipos: {
          maternidad: 'Maternidad',
          paternidad: 'Paternidad',
          luto: 'Luto'
        }
      },
      incapacidad: { 
        label: 'Incapacidades', 
        requiere_dias: true, 
        auto_calculo: true,
        subtipos: {
          eps: 'EPS (General)',
          arl: 'ARL (Laboral)'
        }
      },
      bonificacion: { label: 'Bonificaciones', requiere_valor: true },
      comision: { label: 'Comisiones', requiere_valor: true },
      prima: { label: 'Primas', requiere_valor: true },
      otros_ingresos: { label: 'Otros ingresos', requiere_valor: true }
    }
  },
  deducciones: {
    label: 'Deducciones',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: '📉',
    types: {
      salud: { label: 'Salud (4%)', auto_calculo: true, porcentaje: 0.04 },
      pension: { label: 'Pensión (4%)', auto_calculo: true, porcentaje: 0.04 },
      fondo_solidaridad: { label: 'Fondo Solidaridad Pensional', auto_calculo: true },
      retencion_fuente: { label: 'Retención en la fuente', auto_calculo: true },
      libranza: { label: 'Libranzas/Préstamos', requiere_valor: true },
      ausencia: { label: 'Ausencias no remuneradas', requiere_dias: true, auto_calculo: true },
      multa: { label: 'Multas/Sanciones', requiere_valor: true },
      descuento_voluntario: { label: 'Descuentos voluntarios', requiere_valor: true }
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
