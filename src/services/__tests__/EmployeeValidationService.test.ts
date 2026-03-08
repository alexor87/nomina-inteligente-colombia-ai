import { describe, it, expect } from 'vitest';
import { EmployeeValidationService } from '../EmployeeValidationService';

const COMPANY_ID = 'test-company-id';

describe('EmployeeValidationService', () => {
  describe('validateAndCleanEmployeeData', () => {
    const baseData = {
      cedula: '1234567890',
      nombre: 'Juan',
      apellido: 'Pérez',
      salarioBase: 3000000,
      fechaIngreso: '2025-01-01',
    };

    it('sets default estado to "activo"', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(baseData, COMPANY_ID);
      expect(result.estado).toBe('activo');
    });

    it('accepts valid estado', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(
        { ...baseData, estado: 'vacaciones' }, COMPANY_ID
      );
      expect(result.estado).toBe('vacaciones');
    });

    it('resets invalid estado to "activo"', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(
        { ...baseData, estado: 'invalido' }, COMPANY_ID
      );
      expect(result.estado).toBe('activo');
    });

    it('defaults tipoContrato to "indefinido"', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(baseData, COMPANY_ID);
      expect(result.tipo_contrato).toBe('indefinido');
    });

    it('defaults tipoDocumento to "CC"', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(baseData, COMPANY_ID);
      expect(result.tipo_documento).toBe('CC');
    });

    it('accepts valid document types', () => {
      for (const tipo of ['CC', 'TI', 'CE', 'PA', 'PEP', 'PPT']) {
        const result = EmployeeValidationService.validateAndCleanEmployeeData(
          { ...baseData, tipoDocumento: tipo }, COMPANY_ID
        );
        expect(result.tipo_documento).toBe(tipo);
      }
    });

    it('converts empty strings to null for text fields', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(
        { ...baseData, email: '', telefono: '', eps: '' }, COMPANY_ID
      );
      expect(result.email).toBeNull();
      expect(result.telefono).toBeNull();
      expect(result.eps).toBeNull();
    });

    it('converts undefined to null for optional fields', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(baseData, COMPANY_ID);
      expect(result.eps).toBeNull();
      expect(result.afp).toBeNull();
      expect(result.banco).toBeNull();
    });

    it('sets company_id correctly', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(baseData, COMPANY_ID);
      expect(result.company_id).toBe(COMPANY_ID);
    });

    it('trims whitespace from text fields', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(
        { ...baseData, nombre: '  Juan  ', cedula: ' 123 ' }, COMPANY_ID
      );
      expect(result.nombre).toBe('Juan');
      expect(result.cedula).toBe('123');
    });

    it('defaults salario_base to 0 for invalid input', () => {
      const result = EmployeeValidationService.validateAndCleanEmployeeData(
        { ...baseData, salarioBase: 'abc' }, COMPANY_ID
      );
      expect(result.salario_base).toBe(0);
    });
  });

  describe('validateBasicFields', () => {
    it('throws on empty cedula', () => {
      expect(() => EmployeeValidationService.validateBasicFields({ cedula: '', nombre: 'Test', salario_base: 1000 }))
        .toThrow('documento');
    });

    it('throws on empty nombre', () => {
      expect(() => EmployeeValidationService.validateBasicFields({ cedula: '123', nombre: '', salario_base: 1000 }))
        .toThrow('nombre');
    });

    it('throws on salario_base ≤ 0', () => {
      expect(() => EmployeeValidationService.validateBasicFields({ cedula: '123', nombre: 'Test', salario_base: 0 }))
        .toThrow('salario');
    });

    it('passes valid data without throwing', () => {
      expect(() => EmployeeValidationService.validateBasicFields({ cedula: '123', nombre: 'Test', salario_base: 1000 }))
        .not.toThrow();
    });
  });

  describe('prepareUpdateData', () => {
    it('maps camelCase to snake_case', () => {
      const result = EmployeeValidationService.prepareUpdateData({
        salarioBase: 3000000,
        tipoContrato: 'fijo',
        fechaIngreso: '2025-01-01',
      });
      expect(result.salario_base).toBe(3000000);
      expect(result.tipo_contrato).toBe('fijo');
      expect(result.fecha_ingreso).toBe('2025-01-01');
    });

    it('only includes defined fields', () => {
      const result = EmployeeValidationService.prepareUpdateData({ nombre: 'Test' });
      expect(result.nombre).toBe('Test');
      expect(result).not.toHaveProperty('salario_base');
      expect(result).not.toHaveProperty('cedula');
    });

    it('converts empty string affiliations to null', () => {
      const result = EmployeeValidationService.prepareUpdateData({
        eps: '',
        afp: '',
        cajaCompensacion: '',
      });
      expect(result.eps).toBeNull();
      expect(result.afp).toBeNull();
      expect(result.caja_compensacion).toBeNull();
    });

    it('maps bank fields correctly', () => {
      const result = EmployeeValidationService.prepareUpdateData({
        banco: 'Bancolombia',
        tipoCuenta: 'corriente',
        numeroCuenta: '12345',
      });
      expect(result.banco).toBe('Bancolombia');
      expect(result.tipo_cuenta).toBe('corriente');
      expect(result.numero_cuenta).toBe('12345');
    });
  });
});
