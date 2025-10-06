/**
 * Incapacity Report Service
 * Generates detailed report of incapacities by employee
 */

import { BaseAggregationService, AggregationResult, PeriodData } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';

interface EmployeeIncapacity {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  totalValue: number;
  bySubtype: {
    general?: { days: number; value: number };
    laboral?: { days: number; value: number };
  };
}

export class IncapacityReportService extends BaseAggregationService {
  
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      // Get current company
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('No se pudo determinar la empresa del usuario');
      }

      // Resolve periods
      const periodResolution = await this.resolvePeriods(client, companyId, params);
      if (!periodResolution) {
        return this.createNotFoundResponse('el período solicitado');
      }

      const { periods, displayName } = periodResolution;
      const periodIds = periods.map(p => p.id);

      console.log(`📊 [INCAPACITY_REPORT] Generating report for ${periods.length} periods in ${displayName}`);

      // Get all employees for the company
      const { data: employees, error: empError } = await client
        .from('employees')
        .select('id, nombre, apellido')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (empError) {
        console.error('[INCAPACITY_REPORT] Error fetching employees:', empError);
        return this.createErrorResponse('Error al obtener empleados');
      }

      if (!employees || employees.length === 0) {
        return {
          message: `No se encontraron empleados activos en la empresa.`,
          emotionalState: 'neutral'
        };
      }

      // Get all incapacity novedades for the periods
      const { data: novedades, error: novError } = await client
        .from('payroll_novedades')
        .select('empleado_id, dias, valor, subtipo')
        .eq('company_id', companyId)
        .eq('tipo_novedad', 'incapacidad')
        .in('periodo_id', periodIds);

      if (novError) {
        console.error('[INCAPACITY_REPORT] Error fetching novedades:', novError);
        return this.createErrorResponse('Error al obtener datos de incapacidades');
      }

      if (!novedades || novedades.length === 0) {
        return {
          message: `No se encontraron incapacidades registradas en ${displayName}.`,
          emotionalState: 'neutral'
        };
      }

      // Group by employee
      const employeeMap = new Map<string, EmployeeIncapacity>();

      for (const novedad of novedades) {
        const employee = employees.find(e => e.id === novedad.empleado_id);
        if (!employee) continue;

        const employeeName = `${employee.nombre} ${employee.apellido}`;
        const days = novedad.dias || 0;
        const value = novedad.valor || 0;
        const subtipo = (novedad.subtipo || 'general').toLowerCase();

        if (!employeeMap.has(novedad.empleado_id)) {
          employeeMap.set(novedad.empleado_id, {
            employeeId: novedad.empleado_id,
            employeeName,
            totalDays: 0,
            totalValue: 0,
            bySubtype: {}
          });
        }

        const empData = employeeMap.get(novedad.empleado_id)!;
        empData.totalDays += days;
        empData.totalValue += value;

        if (subtipo === 'general' || subtipo === 'laboral') {
          if (!empData.bySubtype[subtipo]) {
            empData.bySubtype[subtipo] = { days: 0, value: 0 };
          }
          empData.bySubtype[subtipo]!.days += days;
          empData.bySubtype[subtipo]!.value += value;
        }
      }

      // Convert to array and sort by total days (descending)
      const employeeList = Array.from(employeeMap.values())
        .sort((a, b) => b.totalDays - a.totalDays);

      // Calculate totals
      const totalEmployees = employeeList.length;
      const totalDays = employeeList.reduce((sum, emp) => sum + emp.totalDays, 0);
      const totalCost = employeeList.reduce((sum, emp) => sum + emp.totalValue, 0);
      const avgDays = totalDays / totalEmployees;

      // Build message
      let message = `📋 **Reporte de Incapacidades por Empleado - ${displayName}**\n\n`;
      message += `👥 **Total empleados con incapacidades:** ${totalEmployees}\n\n`;

      for (const emp of employeeList) {
        message += `• **${emp.employeeName}** - ${emp.totalDays} días - ${this.formatCurrency(emp.totalValue)}\n`;
        
        if (emp.bySubtype.general) {
          message += `  - General: ${emp.bySubtype.general.days} días\n`;
        }
        if (emp.bySubtype.laboral) {
          message += `  - Laboral: ${emp.bySubtype.laboral.days} días\n`;
        }
        message += `\n`;
      }

      message += `💰 **Costo total:** ${this.formatCurrency(totalCost)}\n`;
      message += `📊 **Promedio:** ${avgDays.toFixed(1)} días por empleado`;

      console.log(`✅ [INCAPACITY_REPORT] Generated report for ${totalEmployees} employees`);

      return {
        message,
        emotionalState: 'informative',
        data: {
          totalEmployees,
          totalDays,
          totalCost,
          averageDays: parseFloat(avgDays.toFixed(1)),
          employees: employeeList.map(emp => ({
            name: emp.employeeName,
            totalDays: emp.totalDays,
            totalValue: emp.totalValue,
            general: emp.bySubtype.general || { days: 0, value: 0 },
            laboral: emp.bySubtype.laboral || { days: 0, value: 0 }
          })),
          period: displayName
        }
      };

    } catch (error) {
      console.error('[INCAPACITY_REPORT] Error:', error);
      return this.createErrorResponse(`Error generando reporte: ${error.message}`);
    }
  }
}
