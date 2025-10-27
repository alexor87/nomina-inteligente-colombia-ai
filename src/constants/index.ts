
// Constantes de la aplicación colombiana - ACTUALIZADAS 2025
export const SALARIO_MINIMO_2025 = 1423500;
export const AUXILIO_TRANSPORTE_2025 = 200000;
export const SALARIO_MINIMO_2024 = 1300000;
export const AUXILIO_TRANSPORTE_2024 = 162000;

// ✅ LÍMITE AUXILIO DE TRANSPORTE / CONECTIVIDAD 2025: 2 SMMLV
export const LIMITE_AUXILIO_TRANSPORTE_2025 = SALARIO_MINIMO_2025 * 2; // $2,847,000

export const PORCENTAJES_NOMINA = {
  SALUD_EMPLEADO: 0.04, // 4%
  PENSION_EMPLEADO: 0.04, // 4%
  SALUD_EMPLEADOR: 0.085, // 8.5%
  PENSION_EMPLEADOR: 0.12, // 12%
  ARL: 0.00522, // Promedio 0.522%
  CAJA_COMPENSACION: 0.04, // 4%
  ICBF: 0.03, // 3%
  SENA: 0.02, // 2%
  CESANTIAS: 0.0833, // 8.33%
  INTERESES_CESANTIAS: 0.12, // 12% anual
  PRIMA: 0.0833, // 8.33%
  VACACIONES: 0.0417, // 4.17%
};

// ⚠️ HISTÓRICO: Constantes informativas (los cálculos reales están en el backend)
export const RECARGOS = {
  NOCTURNO: 0.35, // 35% - Art. 168 CST (vigente)
  EXTRA_DIURNA: 0.25, // 25% - Art. 168 CST (vigente)
  EXTRA_NOCTURNA: 0.75, // 75% - Art. 168 CST (vigente)
  
  // ⚠️ HISTÓRICO: Valores antes de Ley 2466/2025
  // Desde 1 julio 2025: 80% (progresivo hasta 100% en 2027)
  // Ver backend: getRecargoDominicalFestivo() para valor vigente
  DOMINICAL: 0.75, // Histórico (antes 1 julio 2025)
  FESTIVO: 0.75,   // Histórico (antes 1 julio 2025)
};

// ✅ NUEVO: Función para obtener recargo dominical vigente según Ley 2466/2025
export const getRecargoDominicalVigente = (fecha: Date = new Date()): number => {
  if (fecha < new Date('2025-07-01')) return 0.75; // 75% antes de reforma
  if (fecha < new Date('2026-07-01')) return 0.80; // 80% 1er año
  if (fecha < new Date('2027-07-01')) return 0.90; // 90% 2do año
  return 1.00; // 100% desde 2027
};

export const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Término Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
];

// ✅ NUEVO: Constantes para Fondo de Solidaridad Pensional 2025
export const FONDO_SOLIDARIDAD_PENSIONAL_2025 = {
  SMMLV_BASE: 1423500,
  RANGOS: [
    { minSMMLV: 4, maxSMMLV: 16, percentage: 0.01 },   // 1.0%
    { minSMMLV: 16, maxSMMLV: 17, percentage: 0.012 }, // 1.2%
    { minSMMLV: 17, maxSMMLV: 18, percentage: 0.014 }, // 1.4%
    { minSMMLV: 18, maxSMMLV: 19, percentage: 0.016 }, // 1.6%
    { minSMMLV: 19, maxSMMLV: 20, percentage: 0.018 }, // 1.8%
    { minSMMLV: 20, maxSMMLV: 999, percentage: 0.02 }  // 2.0%
  ]
};

// ✅ NUEVO: Constantes para Contribuciones Solidarias 2025
export const CONTRIBUCIONES_SOLIDARIAS_2025 = {
  CONTRIBUCION_SOLIDARIA_ADICIONAL: {
    minSMMLV: 16,
    percentage: 0.01 // 1%
  },
  FONDO_SUBSISTENCIA: {
    minSMMLV: 20,
    percentage: 0.01 // 1%
  }
};

// ✅ NUEVO: Constantes para Retención en la Fuente 2025
export const RETENCION_FUENTE_2025 = {
  UVT: 49799,
  TABLA_RETENCION: [
    { minUVT: 0, maxUVT: 95, percentage: 0, baseUVT: 0 },
    { minUVT: 95, maxUVT: 150, percentage: 0.19, baseUVT: 95 },
    { minUVT: 150, maxUVT: 360, percentage: 0.28, baseUVT: 150 },
    { minUVT: 360, maxUVT: 640, percentage: 0.33, baseUVT: 360 },
    { minUVT: 640, maxUVT: 945, percentage: 0.35, baseUVT: 640 },
    { minUVT: 945, maxUVT: 2300, percentage: 0.37, baseUVT: 945 },
    { minUVT: 2300, maxUVT: 999999, percentage: 0.39, baseUVT: 2300 }
  ]
};

export const PLANES_SAAS = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 15000,
    empleados: 10,
    caracteristicas: ['Nómina básica', 'Reportes simples', 'Soporte email']
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 35000,
    empleados: 50,
    caracteristicas: ['Nómina completa', 'Reportes avanzados', 'Soporte prioritario', 'API access']
  },
  {
    id: 'empresarial',
    nombre: 'Empresarial',
    precio: 75000,
    empleados: -1, // Ilimitado
    caracteristicas: ['Todo incluido', 'Personalización', 'Soporte 24/7', 'Integrations']
  }
];
