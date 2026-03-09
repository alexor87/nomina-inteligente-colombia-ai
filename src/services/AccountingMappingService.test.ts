import { describe, it, expect } from 'vitest';
import { AccountingMappingService, conceptLabels, conceptTooltips } from './AccountingMappingService';

describe('AccountingMappingService', () => {
  describe('validatePucAccount', () => {
    it('should return true for valid 4-digit PUC accounts', () => {
      expect(AccountingMappingService.validatePucAccount('5105')).toBe(true);
    });

    it('should return true for valid 6-digit PUC accounts', () => {
      expect(AccountingMappingService.validatePucAccount('510506')).toBe(true);
    });

    it('should return true for valid 10-digit PUC accounts', () => {
      expect(AccountingMappingService.validatePucAccount('5105060102')).toBe(true);
    });

    it('should return false for accounts with less than 4 digits', () => {
      expect(AccountingMappingService.validatePucAccount('510')).toBe(false);
      expect(AccountingMappingService.validatePucAccount('51')).toBe(false);
      expect(AccountingMappingService.validatePucAccount('5')).toBe(false);
    });

    it('should return false for accounts with more than 10 digits', () => {
      expect(AccountingMappingService.validatePucAccount('51050601021')).toBe(false);
    });

    it('should return false for accounts with non-numeric characters', () => {
      expect(AccountingMappingService.validatePucAccount('5105a6')).toBe(false);
      expect(AccountingMappingService.validatePucAccount('51-05')).toBe(false);
      expect(AccountingMappingService.validatePucAccount('5105.06')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(AccountingMappingService.validatePucAccount('')).toBe(false);
    });

    it('should return false for accounts with spaces', () => {
      expect(AccountingMappingService.validatePucAccount('5105 06')).toBe(false);
      expect(AccountingMappingService.validatePucAccount(' 510506')).toBe(false);
    });
  });

  describe('conceptLabels', () => {
    it('should contain all standard payroll concepts', () => {
      const expectedConcepts = [
        'salario_basico',
        'auxilio_transporte',
        'horas_extra',
        'recargos_nocturnos',
        'bonificaciones',
        'comisiones',
        'incapacidades',
        'licencias',
        'salud_empleador',
        'pension_empleador',
        'arl',
        'caja_compensacion',
        'sena',
        'icbf',
        'salud_empleado',
        'pension_empleado',
        'fondo_solidaridad',
        'retencion_fuente',
        'cesantias',
        'intereses_cesantias',
        'prima_servicios',
        'vacaciones',
        'neto_pagar'
      ];

      expectedConcepts.forEach(concept => {
        expect(conceptLabels[concept]).toBeDefined();
        expect(typeof conceptLabels[concept]).toBe('string');
      });
    });

    it('should have human-readable labels', () => {
      expect(conceptLabels['salario_basico']).toBe('Salario Básico');
      expect(conceptLabels['auxilio_transporte']).toBe('Auxilio de Transporte');
      expect(conceptLabels['neto_pagar']).toBe('Neto a Pagar');
    });
  });

  describe('conceptTooltips', () => {
    it('should have tooltips for all standard concepts', () => {
      Object.keys(conceptLabels).forEach(concept => {
        expect(conceptTooltips[concept]).toBeDefined();
        expect(typeof conceptTooltips[concept]).toBe('string');
        expect(conceptTooltips[concept].length).toBeGreaterThan(10);
      });
    });

    it('should contain informative descriptions', () => {
      expect(conceptTooltips['salario_basico']).toContain('mensual');
      expect(conceptTooltips['auxilio_transporte']).toContain('SMMLV');
      expect(conceptTooltips['salud_empleador']).toContain('8.5%');
    });
  });

  describe('isCustomConcept logic', () => {
    it('should identify standard concepts as non-custom', () => {
      const standardConcepts = Object.keys(conceptLabels);
      standardConcepts.forEach(concept => {
        expect(!!conceptLabels[concept]).toBe(true);
      });
    });

    it('should identify unknown concepts as custom', () => {
      expect(conceptLabels['bono_productividad']).toBeUndefined();
      expect(conceptLabels['custom_deduction']).toBeUndefined();
      expect(conceptLabels['my_custom_concept']).toBeUndefined();
    });
  });
});
