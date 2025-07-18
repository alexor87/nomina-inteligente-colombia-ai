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

// ✅ FUNCIÓN ACTUALIZADA PARA USAR SERVICIO UNIFICADO
import { RecargosCalculationService } from '@/services/RecargosCalculationService';

export const calcularValorNovedad = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number,
  fechaPeriodo?: Date
): { valor: number; baseCalculo: BaseCalculoData } => {
  console.log('🧮 Calculando novedad con fecha del período:', { 
    tipoNovedad, 
    subtipo, 
    salarioBase, 
    dias, 
    horas, 
    fechaPeriodo: fechaPeriodo?.toISOString().split('T')[0] 
  });
  
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
          
          // Mejorar detalle del cálculo según el tipo
          let tipoDescripcion = '';
          switch (subtipo) {
            case 'diurnas':
              tipoDescripcion = 'Horas extra diurnas (25% recargo)';
              break;
            case 'nocturnas':
              tipoDescripcion = 'Horas extra nocturnas (75% recargo)';
              break;
            case 'dominicales_diurnas':
              tipoDescripcion = 'Horas dominicales diurnas (100% recargo)';
              break;
            case 'dominicales_nocturnas':
              tipoDescripcion = 'Horas dominicales nocturnas (150% recargo)';
              break;
            case 'festivas_diurnas':
              tipoDescripcion = 'Horas festivas diurnas (100% recargo)';
              break;
            case 'festivas_nocturnas':
              tipoDescripcion = 'Horas festivas nocturnas (150% recargo)';
              break;
            default:
              tipoDescripcion = `Horas extra ${subtipo}`;
          }
          
          detalleCalculo = `${tipoDescripcion}: (${salarioBase.toLocaleString()} ÷ 240) × ${factor} × ${horas} horas = ${valor.toLocaleString()}`;
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
      // ✅ USAR SERVICIO UNIFICADO CON FACTORES DINÁMICOS
      if (horas && horas > 0 && subtipo) {
        try {
          const resultado = RecargosCalculationService.calcularRecargo({
            salarioBase,
            tipoRecargo: subtipo as any,
            horas,
            fechaPeriodo: fechaPeriodo || new Date() // ✅ Usar fecha del período
          });
          
          valor = resultado.valorRecargo;
          factorCalculo = resultado.factorRecargo;
          
          // ✅ MEJORAR: Detalle con información normativa
          detalleCalculo = `${resultado.detalleCalculo}`;
          if (resultado.factorInfo) {
            detalleCalculo += ` (${resultado.factorInfo.normativaAplicable})`;
          }
          
          console.log('✅ Recargo calculado con factores dinámicos:', resultado);
        } catch (error) {
          console.error('❌ Error calculando recargo:', error);
          detalleCalculo = 'Error en cálculo de recargo';
        }
      } else {
        detalleCalculo = 'Ingrese las horas de recargo y seleccione tipo';
      }
      break;

    case 'incapacidad':
      if (dias && dias > 0 && subtipo) {
        console.log('Calculando incapacidad - subtipo:', subtipo);
        const salarioDiario = salarioBase / 30;
        
        if (subtipo === 'general') {
          // ✅ NUEVA LÓGICA: Cálculo desde día 1 según normativa colombiana
          console.log(`🏥 [INCAPACIDAD v3.0] Calculando incapacidad general: ${dias} días, salario base: ${salarioBase}`);
          
          // Calcular valor diario al 66.67%
          const valorDiarioCalculado = salarioDiario * 0.6667;
          
          // ✅ TOPE MÍNIMO: SMLDV 2025 = $1.423.500 / 30 = $47.450
          const smldv = 1423500 / 30;
          
          // Aplicar el mayor entre el cálculo y el SMLDV
          const valorDiarioFinal = Math.max(valorDiarioCalculado, smldv);
          
          // Aplicar a TODOS los días (desde día 1)
          valor = Math.round(valorDiarioFinal * dias);
          factorCalculo = valorDiarioFinal / salarioDiario;
          
          const tipoTope = valorDiarioFinal === smldv ? '(aplicando SMLDV como tope mínimo)' : '(66.67% del salario)';
          detalleCalculo = `Incapacidad general: ${dias} días × $${Math.round(valorDiarioFinal).toLocaleString()} ${tipoTope} = $${valor.toLocaleString()}`;
          
        } else if (subtipo === 'laboral') {
          // Incapacidades laborales: 100% desde día 1
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `Incapacidad laboral: (${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        }
      } else {
        detalleCalculo = 'Ingrese días y seleccione tipo de incapacidad';
      }
      break;

    case 'vacaciones':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `Vacaciones: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
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
        
        // ✅ NUEVA LÓGICA: Manejo específico para maternidad
        if (subtipo === 'maternidad') {
          detalleCalculo = `Licencia de maternidad: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()} (Ley 1822/2017 - Pago EPS)`;
        } else {
          detalleCalculo = `Licencia remunerada: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
        }
        
        console.log('Resultado licencia remunerada:', { subtipo, dias, valor });
      } else {
        detalleCalculo = 'Ingrese los días de licencia';
      }
      break;

    // ✅ NUEVA LÓGICA: Licencia no remunerada (valor siempre $0)
    case 'licencia_no_remunerada':
      valor = 0; // Siempre $0 por definición legal
      factorCalculo = 0;
      if (dias && dias > 0) {
        detalleCalculo = `Licencia no remunerada: ${dias} días sin remuneración (Art. 51 CST). Suspende acumulación de prestaciones sociales.`;
      } else {
        detalleCalculo = 'Licencia no remunerada: Sin remuneración por definición legal';
      }
      console.log('Resultado licencia no remunerada:', { dias, valor: 0 });
      break;

    // ✅ DIFERENCIACIÓN: Ausencia injustificada (descuenta del salario)
    case 'ausencia':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        
        let tipoAusencia = '';
        switch (subtipo) {
          case 'injustificada':
            tipoAusencia = 'Ausencia injustificada';
            break;
          case 'abandono_puesto':
            tipoAusencia = 'Abandono del puesto';
            break;
          case 'suspension_disciplinaria':
            tipoAusencia = 'Suspensión disciplinaria';
            break;
          case 'tardanza_excesiva':
            tipoAusencia = 'Tardanza excesiva';
            break;
          default:
            tipoAusencia = 'Ausencia';
        }
        
        detalleCalculo = `${tipoAusencia}: Descuento de (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()} (Art. 57 CST)`;
        console.log('Resultado ausencia injustificada:', { subtipo, dias, valor });
      } else {
        detalleCalculo = 'Ingrese los días de ausencia injustificada';
      }
      break;

    case 'fondo_solidaridad':
      // Solo aplica para salarios >= 4 SMMLV
      if (salarioBase >= (1300000 * 4)) {
        valor = Math.round(salarioBase * 0.01); // 1%
        factorCalculo = 0.01;
        detalleCalculo = `Fondo de solidaridad: ${salarioBase.toLocaleString()} × 1% = ${valor.toLocaleString()}`;
      } else {
        detalleCalculo = 'Fondo de solidaridad aplica para salarios >= 4 SMMLV';
      }
      break;

    default:
      console.log('Tipo de novedad sin cálculo automático:', tipoNovedad);
      detalleCalculo = 'Ingrese el valor manualmente';
  }

  return {
    valor,
    baseCalculo: {
      salario_base: salarioBase,
      factor_calculo: factorCalculo,
      detalle_calculo: detalleCalculo
    }
  };
};
