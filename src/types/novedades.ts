
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
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        subtipos: ['general', 'laboral', 'maternidad']
      },
      licencia_remunerada: {
        label: 'Licencia Remunerada',
        requiere_horas: false,
        requiere_dias: true,
        auto_calculo: true,
        subtipos: ['paternidad', 'matrimonio', 'luto']
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

export const HORAS_EXTRA_FACTORS = {
  diurnas: 1.25,      // 25% de recargo
  nocturnas: 1.75,    // 75% de recargo
  dominicales: 1.75,  // 75% de recargo
  festivas: 1.75      // 75% de recargo
} as const;

// Función para calcular automáticamente el valor de una novedad
export const calcularValorNovedad = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number
): { valor: number; baseCalculo: BaseCalculoData } => {
  console.log('🧮 Calculando novedad:', { tipoNovedad, subtipo, salarioBase, dias, horas });
  
  const category = Object.values(NOVEDAD_CATEGORIES).find(cat => 
    cat.types[tipoNovedad as keyof typeof cat.types]
  );
  
  if (!category) {
    console.log('❌ Tipo de novedad no encontrado en las categorías');
    return { valor: 0, baseCalculo: { salario_base: salarioBase, factor_calculo: 0, detalle_calculo: 'Tipo no encontrado' } };
  }

  const tipoConfig = category.types[tipoNovedad as keyof typeof category.types];
  let valor = 0;
  let detalleCalculo = '';
  let factorCalculo = 0;

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && horas > 0 && subtipo) {
        console.log('Calculando horas extra - subtipo:', subtipo);
        const factor = HORAS_EXTRA_FACTORS[subtipo as keyof typeof HORAS_EXTRA_FACTORS];
        if (factor) {
          console.log('Factor aplicado:', factor);
          const tarifaHora = salarioBase / 240; // 30 días × 8 horas
          valor = Math.round(tarifaHora * factor * horas);
          factorCalculo = factor;
          detalleCalculo = `(${salarioBase.toLocaleString()} / 240) × ${factor} × ${horas} horas = ${valor.toLocaleString()}`;
          console.log('Resultado horas extra:', { tarifaHora, factor, horas, valor });
        } else {
          console.log('❌ Factor no encontrado para subtipo:', subtipo);
          detalleCalculo = 'Subtipo de horas extra no válido';
        }
      } else {
        console.log('❌ Faltan datos para calcular horas extra:', { horas, subtipo });
        detalleCalculo = 'Ingrese horas y seleccione subtipo';
      }
      break;

    case 'recargo_nocturno':
      if (horas && horas > 0) {
        const tarifaHora = salarioBase / 240;
        valor = Math.round(tarifaHora * 0.35 * horas); // 35% de recargo
        factorCalculo = 0.35;
        detalleCalculo = `(${salarioBase.toLocaleString()} / 240) × 0.35 × ${horas} horas = ${valor.toLocaleString()}`;
        console.log('Resultado recargo nocturno:', { tarifaHora, valor });
      } else {
        detalleCalculo = 'Ingrese las horas de recargo nocturno';
      }
      break;

    case 'incapacidad':
      if (dias && dias > 0 && subtipo) {
        console.log('Calculando incapacidad - subtipo:', subtipo);
        const salarioDiario = salarioBase / 30;
        
        if (subtipo === 'general') {
          // EPS paga 66.7% desde el día 4
          const diasPagados = Math.max(0, dias - 3);
          if (diasPagados > 0) {
            valor = Math.round(salarioDiario * 0.667 * diasPagados);
            factorCalculo = 0.667;
            detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × 66.7% × ${diasPagados} días (desde día 4) = ${valor.toLocaleString()}`;
          } else {
            detalleCalculo = 'Incapacidad general: EPS paga desde el día 4';
          }
        } else if (subtipo === 'laboral') {
          // ARL paga 100% desde el día 1
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        } else if (subtipo === 'maternidad') {
          // 100% del salario
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        }
        console.log('Resultado incapacidad:', { subtipo, dias, valor });
      } else {
        detalleCalculo = 'Ingrese días y seleccione tipo de incapacidad';
      }
      break;

    case 'vacaciones':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
        console.log('Resultado vacaciones:', { dias, valor });
      } else {
        detalleCalculo = 'Ingrese los días de vacaciones';
      }
      break;

    case 'licencia_remunerada':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
        console.log('Resultado licencia remunerada:', { dias, valor });
      } else {
        detalleCalculo = 'Ingrese los días de licencia';
      }
      break;

    case 'ausencia':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `(${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
        console.log('Resultado ausencia:', { dias, valor });
      } else {
        detalleCalculo = 'Ingrese los días de ausencia';
      }
      break;

    case 'fondo_solidaridad':
      // Solo aplica para salarios >= 4 SMMLV
      if (salarioBase >= (1300000 * 4)) {
        valor = Math.round(salarioBase * 0.01); // 1%
        factorCalculo = 0.01;
        detalleCalculo = `${salarioBase.toLocaleString()} × 1% = ${valor.toLocaleString()}`;
      } else {
        detalleCalculo = 'Fondo de solidaridad aplica para salarios >= 4 SMMLV';
      }
      break;

    default:
      console.log('Tipo de novedad sin cálculo automático:', tipoNovedad);
      detalleCalculo = 'Cálculo manual requerido';
      break;
  }

  console.log('Resultado final cálculo:', { valor, detalleCalculo });

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
