
import { supabase } from '@/integrations/supabase/client';

export interface DeductionAuditDetail {
  empleado_id: string;
  empleado_nombre: string;
  periodo: string;
  salario_base: number;
  ibc: number;
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  otras_deducciones: number;
  total_deducciones: number;
  total_calculado: number;
  diferencia: number;
  es_consistente: boolean;
}

export interface AuditSummary {
  total_empleados: number;
  total_deducciones_salud: number;
  total_deducciones_pension: number;
  total_fondo_solidaridad: number;
  total_retencion_fuente: number;
  total_otras_deducciones: number;
  gran_total_deducciones: number;
  empleados_inconsistentes: number;
  porcentaje_consistencia: number;
}

export class PayrollAuditService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  /**
   * Genera reporte detallado de deducciones para auditoría DIAN/UGPP
   */
  static async generateDeductionAuditReport(periodId?: string): Promise<{
    details: DeductionAuditDetail[];
    summary: AuditSummary;
  }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      let query = supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          periodo,
          salario_base,
          salud_empleado,
          pension_empleado,
          fondo_solidaridad,
          retencion_fuente,
          otras_deducciones,
          total_deducciones,
          employees!inner(nombre, apellido)
        `)
        .eq('company_id', companyId)
        .eq('estado', 'procesada');

      if (periodId) {
        query = query.eq('period_id', periodId);
      }

      const { data: payrolls, error } = await query;

      if (error) {
        throw error;
      }

      if (!payrolls || payrolls.length === 0) {
        return {
          details: [],
          summary: {
            total_empleados: 0,
            total_deducciones_salud: 0,
            total_deducciones_pension: 0,
            total_fondo_solidaridad: 0,
            total_retencion_fuente: 0,
            total_otras_deducciones: 0,
            gran_total_deducciones: 0,
            empleados_inconsistentes: 0,
            porcentaje_consistencia: 100
          }
        };
      }

      // Procesar cada registro para auditoría
      const details: DeductionAuditDetail[] = payrolls.map(payroll => {
        const employee = payroll.employees as any;
        
        // Calcular IBC (Base de Cotización)
        const ibc = payroll.salario_base; // Simplificado para el ejemplo
        
        // Calcular suma de deducciones individuales
        const totalCalculado = 
          (payroll.salud_empleado || 0) +
          (payroll.pension_empleado || 0) +
          (payroll.fondo_solidaridad || 0) +
          (payroll.retencion_fuente || 0) +
          (payroll.otras_deducciones || 0);

        const diferencia = Math.abs(totalCalculado - (payroll.total_deducciones || 0));
        const esConsistente = diferencia < 1; // Tolerancia de 1 peso

        return {
          empleado_id: payroll.employee_id,
          empleado_nombre: `${employee.nombre} ${employee.apellido}`,
          periodo: payroll.periodo,
          salario_base: payroll.salario_base,
          ibc: ibc,
          salud_empleado: payroll.salud_empleado || 0,
          pension_empleado: payroll.pension_empleado || 0,
          fondo_solidaridad: payroll.fondo_solidaridad || 0,
          retencion_fuente: payroll.retencion_fuente || 0,
          otras_deducciones: payroll.otras_deducciones || 0,
          total_deducciones: payroll.total_deducciones || 0,
          total_calculado: totalCalculado,
          diferencia: diferencia,
          es_consistente: esConsistente
        };
      });

      // Calcular resumen
      const summary: AuditSummary = {
        total_empleados: details.length,
        total_deducciones_salud: details.reduce((sum, d) => sum + d.salud_empleado, 0),
        total_deducciones_pension: details.reduce((sum, d) => sum + d.pension_empleado, 0),
        total_fondo_solidaridad: details.reduce((sum, d) => sum + d.fondo_solidaridad, 0),
        total_retencion_fuente: details.reduce((sum, d) => sum + d.retencion_fuente, 0),
        total_otras_deducciones: details.reduce((sum, d) => sum + d.otras_deducciones, 0),
        gran_total_deducciones: details.reduce((sum, d) => sum + d.total_deducciones, 0),
        empleados_inconsistentes: details.filter(d => !d.es_consistente).length,
        porcentaje_consistencia: details.length > 0 
          ? Math.round((details.filter(d => d.es_consistente).length / details.length) * 100)
          : 100
      };

      console.log('📋 Reporte de Auditoría Generado:', {
        empleados: summary.total_empleados,
        consistencia: `${summary.porcentaje_consistencia}%`,
        inconsistentes: summary.empleados_inconsistentes
      });

      return { details, summary };
    } catch (error) {
      console.error('Error generating audit report:', error);
      throw error;
    }
  }

  /**
   * Valida la consistencia de deducciones de un período específico
   */
  static async validateDeductionConsistency(periodId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const { details } = await this.generateDeductionAuditReport(periodId);
      
      const errors: string[] = [];
      const warnings: string[] = [];

      details.forEach(detail => {
        if (!detail.es_consistente) {
          errors.push(
            `${detail.empleado_nombre}: Diferencia de ${detail.diferencia.toFixed(2)} entre total calculado y registrado`
          );
        }

        // Validar que las deducciones no sean negativas
        if (detail.salud_empleado < 0 || detail.pension_empleado < 0) {
          errors.push(`${detail.empleado_nombre}: Deducciones de salud o pensión negativas`);
        }

        // Validar que el fondo de solidaridad solo aplique para salarios altos
        if (detail.fondo_solidaridad > 0 && detail.salario_base <= 1300000 * 4) {
          warnings.push(
            `${detail.empleado_nombre}: Fondo de solidaridad aplicado en salario menor a 4 SMMLV`
          );
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating deduction consistency:', error);
      throw error;
    }
  }

  /**
   * Exporta el reporte de auditoría en formato CSV para DIAN/UGPP
   */
  static async exportAuditReportCSV(periodId?: string): Promise<string> {
    try {
      const { details } = await this.generateDeductionAuditReport(periodId);
      
      const headers = [
        'Empleado ID',
        'Nombre Empleado',
        'Período',
        'Salario Base',
        'IBC',
        'Salud Empleado',
        'Pensión Empleado',
        'Fondo Solidaridad',
        'Retención Fuente',
        'Otras Deducciones',
        'Total Deducciones',
        'Consistente'
      ];

      const csvContent = [
        headers.join(','),
        ...details.map(detail => [
          detail.empleado_id,
          `"${detail.empleado_nombre}"`,
          `"${detail.periodo}"`,
          detail.salario_base,
          detail.ibc,
          detail.salud_empleado,
          detail.pension_empleado,
          detail.fondo_solidaridad,
          detail.retencion_fuente,
          detail.otras_deducciones,
          detail.total_deducciones,
          detail.es_consistente ? 'SÍ' : 'NO'
        ].join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting audit report:', error);
      throw error;
    }
  }
}
