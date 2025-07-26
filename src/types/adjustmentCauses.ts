export interface AdjustmentCause {
  id: string;
  label: string;
  category: string;
  description?: string;
  template?: string;
}

export interface AdjustmentCauseCategory {
  id: string;
  label: string;
  causes: AdjustmentCause[];
}

export const ADJUSTMENT_CAUSE_CATEGORIES: AdjustmentCauseCategory[] = [
  {
    id: 'novedad_fuera_tiempo',
    label: 'Novedad registrada fuera de tiempo',
    causes: [
      {
        id: 'incapacidad_tardia',
        label: 'Incapacidad reportada después del cierre',
        category: 'novedad_fuera_tiempo',
        description: 'Incapacidad médica reportada posterior al cierre del período',
        template: 'Incapacidad del [fecha_inicio] al [fecha_fin] reportada tardíamente por el empleado'
      },
      {
        id: 'vacaciones_tardias',
        label: 'Vacaciones aprobadas tardíamente',
        category: 'novedad_fuera_tiempo',
        description: 'Solicitud de vacaciones aprobada después del período de nómina',
        template: 'Vacaciones del [fecha_inicio] al [fecha_fin] aprobadas posterior al cierre'
      },
      {
        id: 'horas_extra_no_digitadas',
        label: 'Horas extra no digitadas a tiempo',
        category: 'novedad_fuera_tiempo',
        description: 'Horas extra trabajadas pero no registradas oportunamente',
        template: 'Horas extra del [fecha] no registradas en el período correspondiente'
      },
      {
        id: 'licencia_fuera_tiempo',
        label: 'Licencia registrada fuera de tiempo',
        category: 'novedad_fuera_tiempo',
        description: 'Licencia solicitada o aprobada posterior al cierre del período',
        template: 'Licencia del [fecha_inicio] al [fecha_fin] registrada tardíamente'
      }
    ]
  },
  {
    id: 'error_humano',
    label: 'Error humano en el registro',
    causes: [
      {
        id: 'valor_erroneo',
        label: 'Valor ingresado erróneamente',
        category: 'error_humano',
        description: 'Error en la digitación del valor de la novedad',
        template: 'Corrección de valor: se registró $[valor_incorrecto] cuando debía ser $[valor_correcto]'
      },
      {
        id: 'omision_novedad',
        label: 'Omisión de novedad obligatoria',
        category: 'error_humano',
        description: 'Novedad que debía aplicarse pero fue omitida en el proceso inicial',
        template: 'Novedad omitida en el período original, aplicación retroactiva'
      },
      {
        id: 'fechas_incorrectas',
        label: 'Fechas incorrectas en ausencias',
        category: 'error_humano',
        description: 'Error en las fechas registradas para ausencias o permisos',
        template: 'Corrección de fechas: se registró [fecha_incorrecta] cuando era [fecha_correcta]'
      }
    ]
  },
  {
    id: 'cambio_retroactivo',
    label: 'Cambio retroactivo en datos del empleado',
    causes: [
      {
        id: 'modificacion_salarial',
        label: 'Modificación salarial con efecto anterior',
        category: 'cambio_retroactivo',
        description: 'Cambio en el salario con aplicación retroactiva',
        template: 'Ajuste salarial retroactivo desde [fecha_inicio]: de $[salario_anterior] a $[salario_nuevo]'
      },
      {
        id: 'cambio_contrato',
        label: 'Cambio en tipo de contrato',
        category: 'cambio_retroactivo',
        description: 'Modificación en el tipo de contrato con efecto retroactivo',
        template: 'Cambio de contrato [tipo_anterior] a [tipo_nuevo] con efecto desde [fecha]'
      },
      {
        id: 'auxilio_transporte_tardio',
        label: 'Activación tardía de auxilio de transporte',
        category: 'cambio_retroactivo',
        description: 'Auxilio de transporte activado con efecto retroactivo',
        template: 'Activación de auxilio de transporte con efecto desde [fecha_inicio]'
      }
    ]
  },
  {
    id: 'reconocimiento_posterior',
    label: 'Reconocimiento posterior de valores',
    causes: [
      {
        id: 'bonificacion_no_aprobada',
        label: 'Bonificación no aprobada a tiempo',
        category: 'reconocimiento_posterior',
        description: 'Bonificación aprobada posterior al cierre del período',
        template: 'Bonificación [tipo] aprobada tardíamente para el período [mes/año]'
      },
      {
        id: 'comision_posterior',
        label: 'Comisión calculada después del cierre',
        category: 'reconocimiento_posterior',
        description: 'Comisión por ventas calculada posterior al cierre',
        template: 'Comisión por ventas de [período] calculada posterior al cierre'
      },
      {
        id: 'retroactivo_aumento',
        label: 'Retroactivo por aumento salarial',
        category: 'reconocimiento_posterior',
        description: 'Diferencia salarial por aumento no aplicado oportunamente',
        template: 'Retroactivo por aumento salarial desde [fecha] no aplicado oportunamente'
      }
    ]
  },
  {
    id: 'ajuste_voluntario',
    label: 'Ajuste voluntario',
    causes: [
      {
        id: 'acuerdo_empleado',
        label: 'Acuerdo con empleado fuera de proceso',
        category: 'ajuste_voluntario',
        description: 'Acuerdo especial con el empleado no contemplado en el proceso regular',
        template: 'Ajuste por acuerdo especial con el empleado según [referencia_acuerdo]'
      },
      {
        id: 'solicitud_rrhh',
        label: 'Corrección por solicitud de RRHH',
        category: 'ajuste_voluntario',
        description: 'Ajuste solicitado por el área de Recursos Humanos',
        template: 'Ajuste solicitado por RRHH según ticket/solicitud [numero_referencia]'
      }
    ]
  }
];

export const getAllAdjustmentCauses = (): AdjustmentCause[] => {
  return ADJUSTMENT_CAUSE_CATEGORIES.flatMap(category => category.causes);
};

export const getAdjustmentCauseById = (id: string): AdjustmentCause | undefined => {
  return getAllAdjustmentCauses().find(cause => cause.id === id);
};

export const getAdjustmentCausesByCategory = (categoryId: string): AdjustmentCause[] => {
  const category = ADJUSTMENT_CAUSE_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.causes : [];
};