/**
 * ✅ PERIOD QUERY BUILDER - Centralized period resolution from DB
 * 
 * Handles ALL queries to payroll_periods_real table
 * Eliminates duplication across aggregation services
 */

import { TemporalParams, TemporalType, ResolvedPeriods, MONTH_NAMES } from './temporal-types.ts';
import { TemporalResolver } from './temporal-resolver.ts';

export class PeriodQueryBuilder {
  /**
   * Main entry point: resolves periods from DB based on TemporalParams
   */
  static async resolvePeriods(
    client: any,
    companyId: string,
    params: TemporalParams
  ): Promise<ResolvedPeriods | null> {
    console.log(`🔍 [PERIOD_BUILDER] Resolving ${params.type} for company ${companyId}`);
    
    try {
      switch (params.type) {
        case TemporalType.FULL_YEAR:
          return await this.getYearPeriods(client, companyId, params.year!);
          
        case TemporalType.LAST_N_MONTHS:
          return await this.getLastNMonthsPeriods(client, companyId, params.monthCount!);
          
        case TemporalType.SPECIFIC_MONTH:
          return await this.getMonthPeriods(client, companyId, params.month!, params.year!);
          
        case TemporalType.QUARTER:
          return await this.getQuarterPeriods(client, companyId, params.quarter!, params.year!);
          
        case TemporalType.SEMESTER:
          return await this.getSemesterPeriods(client, companyId, params.semester!, params.year!);
          
        case TemporalType.MONTH_RANGE:
          if (!params.startDate || !params.endDate || !params.year) {
            console.error('❌ [PERIOD_BUILDER] MONTH_RANGE requires startDate, endDate and year');
            return null;
          }
          return await this.getMonthRangePeriods(
            client, 
            companyId, 
            params.startDate, 
            params.endDate, 
            params.year
          );
          
        case TemporalType.SPECIFIC_PERIOD:
          return await this.getMostRecentPeriod(client, companyId, params.periodIds?.[0]);
          
        default:
          console.warn(`⚠️ [PERIOD_BUILDER] Unsupported temporal type: ${params.type}`);
          return null;
      }
    } catch (error) {
      console.error('❌ [PERIOD_BUILDER] Error resolving periods:', error);
      return null;
    }
  }
  
  /**
   * Get all closed periods for a full year
   */
  private static async getYearPeriods(
    client: any,
    companyId: string,
    year: number
  ): Promise<ResolvedPeriods | null> {
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', `${year}-01-01`)
      .lte('fecha_fin', `${year}-12-31`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching year periods:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No closed periods found for year ${year}`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods for year ${year}`);
    
    return {
      periods,
      displayName: `Año ${year}`,
      temporalType: TemporalType.FULL_YEAR
    };
  }
  
  /**
   * Get periods for the last N months
   */
  private static async getLastNMonthsPeriods(
    client: any,
    companyId: string,
    monthCount: number
  ): Promise<ResolvedPeriods | null> {
    // Calculate date range excluding current month if not closed
    const currentDate = new Date();
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // Last day of previous month
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - monthCount + 1, 1);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`🔍 [PERIOD_BUILDER] Fetching last ${monthCount} months: ${startDateStr} to ${endDateStr}`);
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_fin', startDateStr)    // Periods ending after or on range start
      .lte('fecha_inicio', endDateStr)   // Periods starting before or on range end
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching last N months:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No closed periods found for last ${monthCount} months`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods for last ${monthCount} months`);
    
    return {
      periods,
      displayName: `Últimos ${monthCount} meses`,
      temporalType: TemporalType.LAST_N_MONTHS
    };
  }
  
  /**
   * Get periods for a specific month
   */
  private static async getMonthPeriods(
    client: any,
    companyId: string,
    month: string,
    year: number
  ): Promise<ResolvedPeriods | null> {
    const monthNum = MONTH_NAMES[month.toLowerCase()];
    if (!monthNum) {
      console.error(`❌ [PERIOD_BUILDER] Invalid month name: ${month}`);
      return null;
    }
    
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // Last day of month
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', startDate)
      .lte('fecha_fin', endDate)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching month periods:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No closed periods found for ${month} ${year}`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods for ${month} ${year}`);
    
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return {
      periods,
      displayName: `${monthCap} ${year}`,
      temporalType: TemporalType.SPECIFIC_MONTH
    };
  }
  
  /**
   * Get periods for a quarter (Q1, Q2, Q3, Q4)
   */
  private static async getQuarterPeriods(
    client: any,
    companyId: string,
    quarter: number,
    year: number
  ): Promise<ResolvedPeriods | null> {
    if (quarter < 1 || quarter > 4) {
      console.error(`❌ [PERIOD_BUILDER] Invalid quarter: ${quarter}`);
      return null;
    }
    
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    
    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = new Date(year, endMonth, 0).toISOString().split('T')[0];
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', startDate)
      .lte('fecha_fin', endDate)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching quarter periods:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No closed periods found for Q${quarter} ${year}`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods for Q${quarter} ${year}`);
    
    return {
      periods,
      displayName: `Q${quarter} ${year}`,
      temporalType: TemporalType.QUARTER
    };
  }
  
  /**
   * Get periods for a semester (1st or 2nd half of year)
   */
  private static async getSemesterPeriods(
    client: any,
    companyId: string,
    semester: number,
    year: number
  ): Promise<ResolvedPeriods | null> {
    if (semester < 1 || semester > 2) {
      console.error(`❌ [PERIOD_BUILDER] Invalid semester: ${semester}`);
      return null;
    }
    
    const startMonth = semester === 1 ? 1 : 7;
    const endMonth = semester === 1 ? 6 : 12;
    
    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = new Date(year, endMonth, 0).toISOString().split('T')[0];
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', startDate)
      .lte('fecha_fin', endDate)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching semester periods:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No closed periods found for semester ${semester} ${year}`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods for semester ${semester} ${year}`);
    
    return {
      periods,
      displayName: `Semestre ${semester} ${year}`,
      temporalType: TemporalType.SEMESTER
    };
  }
  
  /**
   * Get periods for a month range
   */
  private static async getMonthRangePeriods(
    client: any,
    companyId: string,
    monthStart: string,
    monthEnd: string,
    year: number
  ): Promise<ResolvedPeriods | null> {
    const startMonthNum = MONTH_NAMES[monthStart.toLowerCase()];
    const endMonthNum = MONTH_NAMES[monthEnd.toLowerCase()];
    
    if (!startMonthNum || !endMonthNum) {
      console.error('❌ [PERIOD_BUILDER] Invalid month names:', monthStart, monthEnd);
      return null;
    }
    
    const startDate = `${year}-${String(startMonthNum).padStart(2, '0')}-01`;
    const endDate = new Date(year, endMonthNum, 0).toISOString().split('T')[0];
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', startDate)
      .lte('fecha_fin', endDate)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [PERIOD_BUILDER] Error fetching month range periods:', error);
      return null;
    }
    
    if (!periods || periods.length === 0) {
      console.warn(`⚠️ [PERIOD_BUILDER] No periods found from ${monthStart} to ${monthEnd} ${year}`);
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Found ${periods.length} periods from ${monthStart} to ${monthEnd} ${year}`);
    
    const monthStartCap = monthStart.charAt(0).toUpperCase() + monthStart.slice(1);
    const monthEndCap = monthEnd.charAt(0).toUpperCase() + monthEnd.slice(1);
    
    return {
      periods,
      displayName: `${monthStartCap} a ${monthEndCap} ${year}`,
      temporalType: TemporalType.MONTH_RANGE
    };
  }
  
  /**
   * Get most recent period (or specific period by ID)
   */
  private static async getMostRecentPeriod(
    client: any,
    companyId: string,
    periodId?: string
  ): Promise<ResolvedPeriods | null> {
    if (periodId) {
      const { data: period, error } = await client
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();
      
      if (error || !period) {
        console.error('❌ [PERIOD_BUILDER] Period not found:', periodId);
        return null;
      }
      
      return {
        periods: [period],
        displayName: period.periodo,
        temporalType: TemporalType.SPECIFIC_PERIOD
      };
    }
    
    // Get most recent closed period
    const { data: period, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !period) {
      console.warn('⚠️ [PERIOD_BUILDER] No closed periods found');
      return null;
    }
    
    console.log(`✅ [PERIOD_BUILDER] Using most recent period: ${period.periodo}`);
    
    return {
      periods: [period],
      displayName: period.periodo,
      temporalType: TemporalType.SPECIFIC_PERIOD
    };
  }

  /**
   * Get a single most recent period matching the provided criteria
   * Used for queries that don't require full month aggregation
   */
  static async getMostRecentMatchingPeriod(
    client: any,
    companyId: string,
    params: { month?: string; year?: number; periodId?: string }
  ): Promise<{ id: string; periodo: string; year: number } | null> {
    console.log('🔍 [PERIOD_BUILDER] getMostRecentMatchingPeriod called:', params);

    // If periodId is provided, fetch that specific period
    if (params.periodId) {
      const { data: period, error } = await client
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio')
        .eq('company_id', companyId)
        .eq('id', params.periodId)
        .eq('estado', 'cerrado')
        .single();
      
      if (error || !period) {
        console.warn('⚠️ [PERIOD_BUILDER] Specific period not found:', params.periodId);
        return null;
      }
      
      const year = new Date(period.fecha_inicio).getFullYear();
      return { id: period.id, periodo: period.periodo, year };
    }

    // If month is provided (with or without year), find most recent period for that month
    if (params.month) {
      const monthNum = MONTH_NAMES[params.month.toLowerCase()];
      if (!monthNum) {
        console.warn('⚠️ [PERIOD_BUILDER] Invalid month name:', params.month);
        return null;
      }

      let query = client
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .gte('fecha_inicio', `${params.year || '2000'}-${String(monthNum).padStart(2, '0')}-01`)
        .lt('fecha_inicio', `${params.year || '9999'}-${String(monthNum + 1).padStart(2, '0')}-01`)
        .order('fecha_fin', { ascending: false })
        .limit(1);

      const { data: period, error } = await query.single();
      
      if (error || !period) {
        console.warn('⚠️ [PERIOD_BUILDER] No period found for month:', params.month, params.year);
        return null;
      }
      
      const year = new Date(period.fecha_inicio).getFullYear();
      console.log(`✅ [PERIOD_BUILDER] Found period for ${params.month} ${year}: ${period.periodo}`);
      return { id: period.id, periodo: period.periodo, year };
    }

    // If only year is provided, get most recent period from that year
    if (params.year) {
      const { data: period, error } = await client
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .gte('fecha_inicio', `${params.year}-01-01`)
        .lt('fecha_inicio', `${params.year + 1}-01-01`)
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !period) {
        console.warn('⚠️ [PERIOD_BUILDER] No period found for year:', params.year);
        return null;
      }
      
      return { id: period.id, periodo: period.periodo, year: params.year };
    }

    // Default: get most recent closed period
    const { data: period, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !period) {
      console.warn('⚠️ [PERIOD_BUILDER] No closed periods found');
      return null;
    }
    
    const year = new Date(period.fecha_inicio).getFullYear();
    console.log(`✅ [PERIOD_BUILDER] Using most recent period: ${period.periodo}`);
    return { id: period.id, periodo: period.periodo, year };
  }
}
