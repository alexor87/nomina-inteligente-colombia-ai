import { describe, it, expect } from 'vitest';
import { calculateBusinessDays } from '@/utils/businessDayCalculator';

/**
 * Tests para la lógica corregida de cálculo de días hábiles de vacaciones
 * cuando se dividen entre múltiples períodos quincenales.
 *
 * Bug original: se usaban días calendario en vez de días hábiles,
 * causando montos incorrectos (ej: $696,667 en vez de $950,000).
 */

// Helper: simula la lógica de intersección período/ausencia (igual que en los servicios)
function calculatePeriodIntersectionDays(
  absenceStart: string,
  absenceEnd: string,
  periodStart: string,
  periodEnd: string,
  absenceType: string,
  restDays: string[] = ['sabado', 'domingo']
): number {
  const absStartDate = new Date(absenceStart);
  const absEndDate = new Date(absenceEnd);
  const perStartDate = new Date(periodStart);
  const perEndDate = new Date(periodEnd);

  const intersectionStart = new Date(Math.max(absStartDate.getTime(), perStartDate.getTime()));
  const intersectionEnd = new Date(Math.min(absEndDate.getTime(), perEndDate.getTime()));

  if (intersectionStart > intersectionEnd) return 0;

  const intStartStr = intersectionStart.toISOString().split('T')[0];
  const intEndStr = intersectionEnd.toISOString().split('T')[0];

  if (absenceType === 'vacaciones') {
    return calculateBusinessDays(intStartStr, intEndStr, restDays);
  } else {
    const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

// Helper: calcula valor de vacaciones
function calculateVacationValue(salarioBase: number, days: number): number {
  return Math.round((salarioBase / 30) * days);
}

describe('Vacation Business Days - Multi-Period Split', () => {
  describe('Caso reportado: 15 días hábiles, Ene 5-26, 2026', () => {
    const absenceStart = '2026-01-05';
    const absenceEnd = '2026-01-26';
    const salarioBase = 1900000;

    it('quincena 1 (Ene 1-15) debe contar días hábiles, no calendario', () => {
      const days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-01', '2026-01-15',
        'vacaciones'
      );
      // Ene 5-15: hábiles = 5(lun),6(mar),7(mie),8(jue),9(vie), [10-11 fds],
      //           [12 festivo Reyes], 13(mar),14(mie),15(jue) = 8 días hábiles
      expect(days).toBe(8);
    });

    it('quincena 2 (Ene 16-31) debe contar días hábiles', () => {
      const days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-16', '2026-01-31',
        'vacaciones'
      );
      // Ene 16-26: hábiles = 16(vie),19(lun),20(mar),21(mie),22(jue),23(vie),26(lun) = 7
      expect(days).toBe(7);
    });

    it('total entre ambas quincenas debe ser 15 días hábiles', () => {
      const q1 = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-01', '2026-01-15',
        'vacaciones'
      );
      const q2 = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-16', '2026-01-31',
        'vacaciones'
      );
      expect(q1 + q2).toBe(15);
    });

    it('monto total debe ser $950,000 (salario $1,900,000 / 30 × 15)', () => {
      const q1Days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-01', '2026-01-15',
        'vacaciones'
      );
      const q2Days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-16', '2026-01-31',
        'vacaciones'
      );
      const totalValue = calculateVacationValue(salarioBase, q1Days) +
                          calculateVacationValue(salarioBase, q2Days);
      expect(totalValue).toBe(950000);
    });

    it('NO debe dar 11 días calendario (bug anterior)', () => {
      const days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-01', '2026-01-15',
        'vacaciones'
      );
      expect(days).not.toBe(11); // 11 era el bug (días calendario)
    });

    it('NO debe dar $696,667 (bug anterior)', () => {
      const days = calculatePeriodIntersectionDays(
        absenceStart, absenceEnd,
        '2026-01-01', '2026-01-15',
        'vacaciones'
      );
      const value = calculateVacationValue(salarioBase, days);
      expect(value).not.toBe(696667);
    });
  });

  describe('Incapacidades siguen usando días calendario', () => {
    it('incapacidad en quincena 1 usa días calendario', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-01-05', '2026-01-26',
        '2026-01-01', '2026-01-15',
        'incapacidad'
      );
      // Ene 5-15 = 11 días calendario (incluye fds y festivos)
      expect(days).toBe(11);
    });

    it('licencia no remunerada usa días calendario', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-01-05', '2026-01-26',
        '2026-01-01', '2026-01-15',
        'licencia_no_remunerada'
      );
      expect(days).toBe(11);
    });
  });

  describe('Días de descanso personalizados', () => {
    it('empleado que solo descansa domingo (trabaja sábados)', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-01-05', '2026-01-26',
        '2026-01-01', '2026-01-15',
        'vacaciones',
        ['domingo'] // solo domingo como descanso
      );
      // Ene 5-15 con solo domingo de descanso:
      // 5(lun),6(mar),7(mie),8(jue),9(vie),10(sab), [11 dom],
      // [12 festivo],13(mar),14(mie),15(jue) = 9 días hábiles
      expect(days).toBe(9);
    });

    it('empleado con descanso lunes y martes', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-01-05', '2026-01-15',
        '2026-01-01', '2026-01-15',
        'vacaciones',
        ['lunes', 'martes']
      );
      // Ene 5-15 con descanso lunes y martes:
      // [5 lun desc],[6 mar desc],7(mie),8(jue),9(vie),10(sab),
      // 11(dom),[12 festivo lun desc],[13 mar desc],14(mie),15(jue)
      // Hábiles: 7,8,9,10,11,14,15 = 7
      expect(days).toBe(7);
    });

    it('empleado con un solo día de descanso tiene más hábiles', () => {
      const standardDays = calculatePeriodIntersectionDays(
        '2026-02-02', '2026-02-13',
        '2026-02-01', '2026-02-15',
        'vacaciones',
        ['sabado', 'domingo']
      );
      const customDays = calculatePeriodIntersectionDays(
        '2026-02-02', '2026-02-13',
        '2026-02-01', '2026-02-15',
        'vacaciones',
        ['domingo'] // solo domingo
      );
      expect(customDays).toBeGreaterThan(standardDays);
    });
  });

  describe('Vacaciones dentro de un solo período', () => {
    it('5 días hábiles dentro de una quincena', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-02-02', '2026-02-06', // lunes a viernes
        '2026-02-01', '2026-02-15',
        'vacaciones'
      );
      expect(days).toBe(5);
    });

    it('valor correcto para 5 días', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-02-02', '2026-02-06',
        '2026-02-01', '2026-02-15',
        'vacaciones'
      );
      const value = calculateVacationValue(1900000, days);
      // (1,900,000 / 30) × 5 = 316,667
      expect(value).toBe(316667);
    });
  });

  describe('Sin intersección', () => {
    it('ausencia fuera del período retorna 0', () => {
      const days = calculatePeriodIntersectionDays(
        '2026-03-01', '2026-03-15',
        '2026-02-01', '2026-02-15',
        'vacaciones'
      );
      expect(days).toBe(0);
    });
  });
});
