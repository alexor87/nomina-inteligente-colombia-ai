
/**
 * Utilidad para manejar la jornada laboral legal según la Ley 2101 de 2021
 * que reduce progresivamente la jornada máxima semanal en Colombia
 * CORREGIDO: Tabla fija de horas mensuales por jornada legal
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

// ✅ TABLA FIJA DE HORAS MENSUALES POR JORNADA SEMANAL
const HORAS_MENSUALES_POR_JORNADA: Record<number, number> = {
  48: 240, // Jornada tradicional
  47: 235, // Primera reducción (2023-2024)
  46: 230, // Segunda reducción (2024-2025) ✅
  44: 220, // Tercera reducción (2025-2026) ✅
  42: 210  // Reducción final (2026+)
};

/**
 * Obtiene la información de jornada legal vigente para una fecha específica
 */
export const getJornadaLegal = (fecha: Date = new Date()): JornadaLegalInfo => {
  console.log(`📅 Calculando jornada legal para: ${fecha.toISOString().split('T')[0]}`);
  
  // Ordenar por fecha descendente para encontrar la jornada vigente
  const jornadaVigente = JORNADAS_LEGALES
    .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())
    .find(jornada => {
      const esVigente = fecha >= jornada.fechaInicio;
      console.log(`   📊 Comparando con ${jornada.fechaInicio.toISOString().split('T')[0]} (${jornada.horasSemanales}h) - Vigente: ${esVigente}`);
      return esVigente;
    });

  if (!jornadaVigente) {
    // Fallback a la jornada tradicional
    const jornadaTradicional = JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];
    const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaTradicional.horasSemanales];
    console.log(`⚠️ No se encontró jornada vigente, usando tradicional: ${jornadaTradicional.horasSemanales}h = ${horasMensuales}h mensuales`);
    
    return {
      horasSemanales: jornadaTradicional.horasSemanales,
      horasMensuales: horasMensuales,
      fechaVigencia: jornadaTradicional.fechaInicio,
      descripcion: jornadaTradicional.descripcion,
      ley: 'Código Sustantivo del Trabajo'
    };
  }

  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaVigente.horasSemanales];
  console.log(`✅ Jornada seleccionada: ${jornadaVigente.horasSemanales}h semanales = ${horasMensuales}h mensuales (tabla fija)`);

  return {
    horasSemanales: jornadaVigente.horasSemanales,
    horasMensuales: horasMensuales,
    fechaVigencia: jornadaVigente.fechaInicio,
    descripcion: jornadaVigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
};

/**
 * Calcula el divisor horario para el cálculo del valor de la hora ordinaria
 * Basado en la tabla fija de horas mensuales por jornada legal
 */
export const getHourlyDivisor = (fecha: Date = new Date()): number => {
  const jornadaInfo = getJornadaLegal(fecha);
  const divisor = jornadaInfo.horasMensuales;
  
  console.log(`📅 Fecha: ${fecha.toISOString().split('T')[0]}`);
  console.log(`⏰ Jornada legal: ${jornadaInfo.horasSemanales} horas semanales`);
  console.log(`🔢 Divisor horario: ${divisor} horas mensuales (tabla fija)`);
  
  return divisor;
};

/**
 * Calcula las horas por día basado en la jornada legal vigente
 * Esta función es específica para el cálculo de horas extra
 * Fórmula: horasSemanales ÷ 6 días
 */
export const getDailyHours = (fecha: Date = new Date()): number => {
  const jornadaInfo = getJornadaLegal(fecha);
  const horasPorDia = jornadaInfo.horasSemanales / 6;
  
  console.log(`📅 Fecha del período: ${fecha.toISOString().split('T')[0]}`);
  console.log(`⏰ Jornada legal vigente: ${jornadaInfo.horasSemanales} horas semanales`);
  console.log(`📊 Horas por día calculadas: ${horasPorDia.toFixed(3)} (${jornadaInfo.horasSemanales} ÷ 6)`);
  
  return horasPorDia;
};

/**
 * Calcula el valor de la hora ordinaria basado en el salario y la jornada legal
 * IMPORTANTE: Para horas extra usar la función calcularValorHoraExtra
 */
export const calcularValorHoraOrdinaria = (salarioMensual: number, fecha: Date = new Date()): number => {
  const divisorHorario = getHourlyDivisor(fecha);
  return salarioMensual / divisorHorario;
};

/**
 * Calcula el valor de la hora para horas extra con la fórmula correcta
 * Fórmula: (Salario ÷ 30 días) ÷ horas por día
 * Esta es la fórmula específica para horas extra según la legislación colombiana
 */
export const calcularValorHoraExtra = (salarioMensual: number, fecha: Date = new Date()): number => {
  const horasPorDia = getDailyHours(fecha);
  const valorDiario = salarioMensual / 30;
  const valorHoraExtra = valorDiario / horasPorDia;
  
  console.log(`💰 Cálculo valor hora extra:`);
  console.log(`   Salario mensual: $${salarioMensual.toLocaleString()}`);
  console.log(`   Valor diario: $${Math.round(valorDiario).toLocaleString()} (salario ÷ 30)`);
  console.log(`   Horas por día: ${horasPorDia.toFixed(3)}`);
  console.log(`   Valor hora extra: $${Math.round(valorHoraExtra).toLocaleString()} (valor diario ÷ horas por día)`);
  
  return valorHoraExtra;
};

/**
 * Obtiene información sobre próximos cambios en la jornada legal
 * ✅ CORREGIDO: Ahora usa la tabla fija de horas mensuales
 */
export const getProximoCambioJornada = (fechaActual: Date = new Date()): JornadaLegalInfo | null => {
  const proximoCambio = JORNADAS_LEGALES
    .filter(jornada => jornada.fechaInicio > fechaActual)
    .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())[0];

  if (!proximoCambio) return null;

  // ✅ CORRECCIÓN: Usar tabla fija en lugar de fórmula
  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[proximoCambio.horasSemanales];
  
  console.log(`🔮 Próximo cambio de jornada: ${proximoCambio.horasSemanales}h semanales = ${horasMensuales}h mensuales (tabla fija)`);

  return {
    horasSemanales: proximoCambio.horasSemanales,
    horasMensuales: horasMensuales,
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
