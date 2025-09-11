import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';
import { PayrollNovedad } from '@/types/novedades-enhanced';

describe('Novedades Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertNovedadesToIBC', () => {
    it('should convert PayrollNovedad to IBC format correctly', () => {
      // Arrange
      const novedades: PayrollNovedad[] = [
        {
          id: 'nov-001',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'horas_extra',
          subtipo: 'diurnas',
          horas: 10,
          valor: 125000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true,
        },
        {
          id: 'nov-002',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'bonificacion',
          valor: 200000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: false,
        },
      ];

      // Act
      const result = convertNovedadesToIBC(novedades);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        tipo_novedad: 'horas_extra',
        subtipo: 'diurnas',
        horas: 10,
        valor: 125000,
        constitutivo_salario: true,
      });
      expect(result[1]).toMatchObject({
        tipo_novedad: 'bonificacion',
        valor: 200000,
        constitutivo_salario: false,
      });
    });

    it('should identify constitutive novedades correctly', () => {
      // Arrange
      const constitutiveNovedades: PayrollNovedad[] = [
        {
          id: 'nov-001',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'horas_extra',
          valor: 100000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true,
        },
        {
          id: 'nov-002',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'recargo_nocturno',
          valor: 50000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true,
        },
      ];

      // Act
      const result = convertNovedadesToIBC(constitutiveNovedades);
      const constitutiveValues = result.filter(n => n.constitutivo_salario).map(n => n.valor);
      const totalConstitutive = constitutiveValues.reduce((sum, valor) => sum + valor, 0);

      // Assert
      expect(totalConstitutive).toBe(150000);
      expect(result.every(n => n.constitutivo_salario)).toBe(true);
    });

    it('should handle incapacidades with company policies', () => {
      // Arrange
      const incapacidadNovedades: PayrollNovedad[] = [
        {
          id: 'nov-001',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'incapacidad',
          dias: 5,
          valor: 250000,
          base_calculo: {
            salario_base: 1500000,
            factor_calculo: 0.6667,
            dias_periodo: 30,
            detalle_calculo: 'EPS cubre 5 días al 66.67%',
            policy_snapshot: {
              calculation_date: '2025-01-15',
              salary_used: 1500000,
              days_used: 5,
              incapacity_policy: 'eps_standard',
              backfilled: false,
              recalculated: true,
            },
          },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: false,
        },
      ];

      // Act
      const result = convertNovedadesToIBC(incapacidadNovedades);

      // Assert
      expect(result[0]).toMatchObject({
        tipo: 'incapacidad',
        dias: 5,
        valor: 250000,
        constitutivo: false,
      });
      expect(result[0].valor).toBe(250000);
    });

    it('should handle overtime with nocturnal surcharges (75%)', () => {
      // Arrange
      const overtimeNovedades: PayrollNovedad[] = [
        {
          id: 'nov-001',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'horas_extra',
          subtipo: 'nocturnas',
          horas: 8,
          valor: 175000, // Should include 75% surcharge
          base_calculo: {
            salario_base: 2000000,
            factor_calculo: 1.75, // 25% extra + 35% nocturnal + 15% dominical
            tarifa_hora: 8333,
            detalle_calculo: 'Horas extra nocturnas dominicales (175%)',
            dias_periodo: 30,
          },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true,
        },
      ];

      // Act
      const result = convertNovedadesToIBC(overtimeNovedades);

      // Assert
      expect(result[0]).toMatchObject({
        tipo: 'horas_extra',
        subtipo: 'nocturnas',
        horas: 8,
        valor: 175000,
        constitutivo: true,
      });
    });

    it('should handle complex combined novedades with validations', () => {
      // Arrange
      const complexNovedades: PayrollNovedad[] = [
        {
          id: 'nov-001',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'horas_extra',
          subtipo: 'diurnas',
          horas: 15,
          valor: 180000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true,
        },
        {
          id: 'nov-002',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'incapacidad',
          dias: 3,
          valor: -90000, // Deduction
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: false,
        },
        {
          id: 'nov-003',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'bonificacion',
          valor: 300000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: true, // Habitual bonus
        },
        {
          id: 'nov-004',
          company_id: 'company-1',
          empleado_id: 'emp-001',
          periodo_id: 'period-001',
          tipo_novedad: 'libranza',
          valor: -50000, // Voluntary deduction
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          constitutivo_salario: false,
        },
      ];

      // Act
      const result = convertNovedadesToIBC(complexNovedades);
      const totalConstitutive = result
        .filter(n => n.constitutivo_salario)
        .reduce((sum, n) => sum + n.valor, 0);
      const totalDeductions = result
        .filter(n => n.valor < 0)
        .reduce((sum, n) => sum + Math.abs(n.valor), 0);

      // Assert
      expect(result).toHaveLength(4);
      expect(totalConstitutive).toBe(480000); // 180k + 300k
      expect(totalDeductions).toBe(140000); // 90k + 50k
      
      // Validate specific types
      expect(result.find(n => n.tipo_novedad === 'horas_extra')?.constitutivo_salario).toBe(true);
      expect(result.find(n => n.tipo_novedad === 'incapacidad')?.constitutivo_salario).toBe(false);
      expect(result.find(n => n.tipo_novedad === 'bonificacion')?.constitutivo_salario).toBe(true);
      expect(result.find(n => n.tipo_novedad === 'libranza')?.constitutivo_salario).toBe(false);
    });
  });
});