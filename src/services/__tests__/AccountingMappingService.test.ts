import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AccountingMappingService, 
  conceptLabels, 
  conceptTooltips 
} from '../AccountingMappingService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: { company_id: 'test-company-id' }, error: null }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

describe('AccountingMappingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePucAccount', () => {
    it('should return true for valid 4-digit PUC account', () => {
      expect(AccountingMappingService.validatePucAccount('5105')).toBe(true);
    });

    it('should return true for valid 6-digit PUC account', () => {
      expect(AccountingMappingService.validatePucAccount('510506')).toBe(true);
    });

    it('should return true for valid 10-digit PUC account', () => {
      expect(AccountingMappingService.validatePucAccount('5105060101')).toBe(true);
    });

    it('should return false for 3-digit account (too short)', () => {
      expect(AccountingMappingService.validatePucAccount('510')).toBe(false);
    });

    it('should return false for 11-digit account (too long)', () => {
      expect(AccountingMappingService.validatePucAccount('51050601011')).toBe(false);
    });

    it('should return false for account with letters', () => {
      expect(AccountingMappingService.validatePucAccount('5105AB')).toBe(false);
    });

    it('should return false for account with special characters', () => {
      expect(AccountingMappingService.validatePucAccount('5105-06')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(AccountingMappingService.validatePucAccount('')).toBe(false);
    });

    it('should return false for account with spaces', () => {
      expect(AccountingMappingService.validatePucAccount('5105 06')).toBe(false);
    });
  });

  describe('conceptLabels', () => {
    it('should have labels for all standard payroll concepts', () => {
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
        expect(conceptLabels[concept].length).toBeGreaterThan(0);
      });
    });

    it('should have Spanish labels', () => {
      expect(conceptLabels['salario_basico']).toBe('Salario Básico');
      expect(conceptLabels['auxilio_transporte']).toBe('Auxilio de Transporte');
      expect(conceptLabels['neto_pagar']).toBe('Neto a Pagar');
    });
  });

  describe('conceptTooltips', () => {
    it('should have tooltips for all concepts that have labels', () => {
      Object.keys(conceptLabels).forEach(concept => {
        expect(conceptTooltips[concept]).toBeDefined();
        expect(typeof conceptTooltips[concept]).toBe('string');
        expect(conceptTooltips[concept].length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive tooltips', () => {
      expect(conceptTooltips['salud_empleador']).toContain('8.5%');
      expect(conceptTooltips['pension_empleador']).toContain('12%');
      expect(conceptTooltips['caja_compensacion']).toContain('4%');
    });
  });
});
