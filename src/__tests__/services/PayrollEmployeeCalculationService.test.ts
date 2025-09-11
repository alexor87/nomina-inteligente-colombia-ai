import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollEmployeeCalculationService, EmployeeRecalculationInput } from '@/services/PayrollEmployeeCalculationService';
import { PayrollCalculationBackendService } from '@/services/PayrollCalculationBackendService';
import { mockConfiguration2025 } from '../mocks/configuration';

vi.mock('@/services/PayrollCalculationBackendService');
vi.mock('@/services/ConfigurationService');

describe('PayrollEmployeeCalculationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recalculateEmployee', () => {
    it('should calculate employee with minimum salary 2025 correctly', async () => {
      // Arrange
      const input: EmployeeRecalculationInput = {
        employeeId: 'emp-001',
        baseSalary: 1423500, // SMMLV 2025
        periodType: 'mensual',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-31',
        novedades: [],
        year: '2025',
      };

      const mockBackendResult = {
        regularPay: 1423500,
        extraPay: 0,
        grossPay: 1585500, // Salary + transport allowance
        totalDeductions: 113880, // Health + pension
        netPay: 1471620,
        ibc: 1423500,
        transportAllowance: 162000,
        healthDeduction: 56940,
        pensionDeduction: 56940,
        employerHealth: 56940,
        employerPension: 56940,
        employerArl: 7427,
        employerCaja: 42705,
        employerIcbf: 42705,
        employerSena: 28470,
        employerContributions: 178247,
        totalPayrollCost: 1763747,
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll).mockResolvedValue(mockBackendResult);

      // Act
      const result = await PayrollEmployeeCalculationService.recalculateEmployee(input);

      // Assert
      expect(result).toEqual({
        totalDevengado: 1585500,
        totalDeducciones: 113880,
        netoPagado: 1471620,
        ibc: 1423500,
        auxilioTransporte: 162000,
        saludEmpleado: 56940,
        pensionEmpleado: 56940,
      });
    });

    it('should limit IBC to 25 SMMLV maximum (35,587,500)', async () => {
      // Arrange
      const input: EmployeeRecalculationInput = {
        employeeId: 'emp-002',
        baseSalary: 40000000, // Above 25 SMMLV
        periodType: 'mensual',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-31',
        year: '2025',
      };

      const mockBackendResult = {
        regularPay: 40000000,
        extraPay: 0,
        grossPay: 40000000,
        totalDeductions: 2847500, // Based on max IBC
        netPay: 37152500,
        ibc: 35587500, // 25 * 1,423,500
        transportAllowance: 0, // No transport for high salaries
        healthDeduction: 1423500,
        pensionDeduction: 1423500,
        employerHealth: 1423500,
        employerPension: 1423500,
        employerArl: 185507,
        employerCaja: 1067625,
        employerIcbf: 1067625,
        employerSena: 711750,
        employerContributions: 4456007,
        totalPayrollCost: 44456007,
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll).mockResolvedValue(mockBackendResult);

      // Act
      const result = await PayrollEmployeeCalculationService.recalculateEmployee(input);

      // Assert
      expect(result.ibc).toBe(35587500);
      expect(result.auxilioTransporte).toBe(0);
    });

    it('should handle multiple constitutive novedades correctly', async () => {
      // Arrange
      const input: EmployeeRecalculationInput = {
        employeeId: 'emp-003',
        baseSalary: 2000000,
        periodType: 'mensual',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-31',
        novedades: [
          {
            id: 'nov-001',
            company_id: 'test-company',
            empleado_id: 'emp-003',
            periodo_id: 'test-period',
            tipo_novedad: 'horas_extra',
            subtipo: 'ordinarias',
            horas: 10,
            valor: 125000,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            constitutivo_salario: true
          },
          {
            id: 'nov-002',
            company_id: 'test-company',
            empleado_id: 'emp-003',
            periodo_id: 'test-period',
            tipo_novedad: 'bonificacion',
            valor: 200000,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            constitutivo_salario: true
          }
        ],
        year: '2025',
      };

      const mockBackendResult = {
        regularPay: 2000000,
        extraPay: 325000,
        grossPay: 2325000, // Base + extras + bonus
        totalDeductions: 186000,
        netPay: 2139000,
        ibc: 2325000, // Includes constitutive novedades
        transportAllowance: 0,
        healthDeduction: 93000,
        pensionDeduction: 93000,
        employerHealth: 93000,
        employerPension: 93000,
        employerArl: 12127,
        employerCaja: 69750,
        employerIcbf: 69750,
        employerSena: 46500,
        employerContributions: 291127,
        totalPayrollCost: 2616127,
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll).mockResolvedValue(mockBackendResult);

      // Act
      const result = await PayrollEmployeeCalculationService.recalculateEmployee(input);

      // Assert
      expect(result.ibc).toBe(2325000);
      expect(result.totalDevengado).toBe(2325000);
    });

    it('should calculate quincenal period differently from mensual', async () => {
      // Arrange
      const inputQuincenal: EmployeeRecalculationInput = {
        employeeId: 'emp-004',
        baseSalary: 1423500,
        periodType: 'quincenal',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-15',
        year: '2025',
      };

      const mockBackendResult = {
        regularPay: 711750,
        extraPay: 0,
        grossPay: 792750, // Half month + transport
        totalDeductions: 56940,
        netPay: 735810,
        ibc: 711750, // Proportional IBC
        transportAllowance: 81000, // Half transport
        healthDeduction: 28470,
        pensionDeduction: 28470,
        employerHealth: 28470,
        employerPension: 28470,
        employerArl: 3713,
        employerCaja: 21352,
        employerIcbf: 21352,
        employerSena: 14235,
        employerContributions: 89122,
        totalPayrollCost: 881872,
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll).mockResolvedValue(mockBackendResult);

      // Act
      const result = await PayrollEmployeeCalculationService.recalculateEmployee(inputQuincenal);

      // Assert
      expect(result.totalDevengado).toBe(792750);
      expect(result.auxilioTransporte).toBe(81000);
      expect(result.ibc).toBe(711750);
    });

    it('should handle calculation errors gracefully', async () => {
      // Arrange
      const input: EmployeeRecalculationInput = {
        employeeId: 'emp-005',
        baseSalary: 1423500,
        periodType: 'mensual',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-31',
        year: '2025',
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll).mockRejectedValue(
        new Error('Backend calculation failed')
      );

      // Act & Assert
      await expect(
        PayrollEmployeeCalculationService.recalculateEmployee(input)
      ).rejects.toThrow('Backend calculation failed');
    });
  });

  describe('recalculateMultipleEmployees', () => {
    it('should handle multiple employees with fallback on errors', async () => {
      // Arrange
      const inputs: EmployeeRecalculationInput[] = [
        {
          employeeId: 'emp-001',
          baseSalary: 1423500,
          periodType: 'mensual',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-01-31',
        },
        {
          employeeId: 'emp-002',
          baseSalary: 2000000,
          periodType: 'mensual',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-01-31',
        },
      ];

      const successResult = {
        regularPay: 1423500,
        extraPay: 0,
        grossPay: 1585500,
        totalDeductions: 113880,
        netPay: 1471620,
        ibc: 1423500,
        transportAllowance: 162000,
        healthDeduction: 56940,
        pensionDeduction: 56940,
        employerHealth: 56940,
        employerPension: 56940,
        employerArl: 7427,
        employerCaja: 42705,
        employerIcbf: 42705,
        employerSena: 28470,
        employerContributions: 178247,
        totalPayrollCost: 1763747,
      };

      vi.mocked(PayrollCalculationBackendService.calculatePayroll)
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Calculation failed'));

      // Act
      const results = await PayrollEmployeeCalculationService.recalculateMultipleEmployees(inputs);

      // Assert
      expect(results['emp-001']).toEqual({
        totalDevengado: 1585500,
        totalDeducciones: 113880,
        netoPagado: 1471620,
        ibc: 1423500,
        auxilioTransporte: 162000,
        saludEmpleado: 56940,
        pensionEmpleado: 56940,
      });

      // Should fallback to original salary for failed calculation
      expect(results['emp-002']).toEqual({
        totalDevengado: 2000000,
        totalDeducciones: 0,
        netoPagado: 2000000,
        ibc: 2000000,
        auxilioTransporte: 0,
        saludEmpleado: 0,
        pensionEmpleado: 0,
      });
    });
  });
});