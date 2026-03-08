import { describe, it, expect } from 'vitest';
import { IncapacityCalculationService } from '../IncapacityCalculationService';

const SMMLV = 1423500;
const SMLDV = SMMLV / 30; // $47,450

describe('IncapacityCalculationService', () => {
  describe('normalizeSubtype', () => {
    it.each([
      ['comun', 'general'],
      ['común', 'general'],
      ['enfermedad_general', 'general'],
      ['eg', 'general'],
      ['general', 'general'],
    ])('maps "%s" → "general"', (input, expected) => {
      expect(IncapacityCalculationService.normalizeSubtype(input)).toBe(expected);
    });

    it.each([
      ['laboral', 'laboral'],
      ['arl', 'laboral'],
      ['accidente_laboral', 'laboral'],
      ['riesgo_laboral', 'laboral'],
      ['at', 'laboral'],
    ])('maps "%s" → "laboral"', (input, expected) => {
      expect(IncapacityCalculationService.normalizeSubtype(input)).toBe(expected);
    });

    it('returns undefined for unknown subtypes', () => {
      expect(IncapacityCalculationService.normalizeSubtype('invalido')).toBeUndefined();
    });

    it('returns undefined for empty/undefined input', () => {
      expect(IncapacityCalculationService.normalizeSubtype(undefined)).toBeUndefined();
      expect(IncapacityCalculationService.normalizeSubtype('')).toBeUndefined();
    });
  });

  describe('computeIncapacityValue - Laboral (always 100%)', () => {
    const salary = 3000000;
    const daily = salary / 30;

    it('pays 100% for 5 days', () => {
      const result = IncapacityCalculationService.computeIncapacityValue(salary, 5, 'laboral');
      expect(result).toBe(Math.round(daily * 5));
    });

    it('pays 100% for 15 days', () => {
      const result = IncapacityCalculationService.computeIncapacityValue(salary, 15, 'laboral');
      expect(result).toBe(Math.round(daily * 15));
    });

    it('ignores policy parameter for laboral', () => {
      const r1 = IncapacityCalculationService.computeIncapacityValue(salary, 10, 'arl', 'standard_2d_100_rest_66');
      const r2 = IncapacityCalculationService.computeIncapacityValue(salary, 10, 'arl', 'from_day1_66_with_floor');
      expect(r1).toBe(r2);
      expect(r1).toBe(Math.round(daily * 10));
    });
  });

  describe('computeIncapacityValue - General standard_2d_100_rest_66', () => {
    const salary = 3000000;
    const daily = salary / 30;
    const policy = 'standard_2d_100_rest_66' as const;

    it('pays 100% for ≤2 days', () => {
      expect(IncapacityCalculationService.computeIncapacityValue(salary, 1, 'general', policy))
        .toBe(Math.round(daily * 1));
      expect(IncapacityCalculationService.computeIncapacityValue(salary, 2, 'general', policy))
        .toBe(Math.round(daily * 2));
    });

    it('pays 2d×100% + rest×66.67% for >2 days', () => {
      const days = 10;
      const first2 = daily * 2;
      const remaining = days - 2;
      const daily66 = daily * 0.6667;
      const applied = Math.max(daily66, SMLDV);
      const expected = Math.round(first2 + applied * remaining);

      const result = IncapacityCalculationService.computeIncapacityValue(salary, days, 'general', policy);
      expect(result).toBe(expected);
    });

    it('applies SMLDV floor when daily66 < SMLDV (minimum wage employee)', () => {
      const minSalary = SMMLV;
      const minDaily = minSalary / 30;
      const daily66 = minDaily * 0.6667;
      // daily66 < SMLDV, so SMLDV floor should apply
      expect(daily66).toBeLessThan(SMLDV);

      const result = IncapacityCalculationService.computeIncapacityValue(minSalary, 5, 'general', policy);
      const expected = Math.round(minDaily * 2 + SMLDV * 3);
      expect(result).toBe(expected);
    });
  });

  describe('computeIncapacityValue - General from_day1_66_with_floor', () => {
    const salary = 3000000;
    const daily = salary / 30;
    const policy = 'from_day1_66_with_floor' as const;

    it('pays 66.67% from day 1 for all days', () => {
      const days = 5;
      const daily66 = daily * 0.6667;
      const applied = Math.max(daily66, SMLDV);
      const expected = Math.round(applied * days);

      const result = IncapacityCalculationService.computeIncapacityValue(salary, days, 'general', policy);
      expect(result).toBe(expected);
    });

    it('applies SMLDV floor for minimum wage', () => {
      const result = IncapacityCalculationService.computeIncapacityValue(SMMLV, 10, 'general', policy);
      const expected = Math.round(SMLDV * 10);
      expect(result).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('returns 0 for salary=0', () => {
      expect(IncapacityCalculationService.computeIncapacityValue(0, 5, 'general')).toBe(0);
    });

    it('returns 0 for days=0', () => {
      expect(IncapacityCalculationService.computeIncapacityValue(3000000, 0, 'general')).toBe(0);
    });

    it('returns 0 for negative days', () => {
      expect(IncapacityCalculationService.computeIncapacityValue(3000000, -5, 'general')).toBe(0);
    });

    it('defaults to general when subtipo is undefined', () => {
      const salary = 3000000;
      const r1 = IncapacityCalculationService.computeIncapacityValue(salary, 5, undefined);
      const r2 = IncapacityCalculationService.computeIncapacityValue(salary, 5, 'general');
      expect(r1).toBe(r2);
    });
  });

  describe('calculateExpectedValueByPolicy', () => {
    it('returns breakdown string for laboral', () => {
      const result = IncapacityCalculationService.calculateExpectedValueByPolicy(3000000, 5, 'laboral', 'standard_2d_100_rest_66');
      expect(result.value).toBe(Math.round((3000000 / 30) * 5));
      expect(result.breakdown).toContain('Laboral ARL');
    });

    it('returns breakdown string for general standard', () => {
      const result = IncapacityCalculationService.calculateExpectedValueByPolicy(3000000, 5, 'general', 'standard_2d_100_rest_66');
      expect(result.breakdown).toContain('General estándar');
      expect(result.value).toBeGreaterThan(0);
    });
  });
});
