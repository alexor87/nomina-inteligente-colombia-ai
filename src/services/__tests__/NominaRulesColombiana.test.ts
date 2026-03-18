/**
 * Tests de las reglas de nómina colombiana — Especificación matemática
 *
 * Estos tests verifican que los cálculos producen resultados correctos
 * según el Código Sustantivo del Trabajo (CST) y la Ley 100 de 1993.
 * Son la "fuente de verdad" matemática: si una refactorización cambia
 * estos resultados, la refactorización tiene un error legal.
 */
import { describe, it, expect } from 'vitest';
import { DeductionCalculationService } from '../DeductionCalculationService';

const SMMLV = 1_423_500;
const AUXILIO = 200_000;

// ─── Regla IBC — Base de cotización (Art. 18 Ley 100) ───────────────────────

describe('Regla IBC — Base de Ingreso para Cotizaciones', () => {
  describe('Deducción empleado: 8% mínimo sobre IBC', () => {
    it('empleado SMMLV: deducciones = 8% del SMMLV', () => {
      const result = DeductionCalculationService.calculateDeductions(SMMLV);
      const expected = Math.round(SMMLV * 0.08);
      expect(result.saludEmpleado + result.pensionEmpleado).toBe(expected);
    });

    it('empleado 2×SMMLV: deducciones = 8% de 2×SMMLV', () => {
      const salary = SMMLV * 2;
      const result = DeductionCalculationService.calculateDeductions(salary);
      expect(result.saludEmpleado + result.pensionEmpleado).toBe(Math.round(salary * 0.08));
    });

    it('empleado 5×SMMLV: deducciones = 8% de 5×SMMLV', () => {
      const salary = SMMLV * 5;
      const result = DeductionCalculationService.calculateDeductions(salary);
      expect(result.saludEmpleado + result.pensionEmpleado).toBe(Math.round(salary * 0.08));
    });
  });

  describe('Invariante: totalDeducciones = suma de componentes', () => {
    it('salario mínimo', () => {
      const r = DeductionCalculationService.calculateDeductions({
        salarioBase: SMMLV,
        totalDevengado: SMMLV + AUXILIO,
        auxilioTransporte: AUXILIO,
        periodType: 'mensual',
      });
      expect(r.totalDeducciones).toBe(
        r.saludEmpleado + r.pensionEmpleado + r.fondoSolidaridad + r.retencionFuente
      );
    });

    it('salario alto con fondo solidaridad', () => {
      const salary = SMMLV * 5;
      const r = DeductionCalculationService.calculateDeductions({
        salarioBase: salary,
        totalDevengado: salary,
        auxilioTransporte: 0,
        periodType: 'mensual',
      });
      expect(r.totalDeducciones).toBe(
        r.saludEmpleado + r.pensionEmpleado + r.fondoSolidaridad + r.retencionFuente
      );
    });
  });
});

// ─── Aportes patronales — 5 niveles de ARL ──────────────────────────────────

describe('Aportes patronales — Niveles de ARL (Decreto 1072/2015)', () => {
  const ibc = 3_000_000;

  it('ARL Nivel I (0.348%): valor correcto', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc, 'I');
    expect(r.arl).toBe(Math.round(ibc * 0.00348));
  });

  it('ARL Nivel II (0.435%): valor correcto', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc, 'II');
    expect(r.arl).toBe(Math.round(ibc * 0.00435));
  });

  it('ARL Nivel III (0.783%): valor correcto', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc, 'III');
    expect(r.arl).toBe(Math.round(ibc * 0.00783));
  });

  it('ARL Nivel IV (1.740%): valor correcto', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc, 'IV');
    expect(r.arl).toBe(Math.round(ibc * 0.0174));
  });

  it('ARL Nivel V (3.219%): valor correcto', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc, 'V');
    expect(r.arl).toBe(Math.round(ibc * 0.03219));
  });

  it('ARL V > ARL IV > ARL III > ARL II > ARL I (orden por riesgo)', () => {
    const levels = ['I', 'II', 'III', 'IV', 'V'] as const;
    const arls = levels.map(l =>
      DeductionCalculationService.calculateEmployerContributions(ibc, l).arl
    );
    for (let i = 1; i < arls.length; i++) {
      expect(arls[i]).toBeGreaterThan(arls[i - 1]);
    }
  });

  it('carga total patronal ≈ 29.5% del IBC (± 2%)', () => {
    const r = DeductionCalculationService.calculateEmployerContributions(ibc);
    const percentage = r.total / ibc;
    expect(percentage).toBeGreaterThan(0.27);
    expect(percentage).toBeLessThan(0.32);
  });
});

// ─── Auxilio de transporte — Umbral 2 SMMLV (Art. 7 Ley 1 de 1963) ─────────

describe('Auxilio de transporte — Umbral exacto 2×SMMLV', () => {
  it('salario = SMMLV → recibe auxilio', () => {
    expect(DeductionCalculationService.calculateTransportAllowance(SMMLV)).toBe(AUXILIO);
  });

  it('salario = 2×SMMLV exacto → recibe auxilio (límite inclusive)', () => {
    expect(DeductionCalculationService.calculateTransportAllowance(SMMLV * 2)).toBe(AUXILIO);
  });

  it('salario = 2×SMMLV + $1 → NO recibe auxilio', () => {
    expect(DeductionCalculationService.calculateTransportAllowance(SMMLV * 2 + 1)).toBe(0);
  });

  it('salario = $1,000,000 (< SMMLV) → recibe auxilio', () => {
    expect(DeductionCalculationService.calculateTransportAllowance(1_000_000)).toBe(AUXILIO);
  });

  it('salario = $10,000,000 → NO recibe auxilio', () => {
    expect(DeductionCalculationService.calculateTransportAllowance(10_000_000)).toBe(0);
  });
});

// ─── Provisiones sociales — Proporcionalidad por días ───────────────────────

describe('Provisiones sociales — Proporcionalidad (Art. 249 / 306 CST)', () => {
  describe('Mes completo (30 días): porcentajes estándar', () => {
    it('cesantías = 8.33% del salario mensual', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 30);
      expect(r.cesantias).toBe(Math.round(SMMLV * 0.0833));
    });

    it('prima = 8.33% del salario mensual', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 30);
      expect(r.prima).toBe(Math.round(SMMLV * 0.0833));
    });

    it('vacaciones = 4.17% del salario mensual', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 30);
      expect(r.vacaciones).toBe(Math.round(SMMLV * 0.0417));
    });

    it('cesantías = prima (misma base de acumulación)', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV * 3, 30);
      expect(r.cesantias).toBe(r.prima);
    });
  });

  describe('Quincenal (15 días): mitad exacta', () => {
    it('cesantías quincenales = mitad de cesantías mensuales', () => {
      const mensual = DeductionCalculationService.calculateProvisions(SMMLV, 30);
      const quincenal = DeductionCalculationService.calculateProvisions(SMMLV, 15);
      // Proporcional: 15/30 = 50% del salario base para cálculo
      const salarioProporcional = (SMMLV / 30) * 15;
      expect(quincenal.cesantias).toBe(Math.round(salarioProporcional * 0.0833));
    });

    it('vacaciones quincenales = proporcional a 15 días', () => {
      const salarioProporcional = (SMMLV / 30) * 15;
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 15);
      expect(r.vacaciones).toBe(Math.round(salarioProporcional * 0.0417));
    });
  });

  describe('Semanal (7 días): proporcional a 7/30', () => {
    it('provisiones semanales = (salario/30)*7 × porcentaje', () => {
      const salarioProporcional = (SMMLV / 30) * 7;
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 7);
      expect(r.cesantias).toBe(Math.round(salarioProporcional * 0.0833));
    });
  });

  describe('total = suma de componentes', () => {
    it('total provisiones = cesantías + intereses + prima + vacaciones', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV * 2, 30);
      expect(r.total).toBe(
        r.cesantias + r.interesesCesantias + r.prima + r.vacaciones
      );
    });
  });

  describe('casos límite', () => {
    it('0 días → todas las provisiones = 0', () => {
      const r = DeductionCalculationService.calculateProvisions(SMMLV, 0);
      expect(r.cesantias).toBe(0);
      expect(r.prima).toBe(0);
      expect(r.vacaciones).toBe(0);
    });

    it('salario 0 → todas las provisiones = 0', () => {
      const r = DeductionCalculationService.calculateProvisions(0, 30);
      expect(r.cesantias).toBe(0);
      expect(r.prima).toBe(0);
      expect(r.vacaciones).toBe(0);
    });
  });
});

// ─── Fondo de Solidaridad Pensional — Umbral 4 SMMLV ────────────────────────

describe('Fondo de Solidaridad Pensional — Umbrales (Ley 100 Art. 27)', () => {
  it('3.9×SMMLV → no aplica fondo solidaridad', () => {
    const r = DeductionCalculationService.calculateDeductions({
      salarioBase: Math.round(SMMLV * 3.9),
      totalDevengado: Math.round(SMMLV * 3.9),
      auxilioTransporte: 0,
      periodType: 'mensual',
    });
    expect(r.fondoSolidaridad).toBe(0);
  });

  it('4×SMMLV exacto → aplica 1% de fondo solidaridad', () => {
    const salary = SMMLV * 4;
    const r = DeductionCalculationService.calculateDeductions({
      salarioBase: salary,
      totalDevengado: salary,
      auxilioTransporte: 0,
      periodType: 'mensual',
    });
    expect(r.fondoSolidaridad).toBe(Math.round(salary * 0.01));
  });

  it('5×SMMLV → aplica 1% fondo solidaridad', () => {
    const salary = SMMLV * 5;
    const r = DeductionCalculationService.calculateDeductions({
      salarioBase: salary,
      totalDevengado: salary,
      auxilioTransporte: 0,
      periodType: 'mensual',
    });
    expect(r.fondoSolidaridad).toBe(Math.round(salary * 0.01));
    expect(r.fondoSolidaridad).toBeGreaterThan(0);
  });
});
