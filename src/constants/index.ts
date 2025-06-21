
// Constantes de la aplicación colombiana
export const SALARIO_MINIMO_2024 = 1300000;
export const AUXILIO_TRANSPORTE_2024 = 162000;

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

export const RECARGOS = {
  NOCTURNO: 0.35, // 35%
  EXTRA_DIURNA: 0.25, // 25%
  EXTRA_NOCTURNA: 0.75, // 75%
  DOMINICAL: 0.75, // 75%
  FESTIVO: 0.75, // 75%
};

export const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Término Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
];

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
