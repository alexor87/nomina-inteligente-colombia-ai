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

      // Get periods from the new payroll_periods_real table
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(period => ({
        id: period.id, // Now using real UUID
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        fechaCreacion: period.created_at,
        estado: period.estado,
        empleados: period.empleados_count || 0,
        totalNomina: Number(period.total_devengado || 0) + Number(period.total_deducciones || 0),
        editable: period.estado !== 'cerrado',
        reportado_dian: false // TODO: Add this field to the table if needed
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

      // Get all novedades for this employee in this period - now using periodo_id directly
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

      // Get the period to find the periodo string
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('periodo')
        .eq('id', periodId)
        .single();

      if (periodError) {
        console.error('Error loading period data:', periodError);
        return;
      }

      // Get current payroll record to add to base values
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('salario_base, total_devengado, total_deducciones')
        .eq('employee_id', employeeId)
        .eq('periodo', periodData.periodo)
        .eq('company_id', companyId)
        .single();

      if (payrollError) {
        console.error('Error loading payroll data:', payrollError);
        return;
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
        .eq('periodo', periodData.periodo)
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

      console.log('🔍 Loading period details for real period ID:', periodId);

      // Get the actual period from payroll_periods_real using the real UUID
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) {
        console.error('Error loading period:', periodError);
        throw new Error('Period not found');
      }

      console.log('📊 Real period data loaded:', periodData);

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
        .eq('periodo', periodData.periodo);

      if (payrollsError) throw payrollsError;

      console.log('📊 Payrolls data with IDs loaded:', payrollsData);

      // Now get ALL novedades for this period to calculate totals including novedades
      const { data: novedadesData, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('empleado_id, tipo_novedad, valor')
        .eq('company_id', companyId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.warn('Error loading novedades, continuing without them:', novedadesError);
      }

      console.log('📊 Novedades data loaded:', novedadesData);

      // Group novedades by employee
      const novedadesByEmployee: Record<string, { devengados: number; deducciones: number }> = {};
      
      const tiposDevengados = [
        'horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
        'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'
      ];

      (novedadesData || []).forEach(novedad => {
        const empleadoId = novedad.empleado_id;
        const valor = Number(novedad.valor || 0);
        
        if (!novedadesByEmployee[empleadoId]) {
          novedadesByEmployee[empleadoId] = { devengados: 0, deducciones: 0 };
        }

        if (tiposDevengados.includes(novedad.tipo_novedad)) {
          novedadesByEmployee[empleadoId].devengados += valor;
        } else {
          novedadesByEmployee[empleadoId].deducciones += valor;
        }
      });

      console.log('💰 Novedades grouped by employee:', novedadesByEmployee);

      // Transform data to match expected format with real payroll IDs INCLUDING NOVEDADES
      const period: PayrollHistoryPeriod = {
        id: periodData.id, // Real UUID
        period: periodData.periodo,
        startDate: periodData.fecha_inicio,
        endDate: periodData.fecha_fin,
        type: 'mensual',
        employeesCount: payrollsData?.length || 0,
        status: this.mapStatus(periodData.estado),
        totalGrossPay: Number(periodData.total_devengado || 0),
        totalNetPay: Number(periodData.total_neto || 0),
        totalDeductions: Number(periodData.total_deducciones || 0),
        totalCost: Number(periodData.total_devengado || 0) + Number(periodData.total_deducciones || 0),
        employerContributions: (payrollsData?.length || 0) * 100000, // Mock calculation
        paymentStatus: periodData.estado === 'cerrado' ? 'pagado' : 'pendiente',
        version: 1,
        createdAt: periodData.created_at,
        updatedAt: periodData.updated_at,
        editable: periodData.estado !== 'cerrado',
        reportedToDian: false // TODO: Add this field if needed
      };

      const employees: PayrollHistoryEmployee[] = (payrollsData || []).map(payroll => {
        const empleadoId = payroll.employee_id;
        const novedadesEmpleado = novedadesByEmployee[empleadoId] || { devengados: 0, deducciones: 0 };
        
        // Calculate totals INCLUDING novedades
        const baseGrossPay = Number(payroll.total_devengado || payroll.employees.salario_base || 0);
        const baseDeductions = Number(payroll.total_deducciones || 0);
        
        const finalGrossPay = baseGrossPay + novedadesEmpleado.devengados;
        const finalDeductions = baseDeductions + novedadesEmpleado.deducciones;
        const finalNetPay = finalGrossPay - finalDeductions;

        return {
          id: payroll.employee_id, // Employee ID
          periodId: periodData.id, // Real period UUID
          payrollId: payroll.id, // REAL UUID del registro de payroll
          name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
          position: payroll.employees.cargo || 'Sin cargo',
          grossPay: finalGrossPay, // NOW INCLUDES NOVEDADES!
          deductions: finalDeductions, // NOW INCLUDES NOVEDADES!
          netPay: finalNetPay, // RECALCULATED WITH NOVEDADES!
          baseSalary: Number(payroll.employees.salario_base || 0),
          paymentStatus: payroll.estado === 'pagada' ? 'pagado' : 'pendiente'
        };
      });

      console.log('👥 Employees with novedades included:', employees.map(emp => ({
        name: emp.name,
        employeeId: emp.id,
        baseSalary: emp.baseSalary,
        grossPay: emp.grossPay,
        deductions: emp.deductions,
        netPay: emp.netPay
      })));

      const summary = {
        totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        costoTotal: employees.reduce((sum, emp) => sum + emp.grossPay + emp.deductions, 0),
        aportesEmpleador: employees.length * 100000 // Mock calculation
      };

      console.log('📈 Final summary with novedades:', summary);

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
      case 'cerrado':
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
