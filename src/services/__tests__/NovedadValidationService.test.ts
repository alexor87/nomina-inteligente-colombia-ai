import { describe, it, expect } from 'vitest';
import { NovedadValidationService } from '../NovedadValidationService';

describe('NovedadValidationService', () => {
  const validBase = {
    tipo_novedad: 'bonificacion',
    valor: 100000,
    empleado_id: 'emp-1',
    periodo_id: 'per-1',
  };

  describe('validateNovedadData', () => {
    it('passes for valid complete data', () => {
      const result = NovedadValidationService.validateNovedadData(validBase);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when tipo_novedad is missing', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tipo de novedad es requerido');
    });

    it('fails when valor is 0 or negative', () => {
      expect(NovedadValidationService.validateNovedadData({ ...validBase, valor: 0 }).isValid).toBe(false);
      expect(NovedadValidationService.validateNovedadData({ ...validBase, valor: -100 }).isValid).toBe(false);
    });

    it('fails when empleado_id is missing', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, empleado_id: '' });
      expect(result.isValid).toBe(false);
    });

    it('fails when periodo_id is missing', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, periodo_id: '' });
      expect(result.isValid).toBe(false);
    });

    it('fails for invalid tipo_novedad', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: 'tipo_falso' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('no válido'))).toBe(true);
    });

    it('accepts all valid novedad types', () => {
      const validTypes = [
        'horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos',
        'vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada',
        'salud', 'pension', 'retencion_fuente', 'fondo_solidaridad', 'ausencia',
        'libranza', 'multa', 'descuento_voluntario',
      ];
      for (const tipo of validTypes) {
        const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: tipo });
        expect(result.errors.filter(e => e.includes('no válido'))).toHaveLength(0);
      }
    });

    it('requires horas for horas_extra', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: 'horas_extra' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('horas'))).toBe(true);
    });

    it('requires horas for recargo_nocturno', () => {
      const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: 'recargo_nocturno' });
      expect(result.isValid).toBe(false);
    });

    it('passes horas_extra with valid horas', () => {
      const result = NovedadValidationService.validateNovedadData({
        ...validBase, tipo_novedad: 'horas_extra', horas: 5,
      });
      expect(result.isValid).toBe(true);
    });

    it.each(['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'])(
      'requires dias for %s', (tipo) => {
        const result = NovedadValidationService.validateNovedadData({ ...validBase, tipo_novedad: tipo });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('días'))).toBe(true);
      }
    );

    it('passes vacaciones with valid dias', () => {
      const result = NovedadValidationService.validateNovedadData({
        ...validBase, tipo_novedad: 'vacaciones', dias: 15,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateForSave', () => {
    it('requires company_id', () => {
      const result = NovedadValidationService.validateForSave(validBase);
      expect(result.canSave).toBe(false);
      expect(result.errors.some(e => e.includes('empresa'))).toBe(true);
    });

    it('passes with company_id', () => {
      const result = NovedadValidationService.validateForSave({ ...validBase, company_id: 'comp-1' });
      expect(result.canSave).toBe(true);
    });
  });
});
