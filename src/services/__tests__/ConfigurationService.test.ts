import { describe, it, expect } from 'vitest';
import { ConfigurationService } from '../ConfigurationService';

describe('ConfigurationService', () => {
  describe('getConfigurationSync - 2025 defaults', () => {
    const config = ConfigurationService.getConfigurationSync('2025');

    it('returns SMMLV 2025 = $1,423,500', () => {
      expect(config.salarioMinimo).toBe(1423500);
    });

    it('returns auxilio transporte 2025 = $200,000', () => {
      expect(config.auxilioTransporte).toBe(200000);
    });

    it('returns UVT 2025 = $49,799', () => {
      expect(config.uvt).toBe(49799);
    });

    it('has correct employee percentages', () => {
      expect(config.porcentajes.saludEmpleado).toBe(0.04);
      expect(config.porcentajes.pensionEmpleado).toBe(0.04);
    });

    it('has correct employer percentages', () => {
      expect(config.porcentajes.saludEmpleador).toBe(0.085);
      expect(config.porcentajes.pensionEmpleador).toBe(0.12);
      expect(config.porcentajes.cajaCompensacion).toBe(0.04);
      expect(config.porcentajes.icbf).toBe(0.03);
      expect(config.porcentajes.sena).toBe(0.02);
    });

    it('has correct social benefits percentages', () => {
      expect(config.porcentajes.cesantias).toBe(0.0833);
      expect(config.porcentajes.interesesCesantias).toBe(0.12);
      expect(config.porcentajes.prima).toBe(0.0833);
      expect(config.porcentajes.vacaciones).toBe(0.0417);
    });
  });

  describe('getConfigurationSync - 2024 values differ', () => {
    const config2024 = ConfigurationService.getConfigurationSync('2024');
    const config2025 = ConfigurationService.getConfigurationSync('2025');

    it('2024 SMMLV = $1,300,000', () => {
      expect(config2024.salarioMinimo).toBe(1300000);
    });

    it('2024 auxilio transporte = $162,000', () => {
      expect(config2024.auxilioTransporte).toBe(162000);
    });

    it('2024 UVT = $47,065', () => {
      expect(config2024.uvt).toBe(47065);
    });

    it('2024 values differ from 2025', () => {
      expect(config2024.salarioMinimo).not.toBe(config2025.salarioMinimo);
      expect(config2024.auxilioTransporte).not.toBe(config2025.auxilioTransporte);
    });
  });

  describe('ARL risk levels', () => {
    const config = ConfigurationService.getConfigurationSync('2025');

    it('has 5 risk levels', () => {
      expect(Object.keys(config.arlRiskLevels)).toHaveLength(5);
    });

    it('level I < level V', () => {
      expect(config.arlRiskLevels.I).toBeLessThan(config.arlRiskLevels.V);
    });

    it('levels are in ascending order', () => {
      const { I, II, III, IV, V } = config.arlRiskLevels;
      expect(I).toBeLessThan(II);
      expect(II).toBeLessThan(III);
      expect(III).toBeLessThan(IV);
      expect(IV).toBeLessThan(V);
    });
  });

  describe('Fondo solidaridad ranges', () => {
    const config = ConfigurationService.getConfigurationSync('2025');

    it('starts at 4 SMMLV', () => {
      expect(config.fondoSolidaridad.ranges[0].minSMMLV).toBe(4);
    });

    it('has progressive percentages', () => {
      const percentages = config.fondoSolidaridad.ranges.map(r => r.percentage);
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeGreaterThanOrEqual(percentages[i - 1]);
      }
    });

    it('last range has no upper bound', () => {
      const lastRange = config.fondoSolidaridad.ranges[config.fondoSolidaridad.ranges.length - 1];
      expect(lastRange.maxSMMLV).toBeNull();
    });
  });

  describe('defaults for unknown years', () => {
    it('returns 2025 values for unknown year', () => {
      const config = ConfigurationService.getConfigurationSync('2030');
      expect(config.salarioMinimo).toBe(1423500);
    });
  });
});
