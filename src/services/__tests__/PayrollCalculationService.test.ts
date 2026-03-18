import { describe, it, expect } from 'vitest';
import { PayrollCalculationService, PayrollPeriod } from '../PayrollCalculationService';

describe('PayrollCalculationService', () => {
  // ─── calculateWorkedDays ────────────────────────────────────────────────────

  describe('calculateWorkedDays — quincenal', () => {
    it('retorna siempre 15 días sin importar las fechas', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'quincenal',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-15',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(15);
    });

    it('retorna 15 días aunque el rango sea enero completo (31 días calendario)', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'quincenal',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-31',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(15);
    });

    it('retorna 15 días para la segunda quincena (16-31)', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'quincenal',
        fecha_inicio: '2025-01-16',
        fecha_fin: '2025-01-31',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(15);
    });
  });

  describe('calculateWorkedDays — semanal', () => {
    it('retorna siempre 7 días', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'semanal',
        fecha_inicio: '2025-01-06',
        fecha_fin: '2025-01-12',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(7);
    });

    it('retorna 7 días aunque el rango tenga más días calendario', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'semanal',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-31',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(7);
    });
  });

  describe('calculateWorkedDays — mensual', () => {
    it('enero 2025 (31 días) → 31', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-31',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(31);
    });

    it('febrero 2025 (no bisiesto, 28 días) → 28', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-02-01',
        fecha_fin: '2025-02-28',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(28);
    });

    it('abril 2025 (30 días) → 30', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-04-01',
        fecha_fin: '2025-04-30',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(30);
    });

    it('rango personalizado de 16 días → 16', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-03-01',
        fecha_fin: '2025-03-16',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(16);
    });

    it('mismo día inicio y fin (mensual) → 1 día', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-03-15',
        fecha_fin: '2025-03-15',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(1);
    });
  });

  describe('calculateWorkedDays — casos límite', () => {
    it('period null → 30 días (default)', () => {
      expect(PayrollCalculationService.calculateWorkedDays(null)).toBe(30);
    });

    it('tipo_periodo desconocido → 30 días (default)', () => {
      const period = {
        tipo_periodo: 'bimestral' as any,
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-02-28',
      };
      expect(PayrollCalculationService.calculateWorkedDays(period)).toBe(30);
    });
  });

  // ─── calculateRealDays ──────────────────────────────────────────────────────

  describe('calculateRealDays', () => {
    it('mismo día inicio y fin → 1 día real', () => {
      expect(PayrollCalculationService.calculateRealDays('2025-03-15', '2025-03-15')).toBe(1);
    });

    it('enero completo (1-31) → 31 días reales', () => {
      expect(PayrollCalculationService.calculateRealDays('2025-01-01', '2025-01-31')).toBe(31);
    });

    it('febrero 2025 (1-28) → 28 días reales', () => {
      expect(PayrollCalculationService.calculateRealDays('2025-02-01', '2025-02-28')).toBe(28);
    });

    it('primera quincena (1-15) → 15 días reales', () => {
      expect(PayrollCalculationService.calculateRealDays('2025-01-01', '2025-01-15')).toBe(15);
    });

    it('7 días (semana) → 7 días reales', () => {
      expect(PayrollCalculationService.calculateRealDays('2025-01-06', '2025-01-12')).toBe(7);
    });

    it('fecha vacía → 0', () => {
      expect(PayrollCalculationService.calculateRealDays('', '2025-01-31')).toBe(0);
      expect(PayrollCalculationService.calculateRealDays('2025-01-01', '')).toBe(0);
    });
  });

  // ─── getDaysInfo ────────────────────────────────────────────────────────────

  describe('getDaysInfo', () => {
    it('period null → legalDays=30, realDays=30, periodType=mensual', () => {
      const info = PayrollCalculationService.getDaysInfo(null);
      expect(info.legalDays).toBe(30);
      expect(info.realDays).toBe(30);
      expect(info.periodType).toBe('mensual');
    });

    it('quincenal: legalDays=15, periodType=quincenal', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'quincenal',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-15',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.legalDays).toBe(15);
      expect(info.periodType).toBe('quincenal');
    });

    it('mensual enero: legalDays=31, realDays=31', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-31',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.legalDays).toBe(31);
      expect(info.realDays).toBe(31);
    });

    it('semanal: legalDays=7, periodType=semanal', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'semanal',
        fecha_inicio: '2025-01-06',
        fecha_fin: '2025-01-12',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.legalDays).toBe(7);
      expect(info.periodType).toBe('semanal');
    });

    it('legalDays es consistente con calculateWorkedDays()', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-03-01',
        fecha_fin: '2025-03-31',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.legalDays).toBe(PayrollCalculationService.calculateWorkedDays(period));
    });

    it('realDays es consistente con calculateRealDays()', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'mensual',
        fecha_inicio: '2025-04-01',
        fecha_fin: '2025-04-30',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.realDays).toBe(
        PayrollCalculationService.calculateRealDays(period.fecha_inicio, period.fecha_fin)
      );
    });

    it('quincenal segunda quincena: legalDays=15 aunque haya 16 días calendario', () => {
      const period: PayrollPeriod = {
        tipo_periodo: 'quincenal',
        fecha_inicio: '2025-01-16',
        fecha_fin: '2025-01-31',
      };
      const info = PayrollCalculationService.getDaysInfo(period);
      expect(info.legalDays).toBe(15);
      expect(info.realDays).toBe(16); // días reales ≠ días legales
    });
  });
});
