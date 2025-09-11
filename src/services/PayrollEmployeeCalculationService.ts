import { PayrollCalculationBackendService, PayrollCalculationInput } from './PayrollCalculationBackendService';
import { PayrollCalculationService } from './PayrollCalculationService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';
import { PayrollNovedad } from '@/types/novedades-enhanced';

export interface EmployeeRecalculationInput {
  employeeId: string;
  baseSalary: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  fechaInicio: string;
  fechaFin: string;
  novedades?: PayrollNovedad[];
  year?: string;
}

export interface EmployeeRecalculationResult {
  totalDevengado: number;
  totalDeducciones: number;
  netoPagado: number;
  ibc: number;
  auxilioTransporte: number;
  saludEmpleado: number;
  pensionEmpleado: number;
}

/**
 * ✅ SERVICIO UNIFICADO DE CÁLCULO DE EMPLEADOS
 * Extrae la lógica robusta de PayrollHistoryDetailPage para reutilizarla
 * en PeriodEditPage y otros componentes que necesiten cálculos precisos
 */
export class PayrollEmployeeCalculationService {
  /**
   * Recalcula los valores de un empleado usando el motor robusto del backend
   */
  static async recalculateEmployee(input: EmployeeRecalculationInput): Promise<EmployeeRecalculationResult> {
    try {
      console.log('🔄 PayrollEmployeeCalculationService: Recalculando empleado:', input.employeeId);
      
      // Convertir novedades al formato IBC
      const novedadesForIBC = input.novedades ? convertNovedadesToIBC(input.novedades) : [];
      
      // Obtener información de días del período
      const daysInfo = PayrollCalculationService.getDaysInfo({
        tipo_periodo: input.periodType,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin
      });

      // Preparar input para el servicio backend
      const calculationInput: PayrollCalculationInput = {
        baseSalary: input.baseSalary,
        workedDays: daysInfo.legalDays,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: daysInfo.periodType === 'quincenal' ? 'quincenal' : 'mensual',
        novedades: novedadesForIBC,
        year: input.year || '2025'
      };

      // Ejecutar cálculo usando el backend robusto
      const result = await PayrollCalculationBackendService.calculatePayroll(calculationInput);

      console.log('✅ PayrollEmployeeCalculationService: Resultado del cálculo:', {
        employeeId: input.employeeId,
        devengado: result.grossPay,
        deducciones: result.totalDeductions,
        neto: result.netPay,
        ibc: result.ibc
      });

      return {
        totalDevengado: result.grossPay,
        totalDeducciones: result.totalDeductions,
        netoPagado: result.netPay,
        ibc: result.ibc,
        auxilioTransporte: result.transportAllowance,
        saludEmpleado: result.healthDeduction,
        pensionEmpleado: result.pensionDeduction
      };

    } catch (error) {
      console.error('❌ PayrollEmployeeCalculationService: Error recalculando empleado:', error);
      throw error;
    }
  }

  /**
   * Recalcula múltiples empleados de forma optimizada
   */
  static async recalculateMultipleEmployees(
    inputs: EmployeeRecalculationInput[]
  ): Promise<Record<string, EmployeeRecalculationResult>> {
    console.log('🔄 PayrollEmployeeCalculationService: Recalculando múltiples empleados:', inputs.length);
    
    const results: Record<string, EmployeeRecalculationResult> = {};
    
    // Procesar en paralelo para mejor rendimiento
    const promises = inputs.map(async (input) => {
      try {
        const result = await this.recalculateEmployee(input);
        results[input.employeeId] = result;
      } catch (error) {
        console.error(`❌ Error recalculando empleado ${input.employeeId}:`, error);
        // Mantener valores originales en caso de error
        results[input.employeeId] = {
          totalDevengado: input.baseSalary,
          totalDeducciones: 0,
          netoPagado: input.baseSalary,
          ibc: input.baseSalary,
          auxilioTransporte: 0,
          saludEmpleado: 0,
          pensionEmpleado: 0
        };
      }
    });

    await Promise.all(promises);
    
    console.log('✅ PayrollEmployeeCalculationService: Recálculo masivo completado:', Object.keys(results).length);
    return results;
  }
}