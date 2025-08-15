
import type { Tables } from '@/integrations/supabase/types';

export type PayrollNovedad = Tables<'payroll_novedades'>;

export interface DisplayNovedad {
  id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  dias?: number;
  horas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observacion?: string;
  created_at: string;
  origen: 'novedades' | 'vacaciones';
  constitutivo_salario?: boolean;
  // Missing properties for display components
  status?: string;
  isConfirmed?: boolean;
  badgeColor?: string;
  badgeIcon?: string;
  badgeLabel?: string;
  statusColor?: string;
}

export interface SeparatedTotals {
  confirmed: {
    devengos: number;
    deducciones: number;
    neto: number;
    count: number;
  };
  estimated: {
    devengos: number;
    deducciones: number;
    neto: number;
    count: number;
  };
}

export interface VacationIntegrationResult {
  processedVacations: number;
  createdNovedades: number;
  conflicts: any[];
  success: boolean;
  message: string;
}

export interface VacationProcessingOptions {
  companyId: string;
  periodId: string;
  startDate: string;
  endDate: string;
}

export function convertNovedadToDisplay(novedad: PayrollNovedad): DisplayNovedad {
  console.log('🔍 V21.1 DIAGNOSIS - convertNovedadToDisplay input:', {
    id: novedad.id,
    valor_input: novedad.valor,
    valor_input_type: typeof novedad.valor,
    dias_input: novedad.dias,
    dias_input_type: typeof novedad.dias,
    tipo_novedad: novedad.tipo_novedad
  });

  const converted: DisplayNovedad = {
    id: novedad.id,
    empleado_id: novedad.empleado_id,
    periodo_id: novedad.periodo_id || '',
    tipo_novedad: novedad.tipo_novedad,
    subtipo: novedad.subtipo || undefined,
    valor: Number(novedad.valor) || 0,
    dias: novedad.dias ? Number(novedad.dias) : undefined,
    horas: novedad.horas ? Number(novedad.horas) : undefined,
    fecha_inicio: novedad.fecha_inicio || undefined,
    fecha_fin: novedad.fecha_fin || undefined,
    observacion: novedad.observacion || undefined,
    created_at: novedad.created_at,
    origen: 'novedades',
    constitutivo_salario: novedad.constitutivo_salario || false,
    // Set default display properties
    status: 'registrada',
    isConfirmed: true,
    badgeColor: 'bg-blue-100 text-blue-800',
    badgeIcon: '📄',
    badgeLabel: 'Novedad',
    statusColor: 'text-green-600'
  };

  console.log('🔍 V21.1 DIAGNOSIS - convertNovedadToDisplay output:', {
    id: converted.id,
    valor_output: converted.valor,
    valor_output_type: typeof converted.valor,
    dias_output: converted.dias,
    dias_output_type: typeof converted.dias,
    tipo_novedad: converted.tipo_novedad
  });

  return converted;
}
