import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod, PayrollHistoryDetails, PayrollHistoryEmployee } from '@/types/payroll-history';

export interface PayrollHistoryRecord {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  fechaCreacion: string;
  estado: string;
  empleados: number;
  totalNomina: number;
  editable: boolean;
  reportado_dian: boolean;
}

export class PayrollHistoryService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(period => ({
        id: period.id,
        periodo: period.periodo || 'Sin período',
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        fechaCreacion: period.created_at,
        estado: period.estado || 'borrador',
        empleados: period.empleados_count || 0,
        totalNomina: Number(period.total_nomina || 0),
        editable: period.editable !== false,
        reportado_dian: period.reportado_dian || false
      }));
    } catch (error) {
      console.error('Error loading payroll periods:', error);
      return [];
    }
  }

  static async getPeriodDetails(periodId: string): Promise<PayrollHistoryDetails> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Get period info
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) throw periodError;

      // Get employees for this period
      const { data: employeesData, error: employeesError } = await supabase
        .from('payroll_employees')
        .select(`
          *,
          employees!inner(
            nombres,
            apellidos,
            cargo
          )
        `)
        .eq('period_id', periodId);

      if (employeesError) throw employeesError;

      // Transform data to match expected format
      const period: PayrollHistoryPeriod = {
        id: periodData.id,
        period: periodData.periodo || 'Sin período',
        startDate: periodData.fecha_inicio,
        endDate: periodData.fecha_fin,
        type: 'mensual',
        employeesCount: employeesData?.length || 0,
        status: this.mapStatus(periodData.estado),
        totalGrossPay: Number(periodData.total_devengado || 0),
        totalNetPay: Number(periodData.total_neto || 0),
        totalDeductions: Number(periodData.total_deducciones || 0),
        totalCost: Number(periodData.total_nomina || 0),
        employerContributions: Number(periodData.aportes_empleador || 0),
        paymentStatus: periodData.estado === 'pagada' ? 'pagado' : 'pendiente',
        version: 1,
        createdAt: periodData.created_at,
        updatedAt: periodData.updated_at,
        editable: periodData.editable !== false,
        reportedToDian: periodData.reportado_dian || false
      };

      const employees: PayrollHistoryEmployee[] = (employeesData || []).map(emp => ({
        id: emp.id,
        periodId: emp.period_id,
        name: `${emp.employees.nombres} ${emp.employees.apellidos}`,
        position: emp.employees.cargo || 'Sin cargo',
        grossPay: Number(emp.devengado || 0),
        deductions: Number(emp.deducciones || 0),
        netPay: Number(emp.neto || 0),
        paymentStatus: emp.estado_pago || 'pendiente'
      }));

      const summary = {
        totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        costoTotal: Number(periodData.total_nomina || 0),
        aportesEmpleador: Number(periodData.aportes_empleador || 0)
      };

      return {
        period,
        summary,
        employees,
        files: {
          desprendibles: [],
          certificates: [],
          reports: []
        }
      };
    } catch (error) {
      console.error('Error loading period details:', error);
      throw error;
    }
  }

  static async updateEmployeeValues(
    periodId: string, 
    employeeId: string, 
    updates: Partial<PayrollHistoryEmployee>
  ): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      const updateData: any = {};
      
      if (updates.grossPay !== undefined) {
        updateData.devengado = updates.grossPay;
      }
      if (updates.deductions !== undefined) {
        updateData.deducciones = updates.deductions;
      }
      if (updates.netPay !== undefined) {
        updateData.neto = updates.netPay;
      }

      const { error } = await supabase
        .from('payroll_employees')
        .update(updateData)
        .eq('id', employeeId)
        .eq('period_id', periodId);

      if (error) throw error;

      // Update period totals
      await this.recalculatePeriodTotals(periodId);
    } catch (error) {
      console.error('Error updating employee values:', error);
      throw error;
    }
  }

  static async recalculatePeriodTotals(periodId: string): Promise<void> {
    try {
      const { data: employees, error } = await supabase
        .from('payroll_employees')
        .select('devengado, deducciones, neto')
        .eq('period_id', periodId);

      if (error) throw error;

      const totals = (employees || []).reduce(
        (acc, emp) => ({
          totalDevengado: acc.totalDevengado + Number(emp.devengado || 0),
          totalDeducciones: acc.totalDeducciones + Number(emp.deducciones || 0),
          totalNeto: acc.totalNeto + Number(emp.neto || 0)
        }),
        { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 }
      );

      const { error: updateError } = await supabase
        .from('payroll_periods')
        .update({
          total_devengado: totals.totalDevengado,
          total_deducciones: totals.totalDeducciones,
          total_neto: totals.totalNeto,
          total_nomina: totals.totalDevengado + totals.totalDeducciones
        })
        .eq('id', periodId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error recalculating period totals:', error);
      throw error;
    }
  }

  private static mapStatus(estado: string): 'cerrado' | 'con_errores' | 'revision' | 'editado' | 'reabierto' {
    switch (estado) {
      case 'cerrada':
      case 'procesada':
      case 'pagada':
        return 'cerrado';
      case 'borrador':
        return 'revision';
      case 'editado':
        return 'editado';
      case 'reabierto':
        return 'reabierto';
      default:
        return 'con_errores';
    }
  }
}
