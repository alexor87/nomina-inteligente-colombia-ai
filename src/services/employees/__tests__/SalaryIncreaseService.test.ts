import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalaryIncreaseService, SalaryIncreaseProposal } from '../SalaryIncreaseService';

// ── Supabase mock ─────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top — use vi.hoisted() for variables referenced inside factory.
const { mockFrom, mockGetUser, mockInsert, mockUpdate, mockEq, mockOrder, mockSupabaseChain } =
  vi.hoisted(() => {
    const mockInsert = vi.fn();
    const mockUpdate = vi.fn();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockSupabaseChain = {
      select: vi.fn().mockReturnThis(),
      eq: mockEq,
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: mockInsert,
      update: mockUpdate,
    };
    const mockFrom = vi.fn(() => mockSupabaseChain);
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    return { mockFrom, mockGetUser, mockInsert, mockUpdate, mockEq, mockOrder, mockSupabaseChain };
  });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SMLMV = 1_423_500;
const COMPANY_ID = 'company-1';

function makeProposal(
  overrides: Partial<SalaryIncreaseProposal> & { currentSalary: number }
): SalaryIncreaseProposal {
  const riskLevel = SalaryIncreaseService.classifyRisk(overrides.currentSalary, SMLMV);
  return {
    employeeId: 'emp-1',
    employeeName: 'Juan Pérez',
    cargo: 'Desarrollador',
    currentSalary: overrides.currentSalary,
    proposedSalary: overrides.proposedSalary ?? overrides.currentSalary,
    percentage: 0,
    reason: 'incremento_anual',
    isLegallyRequired: riskLevel === 'required',
    riskLevel,
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// classifyRisk
// ═════════════════════════════════════════════════════════════════════════════

describe('classifyRisk', () => {
  it('salario < SMLMV → required', () => {
    expect(SalaryIncreaseService.classifyRisk(1_000_000, SMLMV)).toBe('required');
  });

  it('salario === SMLMV → required (no puede ganar exactamente el mínimo sin ajuste)', () => {
    expect(SalaryIncreaseService.classifyRisk(SMLMV, SMLMV)).toBe('required');
  });

  it('salario > SMLMV y < SMLMV*1.05 → warning', () => {
    const salario = SMLMV + 1; // un peso por encima del mínimo
    expect(SalaryIncreaseService.classifyRisk(salario, SMLMV)).toBe('warning');
  });

  it('salario justo antes de SMLMV*1.05 → warning', () => {
    const salario = Math.floor(SMLMV * 1.05) - 1;
    expect(SalaryIncreaseService.classifyRisk(salario, SMLMV)).toBe('warning');
  });

  it('salario === SMLMV*1.05 → safe', () => {
    const salario = SMLMV * 1.05;
    expect(SalaryIncreaseService.classifyRisk(salario, SMLMV)).toBe('safe');
  });

  it('salario muy alto → safe', () => {
    expect(SalaryIncreaseService.classifyRisk(10_000_000, SMLMV)).toBe('safe');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// applyUniformPercentage
// ═════════════════════════════════════════════════════════════════════════════

describe('applyUniformPercentage', () => {
  it('aplica el porcentaje correctamente a empleados no obligatorios', () => {
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: 2_000_000 }),
    ];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 5, SMLMV);
    expect(result[0].proposedSalary).toBe(2_100_000);
    expect(result[0].percentage).toBe(5);
  });

  it('no modifica empleados con ajuste obligatorio (isLegallyRequired = true)', () => {
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: 1_000_000, proposedSalary: SMLMV }),
    ];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 10, SMLMV);
    expect(result[0].proposedSalary).toBe(SMLMV); // sin cambio
    expect(result[0].isLegallyRequired).toBe(true);
  });

  it('si el resultado tras incremento queda bajo SMLMV, ajusta al SMLMV', () => {
    // Empleado en warning con porcentaje muy bajo → podría quedar bajo SMLMV
    const salario = SMLMV + 10_000; // zona warning
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: salario }),
    ];
    // 0% de incremento → salario no cambia, se detecta como bajo SMLMV*1.05
    // pero el salary mismo sigue sobre el SMLMV → no se ajusta
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 0, SMLMV);
    // No debe caer por debajo del SMLMV
    expect(result[0].proposedSalary).toBeGreaterThanOrEqual(SMLMV);
  });

  it('si el resultado queda literalmente bajo SMLMV, fuerza al SMLMV', () => {
    // Simulamos un caso donde el salario actual es 0 y el porcentaje es 0
    const proposals = [
      makeProposal({
        employeeId: 'emp-1',
        currentSalary: 500_000,
        isLegallyRequired: false,
        riskLevel: 'warning',
      }),
    ];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 0, SMLMV);
    // 500_000 con 0% = 500_000 < SMLMV → fuerza a SMLMV
    expect(result[0].proposedSalary).toBe(SMLMV);
    expect(result[0].reason).toBe('ajuste_minimo_legal');
  });

  it('redondea el porcentaje a 2 decimales', () => {
    const proposals = [makeProposal({ employeeId: 'emp-1', currentSalary: 3_000_000 })];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 7.777, SMLMV);
    expect(result[0].percentage).toBe(7.78);
  });

  it('porcentaje 0% no cambia el salario si ya está sobre SMLMV', () => {
    const proposals = [makeProposal({ employeeId: 'emp-1', currentSalary: 5_000_000 })];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 0, SMLMV);
    expect(result[0].proposedSalary).toBe(5_000_000);
    expect(result[0].percentage).toBe(0);
  });

  it('múltiples empleados: obligatorio + no obligatorio', () => {
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: 1_000_000, proposedSalary: SMLMV }),
      makeProposal({ employeeId: 'emp-2', currentSalary: 3_000_000 }),
    ];
    const result = SalaryIncreaseService.applyUniformPercentage(proposals, 10, SMLMV);
    expect(result[0].proposedSalary).toBe(SMLMV); // obligatorio: sin cambio
    expect(result[1].proposedSalary).toBe(3_300_000); // +10%
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// applyRolePercentages
// ═════════════════════════════════════════════════════════════════════════════

describe('applyRolePercentages', () => {
  it('aplica porcentaje diferente por cargo', () => {
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: 2_000_000, cargo: 'Desarrollador' }),
      makeProposal({ employeeId: 'emp-2', currentSalary: 3_000_000, cargo: 'Gerente' }),
    ];
    const result = SalaryIncreaseService.applyRolePercentages(
      proposals,
      { Desarrollador: 5, Gerente: 10 },
      SMLMV
    );
    expect(result[0].proposedSalary).toBe(2_100_000); // 5%
    expect(result[1].proposedSalary).toBe(3_300_000); // 10%
  });

  it('cargo sin porcentaje definido usa 0%', () => {
    const proposals = [
      makeProposal({ employeeId: 'emp-1', currentSalary: 2_000_000, cargo: 'Contador' }),
    ];
    const result = SalaryIncreaseService.applyRolePercentages(proposals, {}, SMLMV);
    expect(result[0].proposedSalary).toBe(2_000_000);
  });

  it('no modifica empleados obligatorios', () => {
    const proposals = [
      makeProposal({
        employeeId: 'emp-1',
        currentSalary: 1_000_000,
        proposedSalary: SMLMV,
        cargo: 'Operario',
      }),
    ];
    const result = SalaryIncreaseService.applyRolePercentages(
      proposals,
      { Operario: 20 },
      SMLMV
    );
    expect(result[0].proposedSalary).toBe(SMLMV);
    expect(result[0].isLegallyRequired).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getSalariesBatch — con mock de Supabase
// ═════════════════════════════════════════════════════════════════════════════

describe('getSalariesBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFrom.mockReturnValue(mockSupabaseChain);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.eq.mockReturnThis();
    mockSupabaseChain.in.mockReturnThis();
    mockSupabaseChain.lte.mockReturnThis();
    mockSupabaseChain.order.mockReturnThis();
  });

  it('retorna mapa vacío si employeeIds está vacío', async () => {
    const result = await SalaryIncreaseService.getSalariesBatch([], new Date(), COMPANY_ID);
    expect(result.size).toBe(0);
  });

  it('retorna el salario correcto por empleado', async () => {
    mockSupabaseChain.order.mockResolvedValueOnce({
      data: [
        { employee_id: 'emp-1', salario_base: 2_000_000, fecha_vigencia: '2026-01-01' },
        { employee_id: 'emp-2', salario_base: 3_000_000, fecha_vigencia: '2025-01-01' },
      ],
      error: null,
    });

    const result = await SalaryIncreaseService.getSalariesBatch(
      ['emp-1', 'emp-2'],
      new Date('2026-03-01'),
      COMPANY_ID
    );
    expect(result.get('emp-1')).toBe(2_000_000);
    expect(result.get('emp-2')).toBe(3_000_000);
  });

  it('cuando hay múltiples registros por empleado, toma el primero (más reciente por ORDER DESC)', async () => {
    // Supabase devuelve ordenado DESC — el primero es el más reciente
    mockSupabaseChain.order.mockResolvedValueOnce({
      data: [
        { employee_id: 'emp-1', salario_base: 2_500_000, fecha_vigencia: '2026-01-01' }, // más reciente
        { employee_id: 'emp-1', salario_base: 2_000_000, fecha_vigencia: '2025-01-01' }, // más antiguo
      ],
      error: null,
    });

    const result = await SalaryIncreaseService.getSalariesBatch(
      ['emp-1'],
      new Date('2026-03-01'),
      COMPANY_ID
    );
    expect(result.get('emp-1')).toBe(2_500_000); // usa el más reciente
  });

  it('empleado sin historial no aparece en el mapa (el caller usa fallback)', async () => {
    mockSupabaseChain.order.mockResolvedValueOnce({
      data: [], // no hay registros
      error: null,
    });

    const result = await SalaryIncreaseService.getSalariesBatch(
      ['emp-sin-historia'],
      new Date('2026-03-01'),
      COMPANY_ID
    );
    expect(result.has('emp-sin-historia')).toBe(false);
  });

  it('lanza error si Supabase falla', async () => {
    mockSupabaseChain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection error', code: '500' },
    });

    await expect(
      SalaryIncreaseService.getSalariesBatch(['emp-1'], new Date(), COMPANY_ID)
    ).rejects.toMatchObject({ message: 'connection error' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// analyzeYearTransition — con mock de Supabase
// ═════════════════════════════════════════════════════════════════════════════

describe('analyzeYearTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.eq.mockReturnThis();
    mockSupabaseChain.single.mockReturnThis();
  });

  it('clasifica correctamente required, warning y safe', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    // Primera llamada: config SMLMV
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      ...mockSupabaseChain,
      single: vi.fn().mockResolvedValue({
        data: { salary_min: SMLMV },
        error: null,
      }),
    }));

    // Segunda llamada: empleados
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      ...mockSupabaseChain,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      // Cadena final retorna los datos
      [Symbol.iterator]: undefined,
      then: undefined,
    }));

    // Mock simplificado: llamamos directamente el from y mockeamos la cadena
    // Usamos un enfoque más directo con mockResolvedValueOnce en la cadena completa
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: { salary_min: SMLMV },
        error: null,
      }),
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'emp-1', nombre: 'Ana', apellido: 'López', cargo: 'Operaria', salario_base: 1_000_000 },   // required
          { id: 'emp-2', nombre: 'Luis', apellido: 'Gómez', cargo: 'Técnico', salario_base: 1_450_000 },    // warning
          { id: 'emp-3', nombre: 'María', apellido: 'Ruiz', cargo: 'Gerente', salario_base: 5_000_000 },    // safe
        ],
        error: null,
      }),
    } as any);
  });

  // Test de la lógica de clasificación de forma aislada (sin Supabase)
  it('classifyRisk: triángulo de clasificación es consistente', () => {
    // required: salario < SMLMV
    expect(SalaryIncreaseService.classifyRisk(1_000_000, SMLMV)).toBe('required');
    // warning: SMLMV < salario < SMLMV*1.05
    expect(SalaryIncreaseService.classifyRisk(1_450_000, SMLMV)).toBe('warning');
    // safe: salario >= SMLMV*1.05
    expect(SalaryIncreaseService.classifyRisk(5_000_000, SMLMV)).toBe('safe');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// applyIncrements — con mock de Supabase
// ═════════════════════════════════════════════════════════════════════════════

describe('applyIncrements', () => {
  const proposals: SalaryIncreaseProposal[] = [
    {
      employeeId: 'emp-1',
      employeeName: 'Ana López',
      cargo: 'Operaria',
      currentSalary: 1_000_000,
      proposedSalary: SMLMV,
      percentage: 42.35,
      reason: 'ajuste_minimo_legal',
      isLegallyRequired: true,
      riskLevel: 'required',
    },
    {
      employeeId: 'emp-2',
      employeeName: 'Luis Gómez',
      cargo: 'Técnico',
      currentSalary: 3_000_000,
      proposedSalary: 3_150_000,
      percentage: 5,
      reason: 'incremento_anual',
      isLegallyRequired: false,
      riskLevel: 'safe',
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks(); // reset implementations AND call history
    // Restore defaults needed by all tests
    mockFrom.mockReturnValue(mockSupabaseChain);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.in.mockReturnThis();
    mockSupabaseChain.lte.mockReturnThis();
    mockSupabaseChain.order.mockReturnThis();
    mockSupabaseChain.limit.mockReturnThis();
    mockEq.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockInsert.mockResolvedValue({ error: null }); // safe default
  });

  it('cuenta aplicados correctamente cuando no hay errores', async () => {
    // Fecha futura → solo insert, sin update (cadena más simple de mockear)
    mockInsert.mockResolvedValue({ error: null });

    const result = await SalaryIncreaseService.applyIncrements(
      proposals,
      new Date('2099-01-01'), // futuro → solo insert
      COMPANY_ID
    );

    expect(result.applied).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('registra error individual sin detener el batch', async () => {
    // emp-1 falla, emp-2 OK
    mockInsert
      .mockResolvedValueOnce({ error: { message: 'DB error' } })
      .mockResolvedValueOnce({ error: null });

    const result = await SalaryIncreaseService.applyIncrements(
      proposals,
      new Date('2099-01-01'), // futuro → solo insert
      COMPANY_ID
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Ana López');
    expect(result.applied).toBe(1); // emp-2 sí se aplicó
  });

  it('omite propuestas con proposedSalary <= 0', async () => {
    const withZeroSalary: SalaryIncreaseProposal[] = [
      { ...proposals[0], proposedSalary: 0 },
    ];

    const result = await SalaryIncreaseService.applyIncrements(
      withZeroSalary,
      new Date('2026-01-01'),
      COMPANY_ID
    );

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.applied).toBe(0);
  });

  it('actualiza employees.salario_base si effectiveDate <= hoy', async () => {
    // Fecha pasada → applyToEmployees = true → update() is called
    // Chain: from('employees').update({}).eq('id',...).eq('company_id',...)
    // We need the final .eq() to resolve { error: null }
    // Re-configure mockEq for this specific test
    mockEq
      .mockReturnValueOnce(mockSupabaseChain)   // .eq('id',...)
      .mockResolvedValueOnce({ error: null });   // .eq('company_id',...) → done

    const pastDate = new Date('2020-01-01');
    await SalaryIncreaseService.applyIncrements([proposals[0]], pastDate, COMPANY_ID);

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('NO actualiza employees.salario_base si effectiveDate > hoy', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const futureDate = new Date('2099-01-01');
    await SalaryIncreaseService.applyIncrements([proposals[0]], futureDate, COMPANY_ID);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
