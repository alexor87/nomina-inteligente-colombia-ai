
import { NovedadType } from './novedades-enhanced';
import { AbsenceType } from './absences';

// ✅ Tipo unificado para mostrar tanto novedades como ausencias
export interface DisplayNovedad {
  id: string;
  empleado_id?: string;
  periodo_id?: string;
  tipo_novedad: NovedadType | AbsenceType;
  subtipo?: string;
  valor: number;
  valorOriginal?: number; // ✅ NUEVO: Valor original antes de cálculos normativos
  dias?: number;
  horas?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  constitutivo_salario?: boolean;

  // Metadatos de origen y estado
  origen: 'novedades' | 'vacaciones';
  status: 'pendiente' | 'procesada' | 'cancelada' | 'registrada';
  processed_in_period_id?: string;

  // ✅ NUEVO: Flag para distinguir valores confirmados vs estimados
  isConfirmed: boolean;

  // ✅ NUEVO: Soporte para fragmentación multi-período
  isFragmented?: boolean;
  originalDays?: number; // Días totales de la ausencia original
  periodDays?: number;   // Días que corresponden a este período específico

  // Permisos y visualización
  canEdit: boolean;
  canDelete: boolean;
  badgeColor: string;
  badgeIcon: string;
  badgeLabel: string;
  statusColor: string;

  created_at: string;
  updated_at: string;
}

// ✅ ACTUALIZADO: Mapeo de estados unificados
export const UNIFIED_STATUS_MAPPING = {
  // Estados de ausencias
  'pendiente': {
    display: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    isConfirmed: false
  },
  'liquidada': {
    display: 'Procesada',
    color: 'bg-green-100 text-green-800',
    isConfirmed: true
  },
  'cancelada': {
    display: 'Cancelada',
    color: 'bg-gray-100 text-gray-800',
    isConfirmed: false
  },
  // Estados de novedades (siempre confirmadas)
  'registrada': {
    display: 'Registrada',
    color: 'bg-blue-100 text-blue-800',
    isConfirmed: true
  }
};

// ✅ Configuración de mapeo visual
export const ABSENCE_VISUAL_CONFIG: Record<AbsenceType, {
  badge: { icon: string; label: string; color: string };
  calculation: (salarioBase: number, dias: number) => number;
  isDeduction: boolean;
}> = {
  vacaciones: {
    badge: { icon: '🏖️', label: 'Vacaciones', color: 'bg-blue-100 text-blue-800' },
    calculation: (salarioBase, dias) => (salarioBase / 30) * dias,
    isDeduction: false
  },
  licencia_remunerada: {
    badge: { icon: '📋', label: 'Licencia Remunerada', color: 'bg-green-100 text-green-800' },
    calculation: (salarioBase, dias) => (salarioBase / 30) * dias,
    isDeduction: false
  },
  licencia_no_remunerada: {
    badge: { icon: '⏸️', label: 'Licencia No Remunerada', color: 'bg-yellow-100 text-yellow-800' },
    calculation: () => 0,
    isDeduction: false
  },
  incapacidad: {
    badge: { icon: '🏥', label: 'Incapacidad', color: 'bg-purple-100 text-purple-800' },
    calculation: (salarioBase, dias) => {
      const diasPagados = Math.max(0, dias - 2);
      return (salarioBase / 30) * diasPagados * 0.6667;
    },
    isDeduction: false
  },
  ausencia: {
    badge: { icon: '❌', label: 'Ausencia', color: 'bg-red-100 text-red-800' },
    calculation: (salarioBase, dias) => -((salarioBase / 30) * dias),
    isDeduction: true
  }
};

// Backward compatibility alias
export const VACATION_VISUAL_CONFIG = ABSENCE_VISUAL_CONFIG;

export const NOVEDAD_VISUAL_CONFIG = {
  badge: { icon: '📋', label: 'Novedad', color: 'bg-blue-100 text-blue-800' }
};

// ✅ ACTUALIZADO: Convertir ausencias con fragmentación inteligente
export const convertAbsenceToDisplay = (
  absence: any,
  employeeSalary: number,
  periodStartDate?: string,
  periodEndDate?: string
): DisplayNovedad => {
  const config = ABSENCE_VISUAL_CONFIG[absence.type as AbsenceType];

  // ✅ LÓGICA MEJORADA: Calcular días proporcionales al período
  let displayDays = absence.days_count;
  let isFragmented = false;

  if (periodStartDate && periodEndDate) {
    displayDays = calculatePeriodIntersectionDays(
      absence.start_date,
      absence.end_date,
      periodStartDate,
      periodEndDate
    );
    isFragmented = displayDays < absence.days_count;

    console.log('🔄 Fragmentación aplicada:', {
      originalDays: absence.days_count,
      periodDays: displayDays,
      isFragmented,
      absencePeriod: `${absence.start_date} - ${absence.end_date}`,
      payrollPeriod: `${periodStartDate} - ${periodEndDate}`
    });
  }

  const valor = config.calculation(employeeSalary, displayDays);

  // ✅ Determinar estado unificado
  const unifiedStatus = absence.status === 'liquidada' ? 'procesada' : absence.status;
  const statusConfig = UNIFIED_STATUS_MAPPING[unifiedStatus] || UNIFIED_STATUS_MAPPING['pendiente'];

  return {
    id: absence.id,
    empleado_id: absence.employee_id,
    periodo_id: absence.processed_in_period_id,
    tipo_novedad: absence.type,
    valor: Math.round(valor),
    dias: displayDays,
    observacion: absence.observations,
    fecha_inicio: absence.start_date,
    fecha_fin: absence.end_date,

    origen: 'vacaciones',
    status: unifiedStatus,
    processed_in_period_id: absence.processed_in_period_id,

    // ✅ NUEVO: Estado confirmado basado en el status
    isConfirmed: statusConfig.isConfirmed,

    // ✅ NUEVO: Información de fragmentación
    isFragmented,
    originalDays: absence.days_count,
    periodDays: displayDays,

    canEdit: false,
    canDelete: absence.status === 'pendiente',
    badgeColor: config.badge.color,
    badgeIcon: config.badge.icon,
    badgeLabel: isFragmented
      ? `${config.badge.label} (${displayDays}/${absence.days_count} días)`
      : config.badge.label,
    statusColor: statusConfig.color,

    created_at: absence.created_at,
    updated_at: absence.updated_at
  };
};

// Backward compatibility alias
export const convertVacationToDisplay = convertAbsenceToDisplay;

// ✅ NUEVA FUNCIÓN: Calcular intersección de días (centralizada)
// Aplica convención 30 días/mes: quincena completa = 15 días
function calculatePeriodIntersectionDays(
  absenceStart: string,
  absenceEnd: string,
  periodStart: string,
  periodEnd: string
): number {
  const absStartDate = new Date(absenceStart);
  const absEndDate = new Date(absenceEnd);
  const perStartDate = new Date(periodStart);
  const perEndDate = new Date(periodEnd);

  const intersectionStart = new Date(Math.max(absStartDate.getTime(), perStartDate.getTime()));
  const intersectionEnd = new Date(Math.min(absEndDate.getTime(), perEndDate.getTime()));

  if (intersectionStart > intersectionEnd) {
    return 0;
  }

  const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
  let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Convención nómina colombiana (Art. 134 CST): quincena = 15 días
  const startDay = new Date(periodStart).getUTCDate();
  if (startDay === 1 || startDay === 16) {
    const intStartStr = intersectionStart.toISOString().split('T')[0];
    const intEndStr = intersectionEnd.toISOString().split('T')[0];
    if (intStartStr <= periodStart && intEndStr >= periodEnd) {
      diffDays = 15;
    } else {
      diffDays = Math.min(diffDays, 15);
    }
  }

  return Math.max(0, diffDays);
}

export const convertNovedadToDisplay = (novedad: any): DisplayNovedad => {
  const statusConfig = UNIFIED_STATUS_MAPPING['registrada'];

  return {
    id: novedad.id,
    empleado_id: novedad.empleado_id,
    periodo_id: novedad.periodo_id,
    tipo_novedad: novedad.tipo_novedad,
    subtipo: novedad.subtipo,
    valor: novedad.valor || 0,
    dias: novedad.dias,
    horas: novedad.horas,
    observacion: novedad.observacion,
    fecha_inicio: novedad.fecha_inicio,
    fecha_fin: novedad.fecha_fin,
    constitutivo_salario: novedad.constitutivo_salario,

    origen: 'novedades',
    status: 'registrada',

    // ✅ NUEVO: Las novedades siempre están confirmadas
    isConfirmed: true,

    canEdit: true,
    canDelete: true,
    badgeColor: NOVEDAD_VISUAL_CONFIG.badge.color,
    badgeIcon: NOVEDAD_VISUAL_CONFIG.badge.icon,
    badgeLabel: NOVEDAD_VISUAL_CONFIG.badge.label,
    statusColor: statusConfig.color,

    created_at: novedad.created_at,
    updated_at: novedad.updated_at
  };
};

// ✅ NUEVO: Tipos para totales separados
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

// ✅ Tipos para el servicio de integración
export interface AbsenceIntegrationResult {
  processedAbsences: number;
  createdNovedades: number;
  conflicts: any[];
  success: boolean;
  message: string;
}

// Backward compatibility alias
export type VacationIntegrationResult = AbsenceIntegrationResult;

export interface AbsenceProcessingOptions {
  periodId: string;
  companyId: string;
  startDate: string;
  endDate: string;
  forceProcess?: boolean;
}

// Backward compatibility alias
export type VacationProcessingOptions = AbsenceProcessingOptions;
