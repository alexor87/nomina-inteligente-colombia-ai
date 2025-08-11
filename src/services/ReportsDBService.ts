import { supabase } from '@/integrations/supabase/client';
import { ReportFilters, NoveltyHistoryReport } from '@/types/reports';

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

    if (filters.periodId) {
      query = query.eq('period_id', filters.periodId);
    }

    if (filters.period) {
      query = query.eq('periodo', filters.period);
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

    if (filters.periodId) {
      query = query.eq('period_id', filters.periodId);
    }

    if (filters.period) {
      query = query.eq('periodo', filters.period);
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
      // Cast to any to handle the type mismatch temporarily
      query = query.in('tipo_novedad', filters.noveltyTypes as any);
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
      type: item.tipo_novedad as NoveltyHistoryReport['type'],
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

    if (filters.period) {
      query = query.eq('periodo', filters.period);
    }

    if (filters.periodId) {
      query = query.eq('period_id', filters.periodId);
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

  // Estado de Nómina Electrónica (DIAN) desde payroll_vouchers
  static async getDianStatusReport(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching DIAN status with filters:', filters);

    let query = supabase
      .from('payroll_vouchers')
      .select(`
        employee_id,
        periodo,
        sent_date,
        dian_status,
        pdf_url,
        xml_url,
        dian_cufe,
        employees!inner(
          nombre,
          apellido
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }
    if (filters.period) {
      query = query.eq('periodo', filters.period);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching DIAN status:', error);
      throw error;
    }

    return (
      data?.map((row) => ({
        employeeId: row.employee_id,
        employeeName: `${row.employees?.nombre} ${row.employees?.apellido}`,
        period: row.periodo,
        status: row.dian_status || 'pendiente',
        sentDate: row.sent_date,
        cufe: row.dian_cufe,
        pdfUrl: row.pdf_url,
        xmlUrl: row.xml_url,
      })) || []
    );
  }

  // PILA Preliquidación (consolidados por entidad)
  static async getPilaPreliquidation(filters: ReportFilters) {
    console.log('🔍 ReportsDBService: Fetching PILA preliquidation with filters:', filters);

    let query = supabase
      .from('payrolls')
      .select(`
        employee_id,
        salario_base,
        periodo,
        created_at,
        employees!inner(
          eps,
          afp,
          arl,
          caja_compensacion,
          nombre,
          apellido
        )
      `)
      .eq('company_id', await this.getCurrentCompanyId());

    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to);
    }
    if (filters.period) {
      query = query.eq('periodo', filters.period);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching PILA preliquidation:', error);
      throw error;
    }

    type BucketKey = string;
    const buckets = new Map<BucketKey, { entityType: 'EPS'|'AFP'|'ARL'|'Caja'; entity: string; employeesCount: number; total: number }>();

    data?.forEach((row) => {
      const base = Number(row.salario_base) || 0;
      // Cálculos básicos por entidad
      const healthTotal = base * (0.04 + 0.085); // empleado + empleador
      const pensionTotal = base * (0.04 + 0.12);
      const arlTotal = base * 0.00522; // aproximado mínimo
      const cajaTotal = base * 0.04;

      const add = (entityType: 'EPS'|'AFP'|'ARL'|'Caja', entity: string | null | undefined, value: number) => {
        const e = (entity || 'SIN_ENTIDAD').toString();
        const key = `${entityType}__${e}`;
        const b = buckets.get(key) || { entityType, entity: e, employeesCount: 0, total: 0 };
        b.employeesCount += 1;
        b.total += value;
        buckets.set(key, b);
      };

      add('EPS', row.employees?.eps, healthTotal);
      add('AFP', row.employees?.afp, pensionTotal);
      add('ARL', row.employees?.arl, arlTotal);
      add('Caja', row.employees?.caja_compensacion, cajaTotal);
    });

    return Array.from(buckets.values());
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

  // Obtener períodos disponibles para filtros
  static async getPeriodsForFilters() {
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', await this.getCurrentCompanyId())
      .order('fecha_inicio', { ascending: false });

    if (error) {
      console.error('❌ Error fetching periods for filters:', error);
      return [];
    }

    return data?.map((p: any) => ({
      id: p.id,
      label: p.periodo,
      startDate: p.fecha_inicio,
      endDate: p.fecha_fin,
    })) || [];
  }
}

