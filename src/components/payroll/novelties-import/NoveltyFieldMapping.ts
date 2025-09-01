import { NovedadType, NOVEDAD_TYPE_LABELS } from '@/types/novedades-enhanced';

export interface NoveltyFieldMappingConfig {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'select' | 'number' | 'date' | 'boolean';
  options?: string[];
  description?: string;
}

// All available novelty types from the database enum
export const AVAILABLE_NOVELTY_TYPES: NoveltyFieldMappingConfig[] = Object.entries(NOVEDAD_TYPE_LABELS).map(([key, label]) => ({
  key,
  label,
  required: false,
  type: 'select' as const,
}));

// Field mapping configuration for novelty import
export const NOVELTY_FIELD_MAPPINGS: NoveltyFieldMappingConfig[] = [
  // Required fields
  {
    key: 'employee_identification',
    label: 'Identificación del Empleado',
    required: true,
    type: 'text',
    description: 'Cédula, email o ID del empleado'
  },
  {
    key: 'tipo_novedad',
    label: 'Tipo de Novedad',
    required: true,
    type: 'select',
    options: Object.keys(NOVEDAD_TYPE_LABELS),
    description: 'Tipo de novedad a aplicar'
  },
  {
    key: 'valor',
    label: 'Valor',
    required: true,
    type: 'number',
    description: 'Valor de la novedad en pesos'
  },

  // Optional fields
  {
    key: 'subtipo',
    label: 'Subtipo',
    required: false,
    type: 'text',
    description: 'Subtipo específico de la novedad (opcional)'
  },
  {
    key: 'fecha_inicio',
    label: 'Fecha Inicio',
    required: false,
    type: 'date',
    description: 'Fecha de inicio (formato: YYYY-MM-DD)'
  },
  {
    key: 'fecha_fin',
    label: 'Fecha Fin',
    required: false,
    type: 'date',
    description: 'Fecha de fin (formato: YYYY-MM-DD)'
  },
  {
    key: 'dias',
    label: 'Días',
    required: false,
    type: 'number',
    description: 'Número de días (para ausencias, vacaciones, etc.)'
  },
  {
    key: 'horas',
    label: 'Horas',
    required: false,
    type: 'number',
    description: 'Número de horas (para horas extra, recargos)'
  },
  {
    key: 'observacion',
    label: 'Observaciones',
    required: false,
    type: 'text',
    description: 'Comentarios adicionales sobre la novedad'
  },
  {
    key: 'constitutivo_salario',
    label: 'Constitutivo de Salario',
    required: false,
    type: 'boolean',
    description: 'Si la novedad es constitutiva de salario para IBC (verdadero/falso)'
  }
];

export const getRequiredNoveltyFields = (): NoveltyFieldMappingConfig[] => {
  return NOVELTY_FIELD_MAPPINGS.filter(field => field.required);
};

export const getOptionalNoveltyFields = (): NoveltyFieldMappingConfig[] => {
  return NOVELTY_FIELD_MAPPINGS.filter(field => !field.required);
};

export const getNoveltyFieldByKey = (key: string): NoveltyFieldMappingConfig | undefined => {
  return NOVELTY_FIELD_MAPPINGS.find(field => field.key === key);
};

// Validation rules for specific novelty types
export const NOVELTY_VALIDATION_RULES: Record<string, {
  requiredFields: string[];
  forbiddenFields: string[];
  validations: Record<string, (value: any) => string | null>;
}> = {
  'horas_extra': {
    requiredFields: ['horas'],
    forbiddenFields: [],
    validations: {
      horas: (value: number) => {
        if (!value || value <= 0) return 'Las horas extra deben ser mayor a 0';
        if (value > 12) return 'Las horas extra no pueden exceder 12 horas por día';
        return null;
      }
    }
  },
  'recargo_nocturno': {
    requiredFields: ['horas'],
    forbiddenFields: [],
    validations: {
      horas: (value: number) => {
        if (!value || value <= 0) return 'Las horas de recargo nocturno deben ser mayor a 0';
        return null;
      }
    }
  },
  'vacaciones': {
    requiredFields: ['dias', 'fecha_inicio', 'fecha_fin'],
    forbiddenFields: ['horas'],
    validations: {
      dias: (value: number) => {
        if (!value || value <= 0) return 'Los días de vacaciones deben ser mayor a 0';
        if (value > 30) return 'Los días de vacaciones no pueden exceder 30 días';
        return null;
      }
    }
  },
  'incapacidad': {
    requiredFields: ['dias', 'fecha_inicio', 'fecha_fin'],
    forbiddenFields: ['horas'],
    validations: {
      dias: (value: number) => {
        if (!value || value <= 0) return 'Los días de incapacidad deben ser mayor a 0';
        return null;
      }
    }
  },
  'ausencia': {
    requiredFields: ['dias', 'fecha_inicio', 'fecha_fin'],
    forbiddenFields: ['horas'],
    validations: {
      dias: (value: number) => {
        if (!value || value <= 0) return 'Los días de ausencia deben ser mayor a 0';
        return null;
      }
    }
  },
  'licencia_remunerada': {
    requiredFields: ['dias', 'fecha_inicio', 'fecha_fin'],
    forbiddenFields: ['horas'],
    validations: {
      dias: (value: number) => {
        if (!value || value <= 0) return 'Los días de licencia deben ser mayor a 0';
        return null;
      }
    }
  },
  'licencia_no_remunerada': {
    requiredFields: ['dias', 'fecha_inicio', 'fecha_fin'],
    forbiddenFields: ['horas'],
    validations: {
      dias: (value: number) => {
        if (!value || value <= 0) return 'Los días de licencia deben ser mayor a 0';
        return null;
      }
    }
  }
};

// Template for CSV download
export const NOVELTY_IMPORT_TEMPLATE_HEADERS = [
  'identificacion_empleado',
  'tipo_novedad', 
  'valor',
  'subtipo',
  'fecha_inicio',
  'fecha_fin', 
  'dias',
  'horas',
  'observacion',
  'constitutivo_salario'
];

// Sample data for template
export const NOVELTY_IMPORT_TEMPLATE_SAMPLE_DATA = [
  [
    '1234567890',
    'horas_extra',
    '50000',
    'diurnas',
    '2024-01-01',
    '2024-01-01',
    '',
    '8',
    'Horas extra por proyecto urgente',
    'true'
  ],
  [
    'juan.perez@empresa.com',
    'bonificacion',
    '100000',
    'productividad',
    '',
    '',
    '',
    '',
    'Bono por cumplimiento de metas',
    'false'
  ],
  [
    '0987654321',
    'ausencia',
    '0',
    'injustificada',
    '2024-01-15',
    '2024-01-15',
    '1',
    '',
    'Ausencia injustificada',
    'false'
  ]
];