import { vi } from 'vitest';

export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
  functions: {
    invoke: vi.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    }),
  },
};

export const mockPayrollPeriod = {
  id: 'test-period-id',
  company_id: 'test-company-id',
  periodo: '2025-01',
  tipo_periodo: 'mensual',
  fecha_inicio: '2025-01-01',
  fecha_fin: '2025-01-31',
  estado: 'abierto',
  total_devengado: 5000000,
  total_deducciones: 800000,
  neto_pagado: 4200000,
};

export const mockEmployee = {
  id: 'test-employee-id',
  nombres: 'Juan',
  apellidos: 'Pérez',
  salario_base: 1423500,
  cargo: 'Desarrollador',
  total_devengado: 1423500,
  total_deducciones: 113880,
  neto_pagado: 1309620,
  ibc: 1423500,
  auxilio_transporte: 162000,
  salud_empleado: 56940,
  pension_empleado: 56940,
};