
export interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: 'vacaciones' | 'licencia' | 'incapacidad' | 'ausencia' | 'horas_extra' | 'bonificacion' | 'descuento' | 'otro';
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  valor: number;
  observacion?: string;
  adjunto_url?: string;
  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: PayrollNovedad['tipo_novedad'];
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  valor?: number;
  observacion?: string;
  adjunto_url?: string;
}

export interface NovedadFormData {
  tipo_novedad: PayrollNovedad['tipo_novedad'];
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  valor?: number;
  observacion?: string;
}

export const NOVEDAD_TYPES = {
  vacaciones: 'Vacaciones',
  licencia: 'Licencia',
  incapacidad: 'Incapacidad',
  ausencia: 'Ausencia',
  horas_extra: 'Horas extra',
  bonificacion: 'Bonificación',
  descuento: 'Descuento',
  otro: 'Otro'
} as const;
