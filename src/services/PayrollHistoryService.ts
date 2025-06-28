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

  // Enhanced method to recalculate employee totals including novedades
  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('🔄 Recalculating totals for employee:', employeeId, 'period:', periodId);

      // Get all novedades for this employee in this period
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('tipo_novedad, valor')
        .eq('company_id', companyId)
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.error('Error loading novedades for recalculation:', novedadesError);
        throw novedadesError;
      }

      console.log('📊 Found novedades for recalculation:', novedades);

      // Calculate totals from novedades
      let totalDevengadosNovedades = 0;
      let totalDeduccionesNovedades = 0;

      // Define which novedad types are devengados vs deducciones
      const tiposDevengados = [
        'horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
        'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'
      ];

      (novedades || []).forEach(novedad => {
        const valor = Number(novedad.valor || 0);
        if (tiposDevengados.includes(novedad.tipo_novedad)) {
          totalDevengadosNovedades += valor;
        } else {
          totalDeduccionesNovedades += valor;
        }
      });

      console.log('💰 Calculated totals from novedades:', {
        devengados: totalDevengadosNovedades,
        deducciones: totalDeduccionesNovedades
      });

      // Get current payroll record to add to base values
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('salario_base, total_devengado, total_deducciones')
        .eq('employee_id', employeeId)
        .eq('periodo', periodId) // Assuming we're using the period string
        .eq('company_id', companyId)
        .single();

      if (payrollError) {
        console.error('Error loading payroll data:', payrollError);
        return; // Don't throw here, just log and return
      }

      const salarioBase = Number(payrollData?.salario_base || 0);
      const newTotalDevengado = salarioBase + totalDevengadosNovedades;
      const newTotalDeducciones = totalDeduccionesNovedades;
      const newNetoPagado = newTotalDevengado - newTotalDeducciones;

      console.log('📈 New calculated totals:', {
        salarioBase,
        totalDevengado: newTotalDevengado,
        totalDeducciones: newTotalDeducciones,
        netoPagado: newNetoPagado
      });

      // Update the payroll record with new totals
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: newTotalDevengado,
          total_deducciones: newTotalDeducciones,
          neto_pagado: newNetoPagado,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('periodo', periodId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('Error updating payroll totals:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully updated payroll totals for employee:', employeeId);

    } catch (error) {
      console.error('Error in recalculateEmployeeTotalsWithNovedades:', error);
      throw error;
    }
  }

  static async getPeriodDetails(periodId: string): Promise<PayrollHistoryDetails> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Since periodId might be a generated ID, we need to find the actual period
      const periods = await this.getPayrollPeriods();
      const targetPeriod = periods.find(p => p.id === periodId) || periods[0];
      
      if (!targetPeriod) {
        throw new Error('Period not found');
      }

      // Get payrolls for this period with employee salary data AND the payroll UUID
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          periodo,
          estado,
          salario_base,
          total_devengado,
          total_deducciones,
          neto_pagado,
          created_at,
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

      console.log('📊 Payrolls data with IDs loaded:', payrollsData);

      // Also get novedades count for each employee to show activity
      const employeeIds = payrollsData?.map(p => p.employee_id) || [];
      let novedadesCounts: Record<string, number> = {};

      if (employeeIds.length > 0) {
        const { data: novedadesData } = await supabase
          .from('payroll_novedades')
          .select('empleado_id')
          .eq('company_id', companyId)
          .eq('periodo_id', targetPeriod.id)
          .in('empleado_id', employeeIds);

        // Count novedades per employee
        (novedadesData || []).forEach(nov => {
          novedadesCounts[nov.empleado_id] = (novedadesCounts[nov.empleado_id] || 0) + 1;
        });
      }

      // Transform data to match expected format with real payroll IDs
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
        id: payroll.employee_id, // Employee ID
        periodId: targetPeriod.id, // Artificial period ID for navigation
        payrollId: payroll.id, // REAL UUID del registro de payroll - ¡Esta es la clave!
        name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        position: payroll.employees.cargo || 'Sin cargo',
        grossPay: Number(payroll.total_devengado || 0),
        deductions: Number(payroll.total_deducciones || 0),
        netPay: Number(payroll.neto_pagado || 0),
        baseSalary: Number(payroll.employees.salario_base || 0), // Salario base real del empleado
        paymentStatus: payroll.estado === 'pagada' ? 'pagado' : 'pendiente'
      }));

      console.log('👥 Employees with real payroll UUIDs:', employees.map(emp => ({
        name: emp.name,
        employeeId: emp.id,
        payrollId: emp.payrollId
      })));

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
