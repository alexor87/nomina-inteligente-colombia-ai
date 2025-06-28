
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

      // Get unique periods from payrolls table
      const { data, error } = await supabase
        .from('payrolls')
        .select('periodo, estado, created_at, reportado_dian, employee_id, total_devengado, total_deducciones, neto_pagado')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Group by period and calculate aggregates
      const periodMap = new Map<string, {
        periodo: string;
        estado: string;
        created_at: string;
        reportado_dian: boolean;
        employees: Set<string>;
        totalDevengado: number;
        totalDeducciones: number;
        totalNeto: number;
      }>();

      (data || []).forEach(payroll => {
        const key = payroll.periodo;
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            periodo: payroll.periodo,
            estado: payroll.estado || 'borrador',
            created_at: payroll.created_at,
            reportado_dian: payroll.reportado_dian || false,
            employees: new Set(),
            totalDevengado: 0,
            totalDeducciones: 0,
            totalNeto: 0
          });
        }
        
        const period = periodMap.get(key)!;
        period.employees.add(payroll.employee_id);
        period.totalDevengado += Number(payroll.total_devengado || 0);
        period.totalDeducciones += Number(payroll.total_deducciones || 0);
        period.totalNeto += Number(payroll.neto_pagado || 0);
      });

      return Array.from(periodMap.values()).map((period, index) => ({
        id: `period-${index}`,
        periodo: period.periodo,
        fecha_inicio: period.created_at.split('T')[0],
        fecha_fin: period.created_at.split('T')[0],
        fechaCreacion: period.created_at,
        estado: period.estado,
        empleados: period.employees.size,
        totalNomina: period.totalDevengado + period.totalDeducciones,
        editable: period.estado !== 'pagada',
        reportado_dian: period.reportado_dian
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

      // Since periodId might be a generated ID, we need to find the actual period
      // For now, let's try to extract the period name from the URL or use the first available period
      const periods = await this.getPayrollPeriods();
      const targetPeriod = periods.find(p => p.id === periodId) || periods[0];
      
      if (!targetPeriod) {
        throw new Error('Period not found');
      }

      // Get payrolls for this period with employee salary data
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(
            nombre,
            apellido,
            cargo,
            salario_base
          )
        `)
        .eq('company_id', companyId)
        .eq('periodo', targetPeriod.periodo);

      if (payrollsError) throw payrollsError;

      console.log('Payrolls data with salary:', payrollsData);

      // Transform data to match expected format
      const period: PayrollHistoryPeriod = {
        id: targetPeriod.id,
        period: targetPeriod.periodo,
        startDate: targetPeriod.fecha_inicio,
        endDate: targetPeriod.fecha_fin,
        type: 'mensual',
        employeesCount: payrollsData?.length || 0,
        status: this.mapStatus(targetPeriod.estado),
        totalGrossPay: Number(targetPeriod.totalNomina || 0),
        totalNetPay: targetPeriod.empleados * 1000000, // Mock calculation
        totalDeductions: targetPeriod.empleados * 200000, // Mock calculation
        totalCost: Number(targetPeriod.totalNomina || 0),
        employerContributions: targetPeriod.empleados * 100000, // Mock calculation
        paymentStatus: targetPeriod.estado === 'pagada' ? 'pagado' : 'pendiente',
        version: 1,
        createdAt: targetPeriod.fechaCreacion,
        updatedAt: targetPeriod.fechaCreacion,
        editable: targetPeriod.editable,
        reportedToDian: targetPeriod.reportado_dian
      };

      const employees: PayrollHistoryEmployee[] = (payrollsData || []).map(payroll => ({
        id: payroll.id,
        periodId: targetPeriod.id,
        name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        position: payroll.employees.cargo || 'Sin cargo',
        grossPay: Number(payroll.total_devengado || 0),
        deductions: Number(payroll.total_deducciones || 0),
        netPay: Number(payroll.neto_pagado || 0),
        baseSalary: Number(payroll.employees.salario_base || 0), // Salario base real del empleado
        paymentStatus: payroll.estado === 'pagada' ? 'pagado' : 'pendiente'
      }));

      console.log('Employees with base salary:', employees);

      const summary = {
        totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        costoTotal: employees.reduce((sum, emp) => sum + emp.grossPay + emp.deductions, 0),
        aportesEmpleador: employees.length * 100000 // Mock calculation
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
        updateData.total_devengado = updates.grossPay;
      }
      if (updates.deductions !== undefined) {
        updateData.total_deducciones = updates.deductions;
      }
      if (updates.netPay !== undefined) {
        updateData.neto_pagado = updates.netPay;
      }

      const { error } = await supabase
        .from('payrolls')
        .update(updateData)
        .eq('id', employeeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating employee values:', error);
      throw error;
    }
  }

  static async recalculatePeriodTotals(periodId: string): Promise<void> {
    // This is now handled automatically by the individual updates
    // since we're working directly with the payrolls table
    console.log('Period totals updated automatically');
  }

  private static mapStatus(estado: string): 'cerrado' | 'con_errores' | 'revision' | 'editado' | 'reabierto' {
    switch (estado) {
      case 'pagada':
      case 'procesada':
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
