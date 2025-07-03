
import { supabase } from '@/integrations/supabase/client';
import { ReportFilters } from '@/types/reports';

export class ReportsDBService {
  // Reporte de Resumen de Nómina
  static async getPayrollSummaryReport(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching payroll summary with filters:', filters);
    
    let query = supabase
      .from('payrolls')
      .select(`
        employee_id,
        periodo,
        total_devengado,
        total_deducciones,
        neto_pagado,
        employees!inner(
          nombre,
          apellido,
          centro_costos
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    // Aplicar filtros
    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.in('employee_id', filters.employeeIds);
    }

    if (filters.costCenters && filters.costCenters.length > 0) {
      query = query.in('employees.centro_costos', filters.costCenters);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching payroll summary:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Payroll summary fetched:', data?.length, 'records');

    return data?.map(item => ({
      employeeId: item.employee_id,
      employeeName: `${item.employees?.nombre} ${item.employees?.apellido}`,
      period: item.periodo,
      totalEarnings: Number(item.total_devengado) || 0,
      totalDeductions: Number(item.total_deducciones) || 0,
      netPay: Number(item.neto_pagado) || 0,
      employerContributions: Number(item.total_devengado) * 0.21, // Cálculo aproximado de aportes patronales
      costCenter: item.employees?.centro_costos
    })) || [];
  }

  // Reporte de Costos Laborales
  static async getLaborCostReport(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching labor costs with filters:', filters);
    
    let query = supabase
      .from('payrolls')
      .select(`
        employee_id,
        salario_base,
        total_devengado,
        bonificaciones,
        horas_extra,
        auxilio_transporte,
        employees!inner(
          nombre,
          apellido,
          centro_costos
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    // Aplicar filtros
    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.in('employee_id', filters.employeeIds);
    }

    if (filters.costCenters && filters.costCenters.length > 0) {
      query = query.in('employees.centro_costos', filters.costCenters);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching labor costs:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Labor costs fetched:', data?.length, 'records');

    return data?.map(item => {
      const baseSalary = Number(item.salario_base) || 0;
      const benefits = (Number(item.auxilio_transporte) || 0) + (baseSalary * 0.08); // Prestaciones aproximadas
      const overtime = Number(item.horas_extra) || 0;
      const bonuses = Number(item.bonificaciones) || 0;
      const employerContributions = baseSalary * 0.21; // Aportes patronales
      const totalCost = baseSalary + benefits + overtime + bonuses + employerContributions;

      return {
        employeeId: item.employee_id,
        employeeName: `${item.employees?.nombre} ${item.employees?.apellido}`,
        baseSalary,
        benefits,
        overtime,
        bonuses,
        employerContributions,
        totalCost,
        costCenter: item.employees?.centro_costos
      };
    }) || [];
  }

  // Reporte de Seguridad Social
  static async getSocialSecurityReport(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching social security with filters:', filters);
    
    let query = supabase
      .from('payrolls')
      .select(`
        employee_id,
        salario_base,
        salud_empleado,
        pension_empleado,
        employees!inner(
          nombre,
          apellido
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    // Aplicar filtros
    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.in('employee_id', filters.employeeIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching social security:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Social security fetched:', data?.length, 'records');

    return data?.map(item => {
      const baseSalary = Number(item.salario_base) || 0;
      const healthEmployee = Number(item.salud_empleado) || (baseSalary * 0.04);
      const healthEmployer = baseSalary * 0.085;
      const pensionEmployee = Number(item.pension_empleado) || (baseSalary * 0.04);
      const pensionEmployer = baseSalary * 0.12;
      const arl = baseSalary * 0.00522;
      const compensationBox = baseSalary * 0.04;
      const total = healthEmployee + healthEmployer + pensionEmployee + pensionEmployer + arl + compensationBox;

      return {
        employeeId: item.employee_id,
        employeeName: `${item.employees?.nombre} ${item.employees?.apellido}`,
        healthEmployee,
        healthEmployer,
        pensionEmployee,
        pensionEmployer,
        arl,
        compensationBox,
        total
      };
    }) || [];
  }

  // Reporte de Novedades
  static async getNoveltyHistoryReport(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching novelty history with filters:', filters);
    
    let query = supabase
      .from('payroll_novedades')
      .select(`
        id,
        empleado_id,
        tipo_novedad,
        valor,
        horas,
        dias,
        fecha_inicio,
        observacion,
        employees!inner(
          nombre,
          apellido
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    // Aplicar filtros
    if (filters.dateRange?.from) {
      query = query.gte('fecha_inicio', filters.dateRange.from);
    }
    
    if (filters.dateRange?.to) {
      query = query.lte('fecha_inicio', filters.dateRange.to);
    }

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.in('empleado_id', filters.employeeIds);
    }

    if (filters.noveltyTypes && filters.noveltyTypes.length > 0) {
      query = query.in('tipo_novedad', filters.noveltyTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching novelty history:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Novelty history fetched:', data?.length, 'records');

    return data?.map(item => ({
      id: item.id,
      employeeId: item.empleado_id,
      employeeName: `${item.employees?.nombre} ${item.employees?.apellido}`,
      type: item.tipo_novedad,
      description: item.observacion || 'Sin descripción',
      amount: Number(item.valor) || 0,
      hours: Number(item.horas) || 0,
      date: item.fecha_inicio,
      status: 'approved' // Por defecto, ya que están en la BD
    })) || [];
  }

  // Certificados de Retención
  static async getIncomeRetentionCertificates(year: number) {
    console.log('🔍 ReportsDBService: Fetching retention certificates for year:', year);
    
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        employee_id,
        total_devengado,
        retencion_fuente,
        employees!inner(
          nombre,
          apellido
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId())
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (error) {
      console.error('❌ Error fetching retention certificates:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Retention certificates fetched:', data?.length, 'records');

    // Agrupar por empleado para obtener totales anuales
    const employeeData = new Map();
    
    data?.forEach(item => {
      const key = item.employee_id;
      if (!employeeData.has(key)) {
        employeeData.set(key, {
          employeeId: key,
          employeeName: `${item.employees?.nombre} ${item.employees?.apellido}`,
          year,
          totalIncome: 0,
          totalRetentions: 0,
          status: 'generated' as const,
          generatedAt: new Date().toISOString()
        });
      }
      
      const existing = employeeData.get(key);
      existing.totalIncome += Number(item.total_devengado) || 0;
      existing.totalRetentions += Number(item.retencion_fuente) || 0;
    });

    return Array.from(employeeData.values());
  }

  // Exportaciones Contables
  static async getAccountingExports(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching accounting exports with filters:', filters);
    
    let query = supabase
      .from('payrolls')
      .select(`
        periodo,
        total_devengado,
        total_deducciones,
        salud_empleado,
        pension_empleado,
        created_at
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    // Aplicar filtros
    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching accounting exports:', error);
      throw error;
    }

    console.log('✅ ReportsDBService: Accounting exports fetched:', data?.length, 'records');

    // Agrupar por período
    const periodData = new Map();
    
    data?.forEach(item => {
      const key = item.periodo;
      if (!periodData.has(key)) {
        periodData.set(key, {
          id: key,
          type: 'payroll',
          period: key,
          totalAmount: 0,
          accountingEntries: [] as any[],
          generatedAt: item.created_at
        });
      }
      
      const existing = periodData.get(key);
      existing.totalAmount += Number(item.total_devengado) || 0;
    });

    // Generar entradas contables para cada período
    return Array.from(periodData.values()).map(period => ({
      ...period,
      accountingEntries: [
        {
          account: '510506',
          description: 'Sueldos y salarios',
          debit: period.totalAmount,
          credit: 0
        },
        {
          account: '237005',
          description: 'Salarios por pagar',
          debit: 0,
          credit: period.totalAmount
        }
      ]
    }));
  }

  // Obtener ID de la empresa actual
  private static async getCurrentCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('No se encontró la empresa del usuario');
    }

    return profile.company_id;
  }

  // Obtener empleados para filtros
  static async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido')
      .eq('company_id', await this.getCurrentCompanyId())
      .eq('estado', 'activo');

    if (error) {
      console.error('❌ Error fetching employees:', error);
      return [];
    }

    return data?.map(emp => ({
      id: emp.id,
      name: `${emp.nombre} ${emp.apellido}`
    })) || [];
  }

  // Obtener centros de costo para filtros
  static async getCostCenters() {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('code, name')
      .eq('company_id', await this.getCurrentCompanyId())
      .eq('active', true);

    if (error) {
      console.error('❌ Error fetching cost centers:', error);
      return [];
    }

    return data?.map(cc => ({
      code: cc.code,
      name: cc.name
    })) || [];
  }
}
