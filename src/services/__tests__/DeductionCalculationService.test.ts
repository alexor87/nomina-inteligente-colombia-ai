import { describe, it, expect } from 'vitest';
import { DeductionCalculationService } from '../DeductionCalculationService';

const SMMLV = 1423500;

describe('DeductionCalculationService', () => {
  describe('calculateDeductions - legacy number input', () => {
    it('calculates 4% health and 4% pension', () => {
      const salary = 3000000;
      const result = DeductionCalculationService.calculateDeductions(salary);
      expect(result.saludEmpleado).toBe(Math.round(salary * 0.04));
      expect(result.pensionEmpleado).toBe(Math.round(salary * 0.04));
    });

    it('returns correct total', () => {
      const salary = 2000000;
      const result = DeductionCalculationService.calculateDeductions(salary);
      expect(result.totalDeducciones).toBe(result.saludEmpleado + result.pensionEmpleado);
    });

    it('uses backend values when provided', () => {
      const result = DeductionCalculationService.calculateDeductions(3000000, {
        ibc: 3000000,
        healthDeduction: 125000,
        pensionDeduction: 130000,
      });
      expect(result.saludEmpleado).toBe(125000);
      expect(result.pensionEmpleado).toBe(130000);
    });

    it('sets fondoSolidaridad and retencionFuente to 0 in legacy mode', () => {
      const result = DeductionCalculationService.calculateDeductions(20000000);
      expect(result.fondoSolidaridad).toBe(0);
      expect(result.retencionFuente).toBe(0);
    });
  });

  describe('calculateDeductions - object input', () => {
    it('calculates basic deductions correctly', () => {
      const result = DeductionCalculationService.calculateDeductions({
        salarioBase: 3000000,
        totalDevengado: 3200000,
        auxilioTransporte: 200000,
        periodType: 'mensual',
      });
      expect(result.saludEmpleado).toBe(Math.round(3000000 * 0.04));
      expect(result.pensionEmpleado).toBe(Math.round(3000000 * 0.04));
    });

    it('calculates fondo solidaridad for salary ≥ 4 SMMLV', () => {
      const highSalary = SMMLV * 5;
      const result = DeductionCalculationService.calculateDeductions({
        salarioBase: highSalary,
        totalDevengado: highSalary,
        auxilioTransporte: 0,
        periodType: 'mensual',
      });
      expect(result.fondoSolidaridad).toBe(Math.round(highSalary * 0.01));
    });

    it('no fondo solidaridad for salary < 4 SMMLV', () => {
      const result = DeductionCalculationService.calculateDeductions({
        salarioBase: SMMLV * 3,
        totalDevengado: SMMLV * 3,
        auxilioTransporte: 200000,
        periodType: 'mensual',
      });
      expect(result.fondoSolidaridad).toBe(0);
    });

    it('calculates retencion fuente for salary ≥ 10 SMMLV', () => {
      const highSalary = SMMLV * 11;
      const result = DeductionCalculationService.calculateDeductions({
        salarioBase: highSalary,
        totalDevengado: highSalary,
        auxilioTransporte: 0,
        periodType: 'mensual',
      });
      expect(result.retencionFuente).toBe(Math.round(highSalary * 0.05));
    });

    it('no retencion fuente for salary < 10 SMMLV', () => {
      const result = DeductionCalculationService.calculateDeductions({
        salarioBase: SMMLV * 5,
        totalDevengado: SMMLV * 5,
        auxilioTransporte: 0,
        periodType: 'mensual',
      });
      expect(result.retencionFuente).toBe(0);
    });
  });

  describe('calculateTransportAllowance', () => {
    it('grants allowance for salary ≤ 2 SMMLV', () => {
      expect(DeductionCalculationService.calculateTransportAllowance(SMMLV)).toBe(200000);
      expect(DeductionCalculationService.calculateTransportAllowance(SMMLV * 2)).toBe(200000);
    });

    it('denies allowance for salary > 2 SMMLV', () => {
      expect(DeductionCalculationService.calculateTransportAllowance(SMMLV * 2 + 1)).toBe(0);
      expect(DeductionCalculationService.calculateTransportAllowance(5000000)).toBe(0);
    });
  });

  describe('calculateProvisions', () => {
    it('calculates cesantías at 8.33%', () => {
      const result = DeductionCalculationService.calculateProvisions(3000000, 30);
      expect(result.cesantias).toBe(Math.round(3000000 * 0.0833));
    });

    it('calculates prima at 8.33%', () => {
      const result = DeductionCalculationService.calculateProvisions(3000000, 30);
      expect(result.prima).toBe(Math.round(3000000 * 0.0833));
    });

    it('calculates vacaciones at 4.17%', () => {
      const result = DeductionCalculationService.calculateProvisions(3000000, 30);
      expect(result.vacaciones).toBe(Math.round(3000000 * 0.0417));
    });

    it('prorates correctly for partial days', () => {
      const result = DeductionCalculationService.calculateProvisions(3000000, 15);
      const proportioned = (3000000 / 30) * 15;
      expect(result.cesantias).toBe(Math.round(proportioned * 0.0833));
    });

    it('total equals sum of components', () => {
      const result = DeductionCalculationService.calculateProvisions(3000000, 30);
      expect(result.total).toBe(
        result.cesantias + result.interesesCesantias + result.prima + result.vacaciones
      );
    });
  });

  describe('calculateEmployerContributions', () => {
    const ibc = 3000000;

    it('calculates employer health at 8.5%', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.salud).toBe(Math.round(ibc * 0.085));
    });

    it('calculates employer pension at 12%', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.pension).toBe(Math.round(ibc * 0.12));
    });

    it('calculates caja compensacion at 4%', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.cajaCompensacion).toBe(Math.round(ibc * 0.04));
    });

    it('calculates ICBF at 3%', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.icbf).toBe(Math.round(ibc * 0.03));
    });

    it('calculates SENA at 2%', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.sena).toBe(Math.round(ibc * 0.02));
    });

    it('varies ARL by risk level', () => {
      const r1 = DeductionCalculationService.calculateEmployerContributions(ibc, 'I');
      const r5 = DeductionCalculationService.calculateEmployerContributions(ibc, 'V');
      expect(r5.arl).toBeGreaterThan(r1.arl);
    });

    it('total equals sum of all components', () => {
      const result = DeductionCalculationService.calculateEmployerContributions(ibc);
      expect(result.total).toBe(
        result.salud + result.pension + result.arl + result.cajaCompensacion + result.icbf + result.sena
      );
    });
  });
});
