import { supabase } from '@/integrations/supabase/client';

/**
 * Obtiene datos del período anterior para comparación
 */
export async function fetchPreviousPeriodData(
  currentPeriodId: string
): Promise<any[] | undefined> {
  try {
    const { data: currentPeriod } = await supabase
      .from('payroll_periods_real')
      .select('fecha_inicio, company_id')
      .eq('id', currentPeriodId)
      .single();

    if (!currentPeriod) return undefined;

    const currentStart = new Date(currentPeriod.fecha_inicio);
    const previousMonth = new Date(currentStart);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const { data: previousPeriod } = await supabase
      .from('payroll_periods_real')
      .select('id')
      .eq('company_id', currentPeriod.company_id)
      .gte('fecha_inicio', previousMonth.toISOString().split('T')[0])
      .lt('fecha_inicio', currentStart.toISOString().split('T')[0])
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single();

    if (!previousPeriod) return undefined;

    const { data } = await supabase
      .from('payrolls')
      .select(`
        employee_id,
        neto_pagado,
        employees(
          nombre,
          apellido,
          centro_costos
        )
      `)
      .eq('period_id', previousPeriod.id);

    return data?.map((item: any) => ({
      employeeId: item.employee_id,
      totalCost: item.neto_pagado || 0,
      netPay: item.neto_pagado || 0,
      costCenter: item.employees?.centro_costos
    })) || undefined;
  } catch (error) {
    console.error('[ReportsDBService] Error fetching previous period:', error);
    return undefined;
  }
}

