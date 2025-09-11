import { describe, it, expect } from 'vitest';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';

describe('PayrollCalculationService', () => {
  describe('calculateWorkedDays', () => {
    it('should always return 15 days for quincenal periods', () => {
      // Arrange
      const period = {
        tipo_periodo: 'quincenal' as const,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-15',
      };

      // Act
      const days = PayrollCalculationService.calculateWorkedDays(period);

      // Assert
      expect(days).toBe(15);
    });

    it('should always return 7 days for semanal periods', () => {
      // Arrange
      const period = {
        tipo_periodo: 'semanal' as const,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-07',
      };

      // Act
      const days = PayrollCalculationService.calculateWorkedDays(period);

      // Assert
      expect(days).toBe(7);
    });

    it('should calculate actual days for February (28 days)', () => {
      // Arrange
      const period = {
        tipo_periodo: 'mensual' as const,
        fecha_inicio: '2025-02-01',
        fecha_fin: '2025-02-28',
      };

      // Act
      const days = PayrollCalculationService.calculateWorkedDays(period);

      // Assert
      expect(days).toBe(28);
    });

    it('should calculate actual days for March (31 days)', () => {
      // Arrange
      const period = {
        tipo_periodo: 'mensual' as const,
        fecha_inicio: '2025-03-01',
        fecha_fin: '2025-03-31',
      };

      // Act
      const days = PayrollCalculationService.calculateWorkedDays(period);

      // Assert
      expect(days).toBe(31);
    });

    it('should fallback to 30 days for mensual with invalid dates', () => {
      // Arrange
      const period = {
        tipo_periodo: 'mensual' as const,
        fecha_inicio: 'invalid-date',
        fecha_fin: 'invalid-date',
      };

      // Act
      const days = PayrollCalculationService.calculateWorkedDays(period);

      // Assert
      expect(days).toBe(30);
    });
  });

  describe('calculateRealDays', () => {
    it('should calculate exact days between dates', () => {
      // Act
      const days = PayrollCalculationService.calculateRealDays('2025-01-01', '2025-01-31');

      // Assert
      expect(days).toBe(31);
    });

    it('should handle leap year February correctly', () => {
      // Act
      const days = PayrollCalculationService.calculateRealDays('2024-02-01', '2024-02-29');

      // Assert
      expect(days).toBe(29);
    });

    it('should handle cross-month calculations', () => {
      // Act
      const days = PayrollCalculationService.calculateRealDays('2025-01-15', '2025-02-15');

      // Assert
      expect(days).toBe(32); // 17 days in Jan + 15 days in Feb
    });
  });

  describe('getDaysInfo', () => {
    it('should return complete day information for quincenal', () => {
      // Arrange
      const period = {
        tipo_periodo: 'quincenal' as const,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-15',
      };

      // Act
      const info = PayrollCalculationService.getDaysInfo(period);

      // Assert
      expect(info).toEqual({
        legalDays: 15,
        realDays: 15,
        periodType: 'quincenal',
      });
    });

    it('should return complete day information for mensual', () => {
      // Arrange
      const period = {
        tipo_periodo: 'mensual' as const,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-31',
      };

      // Act
      const info = PayrollCalculationService.getDaysInfo(period);

      // Assert
      expect(info).toEqual({
        legalDays: 31,
        realDays: 31,
        periodType: 'mensual',
      });
    });

    it('should handle mismatched legal vs real days', () => {
      // Arrange - Quincenal period but with 14 real days
      const period = {
        tipo_periodo: 'quincenal' as const,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-14',
      };

      // Act
      const info = PayrollCalculationService.getDaysInfo(period);

      // Assert
      expect(info).toEqual({
        legalDays: 15, // Always 15 for quincenal by law
        realDays: 14,  // Actual calendar days
        periodType: 'quincenal',
      });
    });
  });
});