import { describe, it, expect } from 'vitest';
import {
  getRecargoDominicalVigente,
  SALARIO_MINIMO_2025,
  AUXILIO_TRANSPORTE_2025,
  LIMITE_AUXILIO_TRANSPORTE_2025,
  PORCENTAJES_NOMINA,
} from '../index';

// ─── getRecargoDominicalVigente — Ley 2466/2025 ─────────────────────────────
// Progressivo: 75% → 80% → 90% → 100%
// El incremento progresivo protege a los trabajadores dominicales y festivos

describe('getRecargoDominicalVigente — Ley 2466/2025', () => {
  describe('antes de la reforma (< 2025-07-01): 75%', () => {
    it('2024-01-01 → 75%', () => {
      expect(getRecargoDominicalVigente(new Date('2024-01-01'))).toBe(0.75);
    });

    it('2025-01-15 → 75%', () => {
      expect(getRecargoDominicalVigente(new Date('2025-01-15'))).toBe(0.75);
    });

    it('2025-06-30 → 75% (último día antes de reforma)', () => {
      expect(getRecargoDominicalVigente(new Date('2025-06-30'))).toBe(0.75);
    });
  });

  describe('primer año reforma (2025-07-01 a 2026-06-30): 80%', () => {
    it('2025-07-01 → 80% (primer día reforma)', () => {
      expect(getRecargoDominicalVigente(new Date('2025-07-01'))).toBe(0.80);
    });

    it('2026-01-15 → 80%', () => {
      expect(getRecargoDominicalVigente(new Date('2026-01-15'))).toBe(0.80);
    });

    it('2026-06-30 → 80% (último día primer año)', () => {
      expect(getRecargoDominicalVigente(new Date('2026-06-30'))).toBe(0.80);
    });
  });

  describe('segundo año reforma (2026-07-01 a 2027-06-30): 90%', () => {
    it('2026-07-01 → 90%', () => {
      expect(getRecargoDominicalVigente(new Date('2026-07-01'))).toBe(0.90);
    });

    it('2027-01-01 → 90%', () => {
      expect(getRecargoDominicalVigente(new Date('2027-01-01'))).toBe(0.90);
    });

    it('2027-06-30 → 90% (último día segundo año)', () => {
      expect(getRecargoDominicalVigente(new Date('2027-06-30'))).toBe(0.90);
    });
  });

  describe('pleno (≥ 2027-07-01): 100%', () => {
    it('2027-07-01 → 100%', () => {
      expect(getRecargoDominicalVigente(new Date('2027-07-01'))).toBe(1.00);
    });

    it('2030-01-01 → 100% (futuro lejano)', () => {
      expect(getRecargoDominicalVigente(new Date('2030-01-01'))).toBe(1.00);
    });
  });

  it('sin fecha (usa today) → retorna un valor válido en el rango [0.75, 1.00]', () => {
    const value = getRecargoDominicalVigente();
    expect(value).toBeGreaterThanOrEqual(0.75);
    expect(value).toBeLessThanOrEqual(1.00);
  });
});

// ─── Constantes salariales 2025 ─────────────────────────────────────────────
// Estos tests son smoke tests de cumplimiento legal.
// Si un decreto actualiza los valores, estos tests fallan inmediatamente
// y fuerzan actualización del código.

describe('Constantes salariales 2025 (Decreto vigente)', () => {
  it('SALARIO_MINIMO_2025 = $1,423,500', () => {
    expect(SALARIO_MINIMO_2025).toBe(1_423_500);
  });

  it('AUXILIO_TRANSPORTE_2025 = $200,000', () => {
    expect(AUXILIO_TRANSPORTE_2025).toBe(200_000);
  });

  it('LIMITE_AUXILIO_TRANSPORTE_2025 = 2 × SMMLV = $2,847,000', () => {
    expect(LIMITE_AUXILIO_TRANSPORTE_2025).toBe(SALARIO_MINIMO_2025 * 2);
    expect(LIMITE_AUXILIO_TRANSPORTE_2025).toBe(2_847_000);
  });
});

// ─── PORCENTAJES_NOMINA — Art. 204 Ley 100 / CST ────────────────────────────

describe('PORCENTAJES_NOMINA — valores legales vigentes', () => {
  describe('contribuciones del empleado', () => {
    it('SALUD_EMPLEADO = 4%', () => {
      expect(PORCENTAJES_NOMINA.SALUD_EMPLEADO).toBe(0.04);
    });

    it('PENSION_EMPLEADO = 4%', () => {
      expect(PORCENTAJES_NOMINA.PENSION_EMPLEADO).toBe(0.04);
    });

    it('deducción total mínima del empleado = 8%', () => {
      expect(PORCENTAJES_NOMINA.SALUD_EMPLEADO + PORCENTAJES_NOMINA.PENSION_EMPLEADO).toBe(0.08);
    });
  });

  describe('aportes del empleador', () => {
    it('SALUD_EMPLEADOR = 8.5%', () => {
      expect(PORCENTAJES_NOMINA.SALUD_EMPLEADOR).toBe(0.085);
    });

    it('PENSION_EMPLEADOR = 12%', () => {
      expect(PORCENTAJES_NOMINA.PENSION_EMPLEADOR).toBe(0.12);
    });

    it('CAJA_COMPENSACION = 4%', () => {
      expect(PORCENTAJES_NOMINA.CAJA_COMPENSACION).toBe(0.04);
    });

    it('ICBF = 3%', () => {
      expect(PORCENTAJES_NOMINA.ICBF).toBe(0.03);
    });

    it('SENA = 2%', () => {
      expect(PORCENTAJES_NOMINA.SENA).toBe(0.02);
    });
  });

  describe('provisiones de prestaciones sociales', () => {
    it('CESANTIAS = 8.33%', () => {
      expect(PORCENTAJES_NOMINA.CESANTIAS).toBe(0.0833);
    });

    it('PRIMA = 8.33%', () => {
      expect(PORCENTAJES_NOMINA.PRIMA).toBe(0.0833);
    });

    it('VACACIONES = 4.17%', () => {
      expect(PORCENTAJES_NOMINA.VACACIONES).toBe(0.0417);
    });

    it('cesantías e intereses son simétricas (igual porcentaje de acumulación)', () => {
      expect(PORCENTAJES_NOMINA.CESANTIAS).toBe(PORCENTAJES_NOMINA.PRIMA);
    });
  });
});
