
import { NovedadType } from './novedades-enhanced';
import { VacationAbsenceType } from './vacations';

// ✅ Tipo unificado para mostrar tanto novedades como ausencias
export interface DisplayNovedad {
  id: string;
  empleado_id?: string;
  periodo_id?: string;
  tipo_novedad: NovedadType | VacationAbsenceType;
  valor: number;
  dias?: number;
  horas?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  
  // Metadatos de origen y estado
  origen: 'novedades' | 'vacaciones';
  status: 'pendiente' | 'liquidada' | 'cancelada';
  processed_in_period_id?: string;
  
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

// ✅ Configuración de mapeo visual
export const VACATION_VISUAL_CONFIG: Record<VacationAbsenceType, {
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

export const NOVEDAD_VISUAL_CONFIG = {
  badge: { icon: '📋', label: 'Novedad', color: 'bg-blue-100 text-blue-800' }
};

// ✅ Helpers para conversión y cálculo
export const convertVacationToDisplay = (
  vacation: any, 
  employeeSalary: number
): DisplayNovedad => {
  const config = VACATION_VISUAL_CONFIG[vacation.type as VacationAbsenceType];
  const valor = config.calculation(employeeSalary, vacation.days_count);
  
  return {
    id: vacation.id,
    empleado_id: vacation.employee_id,
    periodo_id: vacation.processed_in_period_id,
    tipo_novedad: vacation.type,
    valor: Math.round(valor),
    dias: vacation.days_count,
    observacion: vacation.observations,
    fecha_inicio: vacation.start_date,
    fecha_fin: vacation.end_date,
    
    origen: 'vacaciones',
    status: vacation.status,
    processed_in_period_id: vacation.processed_in_period_id,
    
    canEdit: false, // Vacaciones se editan en su módulo
    canDelete: vacation.status === 'pendiente',
    badgeColor: config.badge.color,
    badgeIcon: config.badge.icon,
    badgeLabel: config.badge.label,
    statusColor: getStatusColor(vacation.status),
    
    created_at: vacation.created_at,
    updated_at: vacation.updated_at
  };
};

export const convertNovedadToDisplay = (novedad: any): DisplayNovedad => {
  return {
    id: novedad.id,
    empleado_id: novedad.empleado_id,
    periodo_id: novedad.periodo_id,
    tipo_novedad: novedad.tipo_novedad,
    valor: novedad.valor || 0,
    dias: novedad.dias,
    horas: novedad.horas,
    observacion: novedad.observacion,
    fecha_inicio: novedad.fecha_inicio,
    fecha_fin: novedad.fecha_fin,
    
    origen: 'novedades',
    status: 'liquidada', // Las novedades ya están en proceso
    
    canEdit: true,
    canDelete: true,
    badgeColor: NOVEDAD_VISUAL_CONFIG.badge.color,
    badgeIcon: NOVEDAD_VISUAL_CONFIG.badge.icon,
    badgeLabel: NOVEDAD_VISUAL_CONFIG.badge.label,
    statusColor: 'bg-green-100 text-green-800',
    
    created_at: novedad.created_at,
    updated_at: novedad.updated_at
  };
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pendiente': return 'bg-yellow-100 text-yellow-800';
    case 'liquidada': return 'bg-green-100 text-green-800';
    case 'cancelada': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

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
