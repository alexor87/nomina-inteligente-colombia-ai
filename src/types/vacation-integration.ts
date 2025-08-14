import { NovedadType } from './novedades-enhanced';
import { VacationAbsenceType } from './vacations';

// ✅ Tipo unificado para mostrar tanto novedades como ausencias
export interface DisplayNovedad {
  id: string;
  empleado_id?: string;
  periodo_id?: string;
  tipo_novedad: NovedadType | VacationAbsenceType;
  subtipo?: string;
  valor: number;
  dias?: number;
  horas?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  
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
  // Estados de vacaciones
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

// ✅ CORREGIDO: Configuración de mapeo visual con cálculo correcto de incapacidades
export const VACATION_VISUAL_CONFIG: Record<VacationAbsenceType, {
  badge: { icon: string; label: string; color: string };
  calculation: (salarioBase: number, dias: number, subtipo?: string) => number;
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
    calculation: (salarioBase, dias, subtipo = 'general') => {
      // ✅ LÓGICA CORREGIDA: Implementar cálculo completo según normativa colombiana
      console.log('💡 Calculating incapacity with correct logic:', { salarioBase, dias, subtipo });
      
      // Configuraciones según tipo de incapacidad
      const incapacityConfig = {
        general: {
          waitingDays: 3,
          percentage: 0.6667,
          useMinimumWage: true
        },
        laboral: {
          waitingDays: 0,
          percentage: 1.0,
          useMinimumWage: false
        }
      };
      
      const config = incapacityConfig[subtipo as 'general' | 'laboral'] || incapacityConfig.general;
      
      // Calcular días pagados (después del período de carencia)
      const payableDays = Math.max(0, dias - config.waitingDays);
      
      if (payableDays <= 0) {
        console.log('⚠️ No payable days after waiting period');
        return 0;
      }
      
      // Calcular salario diario base
      let dailySalary = salarioBase / 30;
      
      // Para incapacidades generales, aplicar SMLDV como tope mínimo
      if (config.useMinimumWage) {
        const SMLDV_2025 = 43333; // $1,300,000 / 30 días
        dailySalary = Math.max(dailySalary, SMLDV_2025);
        console.log('💰 Applied SMLDV minimum:', { originalDaily: salarioBase / 30, adjustedDaily: dailySalary });
      }
      
      // Calcular valor final
      const totalValue = dailySalary * payableDays * config.percentage;
      
      console.log('✅ Incapacity calculation result:', {
        type: subtipo,
        totalDays: dias,
        waitingDays: config.waitingDays,
        payableDays,
        dailySalary,
        percentage: config.percentage,
        totalValue: Math.round(totalValue)
      });
      
      return Math.round(totalValue);
    },
    isDeduction: false
  },
  ausencia: {
    badge: { icon: '❌', label: 'Ausencia', color: 'bg-red-100 text-red-800' },
    calculation: (salarioBase, dias) => -((salarioBase / 30) * dias),
    isDeduction: true
  }
};

export const NOVEDAD_VISUAL_CONFIG = {
  badge: { icon: '📋', label: 'Novedad', color: 'bg-blue-100 text-blue-800' }
};

// ✅ ACTUALIZADO: Convertir ausencias con cálculo correcto para incapacidades
export const convertVacationToDisplay = (
  vacation: any, 
  employeeSalary: number,
  periodStartDate?: string,
  periodEndDate?: string
): DisplayNovedad => {
  const config = VACATION_VISUAL_CONFIG[vacation.type as VacationAbsenceType];
  
  // ✅ LÓGICA MEJORADA: Calcular días proporcionales al período
  let displayDays = vacation.days_count;
  let isFragmented = false;
  
  if (periodStartDate && periodEndDate) {
    displayDays = calculatePeriodIntersectionDays(
      vacation.start_date,
      vacation.end_date,
      periodStartDate,
      periodEndDate
    );
    isFragmented = displayDays < vacation.days_count;
    
    console.log('🔄 Fragmentación aplicada:', {
      originalDays: vacation.days_count,
      periodDays: displayDays,
      isFragmented,
      vacationPeriod: `${vacation.start_date} - ${vacation.end_date}`,
      payrollPeriod: `${periodStartDate} - ${periodEndDate}`
    });
  }
  
  // ✅ CORREGIDO: Pasar subtipo para cálculo correcto de incapacidades
  const valor = config.calculation(employeeSalary, displayDays, vacation.subtipo);
  
  // ✅ Determinar estado unificado
  const unifiedStatus = vacation.status === 'liquidada' ? 'procesada' : vacation.status;
  const statusConfig = UNIFIED_STATUS_MAPPING[unifiedStatus] || UNIFIED_STATUS_MAPPING['pendiente'];
  
  return {
    id: vacation.id,
    empleado_id: vacation.employee_id,
    periodo_id: vacation.processed_in_period_id,
    tipo_novedad: vacation.type,
    valor: Math.round(valor),
    dias: displayDays,
    observacion: vacation.observations,
    fecha_inicio: vacation.start_date,
    fecha_fin: vacation.end_date,
    
    origen: 'vacaciones',
    status: unifiedStatus,
    processed_in_period_id: vacation.processed_in_period_id,
    
    // ✅ NUEVO: Estado confirmado basado en el status
    isConfirmed: statusConfig.isConfirmed,
    
    // ✅ NUEVO: Información de fragmentación
    isFragmented,
    originalDays: vacation.days_count,
    periodDays: displayDays,
    
    canEdit: false,
    canDelete: vacation.status === 'pendiente',
    badgeColor: config.badge.color,
    badgeIcon: config.badge.icon,
    badgeLabel: isFragmented 
      ? `${config.badge.label} (${displayDays}/${vacation.days_count} días)`
      : config.badge.label,
    statusColor: statusConfig.color,
    
    created_at: vacation.created_at,
    updated_at: vacation.updated_at
  };
};

// ✅ NUEVA FUNCIÓN: Calcular intersección de días (centralizada)
function calculatePeriodIntersectionDays(
  vacationStart: string,
  vacationEnd: string,
  periodStart: string,
  periodEnd: string
): number {
  const vacStartDate = new Date(vacationStart);
  const vacEndDate = new Date(vacationEnd);
  const perStartDate = new Date(periodStart);
  const perEndDate = new Date(periodEnd);

  const intersectionStart = new Date(Math.max(vacStartDate.getTime(), perStartDate.getTime()));
  const intersectionEnd = new Date(Math.min(vacEndDate.getTime(), perEndDate.getTime()));

  if (intersectionStart > intersectionEnd) {
    return 0;
  }

  const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

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
export interface VacationIntegrationResult {
  processedVacations: number;
  createdNovedades: number;
  conflicts: any[];
  success: boolean;
  message: string;
}

export interface VacationProcessingOptions {
  periodId: string;
  companyId: string;
  startDate: string;
  endDate: string;
  forceProcess?: boolean;
}
