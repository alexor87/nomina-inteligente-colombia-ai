
import { supabase } from '@/integrations/supabase/client';
import type { BenefitType } from '@/types/social-benefits';

export type ProvisionRecord = {
  company_id: string;
  period_id: string;
  employee_id: string;
  employee_name: string;
  employee_cedula: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  period_type: string;
  benefit_type: BenefitType;
  base_salary: number;
  variable_average: number;
  transport_allowance: number;
  other_included: number;
  days_count: number;
  provision_amount: number;
  calculation_method: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodOption = {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
};

// Workaround to avoid TS2589 due to very deep generated types from Supabase
const sb: any = supabase;

export class ProvisionsService {
  static async fetchPeriods(): Promise<PeriodOption[]> {
    const { data, error } = await sb
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, tipo_periodo')
      .eq('estado', 'cerrado') // Solo períodos cerrados
      .order('fecha_inicio', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async fetchProvisions(
    periodId: string,
    benefitType: BenefitType | 'all',
    search: string
  ): Promise<ProvisionRecord[]> {
    console.log('🔍 Fetching provisions for period:', periodId);
    
    // Get period info and validate it's closed
    const { data: periodData, error: periodError } = await sb
      .from('payroll_periods_real')
      .select('periodo, fecha_inicio, fecha_fin, tipo_periodo, estado')
      .eq('id', periodId)
      .maybeSingle();

    if (periodError) {
      console.error('❌ Error fetching period:', periodError);
      throw periodError;
    }

    if (!periodData) {
      console.warn('⚠️ Period not found:', periodId);
      return [];
    }

    if (periodData.estado !== 'cerrado') {
      console.warn('⚠️ Period is not closed:', periodId, 'Estado:', periodData.estado);
      return [];
    }

    console.log('📅 Period data:', periodData);

    // Get calculations by period dates only (table may not have period_id)
    let calculations: any[] = [];
    const { data: calcsByDates, error: calcError2 } = await sb
      .from('social_benefit_calculations')
      .select('*')
      .eq('period_start', periodData.fecha_inicio)
      .eq('period_end', periodData.fecha_fin);

    if (calcError2) {
      console.error('❌ Error fetching calculations by dates:', calcError2);
    } else if (calcsByDates && calcsByDates.length > 0) {
      calculations = calcsByDates;
      console.log('✅ Found calculations by dates:', calculations.length);
    } else {
      console.log('📋 No social benefit calculations found for this period');
      return [];
    }

    // Get employees
    const employeeIds = [...new Set(calculations.map((calc: any) => calc.employee_id))];
    console.log('👥 Fetching employee data for:', employeeIds.length, 'employees');
    
    const { data: employees, error: empError } = await sb
      .from('employees')
      .select('id, nombre, apellido, cedula')
      .in('id', employeeIds);

    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      throw empError;
    }

    // Create employee map
    const employeesMap = new Map();
    employees?.forEach((emp: any) => {
      employeesMap.set(emp.id, emp);
    });

    // Transform data
    let transformedData = calculations.map((item: any) => {
      const employee = employeesMap.get(item.employee_id);
      const calculationBasis = item.calculation_basis || {};
      const calculatedValues = item.calculated_values || {};

      return {
        company_id: item.company_id,
        period_id: periodId, // seguimos devolviendo el periodId solicitado
        employee_id: item.employee_id,
        employee_name: employee ? `${employee.nombre} ${employee.apellido}` : 'Unknown',
        employee_cedula: employee?.cedula || null,
        period_name: periodData.periodo,
        period_start: periodData.fecha_inicio,
        period_end: periodData.fecha_fin,
        period_type: periodData.tipo_periodo,
        benefit_type: item.benefit_type as BenefitType,
        base_salary: calculationBasis.base_salary || 0,
        variable_average: calculationBasis.variable_average || 0,
        transport_allowance: calculationBasis.transport_allowance || 0,
        other_included: calculationBasis.other_included || 0,
        days_count: calculatedValues.days_count || 0,
        provision_amount: item.amount || 0,
        calculation_method: calculationBasis.method || null,
        source: 'calculation',
        created_at: item.created_at,
        updated_at: item.updated_at,
      } as ProvisionRecord;
    });

    // Apply filters
    if (benefitType !== 'all') {
      transformedData = transformedData.filter(item => item.benefit_type === benefitType);
    }

    if (search && search.trim().length > 0) {
      const searchTerm = search.trim().toLowerCase();
      transformedData = transformedData.filter(item => 
        item.employee_name.toLowerCase().includes(searchTerm) ||
        (item.employee_cedula && item.employee_cedula.toLowerCase().includes(searchTerm))
      );
    }

    console.log('📊 Final transformed data:', transformedData.length, 'records');
    return transformedData;
  }

  static async recalculateProvisions(periodId: string): Promise<any> {
    console.log('🔄 Recalculating provisions for period:', periodId);
    
    const { data, error } = await supabase.functions.invoke('provision-social-benefits', {
      body: { period_id: periodId },
    });
    
    if (error) {
      console.error('❌ Error recalculating provisions:', error);
      throw error;
    }
    
    console.log('✅ Provisions recalculated:', data);
    return data;
  }
}
