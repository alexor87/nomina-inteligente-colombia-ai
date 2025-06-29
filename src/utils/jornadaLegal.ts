
/**
 * Utilidad para manejar la jornada laboral legal según la Ley 2101 de 2021
 * que reduce progresivamente la jornada máxima semanal en Colombia
 */

export interface JornadaLegalInfo {
  horasSemanales: number;
  horasMensuales: number;
  fechaVigencia: Date;
  descripcion: string;
  ley: string;
}

// Fechas y jornadas según la Ley 2101 de 2021
const JORNADAS_LEGALES = [
  {
    fechaInicio: new Date('2026-07-15'),
    horasSemanales: 42,
    descripcion: 'Jornada final según Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2025-07-15'),
    horasSemanales: 44,
    descripcion: 'Cuarta fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2024-07-15'),
    horasSemanales: 46,
    descripcion: 'Tercera fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('2023-07-15'),
    horasSemanales: 47,
    descripcion: 'Segunda fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaInicio: new Date('1950-01-01'), // Fecha muy anterior para jornada base
    horasSemanales: 48,
    descripcion: 'Jornada máxima tradicional - Código Sustantivo del Trabajo'
  }
];

/**
 * Obtiene la información de jornada legal vigente para una fecha específica
 */
export const getJornadaLegal = (fecha: Date = new Date()): JornadaLegalInfo => {
  // Ordenar por fecha descendente para encontrar la jornada vigente
  const jornadaVigente = JORNADAS_LEGALES
    .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())
    .find(jornada => fecha >= jornada.fechaInicio);

  if (!jornadaVigente) {
    // Fallback a la jornada tradicional
    const jornadaTradicional = JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];
    return {
      horasSemanales: jornadaTradicional.horasSemanales,
      horasMensuales: (jornadaTradicional.horasSemanales * 52) / 12,
      fechaVigencia: jornadaTradicional.fechaInicio,
      descripcion: jornadaTradicional.descripcion,
      ley: 'Código Sustantivo del Trabajo'
    };
  }

  return {
    horasSemanales: jornadaVigente.horasSemanales,
    horasMensuales: (jornadaVigente.horasSemanales * 52) / 12, // Conversión a horas mensuales
    fechaVigencia: jornadaVigente.fechaInicio,
    descripcion: jornadaVigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
};

/**
 * Calcula el divisor horario para el cálculo del valor de la hora ordinaria
 * Basado en la jornada legal vigente para la fecha especificada
 */
export const getHourlyDivisor = (fecha: Date = new Date()): number => {
  const jornadaInfo = getJornadaLegal(fecha);
  return Math.round(jornadaInfo.horasMensuales);
};

/**
 * Calcula el valor de la hora ordinaria basado en el salario y la jornada legal
 */
export const calcularValorHoraOrdinaria = (salarioMensual: number, fecha: Date = new Date()): number => {
  const divisorHorario = getHourlyDivisor(fecha);
  return salarioMensual / divisorHorario;
};

/**
 * Obtiene información sobre próximos cambios en la jornada legal
 */
export const getProximoCambioJornada = (fechaActual: Date = new Date()): JornadaLegalInfo | null => {
  const proximoCambio = JORNADAS_LEGALES
    .filter(jornada => jornada.fechaInicio > fechaActual)
    .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())[0];

  if (!proximoCambio) return null;

  return {
    horasSemanales: proximoCambio.horasSemanales,
    horasMensuales: (proximoCambio.horasSemanales * 52) / 12,
    fechaVigencia: proximoCambio.fechaInicio,
    descripcion: proximoCambio.descripcion,
    ley: 'Ley 2101 de 2021'
  };
};

/**
 * Verifica si una fecha está en un período de transición de jornada
 */
export const esPeriodoTransicion = (fecha: Date): boolean => {
  const fechaString = fecha.toISOString().slice(0, 10);
  const fechasTransicion = [
    '2023-07-15',
    '2024-07-15', 
    '2025-07-15',
    '2026-07-15'
  ];
  
  return fechasTransicion.some(fechaTransicion => {
    const inicio = new Date(fechaTransicion);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 1); // Un mes después del cambio
    
    return fecha >= inicio && fecha <= fin;
  });
};

/**
 * Obtiene el tooltip informativo sobre la jornada legal utilizada
 */
export const getJornadaTooltip = (fecha: Date = new Date()): string => {
  const jornadaInfo = getJornadaLegal(fecha);
  return `Esta liquidación usa una jornada legal de ${jornadaInfo.horasSemanales} horas semanales según la ${jornadaInfo.ley}.`;
};
