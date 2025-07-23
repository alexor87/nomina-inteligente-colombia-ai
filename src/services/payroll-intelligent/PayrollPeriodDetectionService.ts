import { supabase } from '@/integrations/supabase/client';
import { PeriodDisplayService } from './PeriodDisplayService';
import { PeriodNumberCalculationService } from './PeriodNumberCalculationService';

export interface PeriodDetectionResult {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'conflict';
  message: string;
  periodData?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
  conflictPeriod?: any;
}

export class PayrollPeriodDetectionService {
  
  static async detectPeriodForSelectedDates(startDate: string, endDate: string): Promise<PeriodDetectionResult> {
    try {
      console.log('🔍 DETECTION SERVICE - Starting detection for:', { startDate, endDate });
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🏢 DETECTION SERVICE - Company ID:', companyId);

      // CRÍTICO: Generar TODA la información del período UNA SOLA VEZ con el servicio centralizado
      console.log('📋 DETECTION SERVICE - Generating CENTRALIZED period info for selected dates:', { startDate, endDate });
      const centralizedPeriodInfo = PeriodDisplayService.generatePeriodInfo(startDate, endDate, companyId);
      console.log('✅ DETECTION SERVICE - CENTRALIZED period info generated:', centralizedPeriodInfo);

      // PASO 1: Buscar período exacto con las fechas seleccionadas
      const { data: exactPeriod, error: exactError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .maybeSingle();

      if (exactError) {
        console.error('❌ DETECTION SERVICE - Error searching exact period:', exactError);
        throw exactError;
      }

      // Si existe período exacto, continuar con él
      if (exactPeriod) {
        console.log('✅ DETECTION SERVICE - Exact period found:', exactPeriod.periodo);
        return {
          hasActivePeriod: true,
          activePeriod: exactPeriod,
          suggestedAction: 'continue',
          message: `Continuando con período existente: ${exactPeriod.periodo}`,
          periodData: {
            startDate: exactPeriod.fecha_inicio,
            endDate: exactPeriod.fecha_fin,
            periodName: exactPeriod.periodo,
            type: exactPeriod.tipo_periodo as 'semanal' | 'quincenal' | 'mensual'
          }
        };
      }

      // PASO 2: Verificar si hay períodos activos que se solapen
      const { data: overlappingPeriods, error: overlapError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`)
        .order('created_at', { ascending: false });

      if (overlapError) {
        console.error('❌ DETECTION SERVICE - Error searching overlapping periods:', overlapError);
        throw overlapError;
      }

      // Si hay períodos solapados, mostrar conflicto
      if (overlappingPeriods && overlappingPeriods.length > 0) {
        const conflictPeriod = overlappingPeriods[0];
        console.log('⚠️ DETECTION SERVICE - Conflict detected with:', conflictPeriod.periodo);
        
        // USAR la información centralizada ya generada
        console.log('📋 DETECTION SERVICE - Using CENTRALIZED period info for conflict:', centralizedPeriodInfo.name);
        
        return {
          hasActivePeriod: false,
          suggestedAction: 'conflict',
          message: `Existe un período abierto que se solapa: ${conflictPeriod.periodo}`,
          periodData: {
            startDate, // PRESERVAR fechas originales
            endDate,   // PRESERVAR fechas originales
            periodName: centralizedPeriodInfo.name, // USAR nombre centralizado
            type: centralizedPeriodInfo.type
          },
          conflictPeriod
        };
      }

      // PASO 3: No hay conflictos, crear nuevo período
      console.log('🆕 DETECTION SERVICE - No conflicts, using CENTRALIZED period info');
      
      // Calcular número de período si es posible
      let warningMessage = '';
      if (centralizedPeriodInfo.number) {
        const numberResult = await PeriodNumberCalculationService.calculatePeriodNumber(
          companyId, startDate, endDate, centralizedPeriodInfo.type
        );
        
        if (!numberResult.success && numberResult.error) {
          warningMessage = ` (${numberResult.error})`;
        } else if (numberResult.warning) {
          warningMessage = ` (${numberResult.warning})`;
        }
      }

      // CRÍTICO: Usar el nombre semántico preferido si está disponible
      const finalPeriodName = centralizedPeriodInfo.semanticName || centralizedPeriodInfo.name;
      console.log('🏷️ DETECTION SERVICE - Final period name selected:', finalPeriodName);
      
      const result = {
        hasActivePeriod: false,
        suggestedAction: 'create' as const,
        message: `Crear nuevo período: ${finalPeriodName}${warningMessage}`, // USAR nombre centralizado
        periodData: {
          startDate, // PRESERVAR fechas originales
          endDate,   // PRESERVAR fechas originales
          periodName: finalPeriodName, // USAR nombre centralizado
          type: centralizedPeriodInfo.type
        }
      };

      console.log('✅ DETECTION SERVICE - Final result with CENTRALIZED naming:', result);
      return result;

    } catch (error) {
      console.error('💥 DETECTION SERVICE - Critical error:', error);
      
      // CRÍTICO: Usar el servicio centralizado para el fallback
      const periodInfo = PeriodDisplayService.generatePeriodInfo(startDate, endDate);
      const fallbackName = periodInfo.semanticName || periodInfo.name;
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: `Error detectando período. Se creará: ${fallbackName}`,
        periodData: {
          startDate, // PRESERVAR fechas originales
          endDate,   // PRESERVAR fechas originales
          periodName: fallbackName,
          type: periodInfo.type
        }
      };
    }
  }

  static async detectCurrentPeriodSituation(): Promise<PeriodDetectionResult> {
    try {
      console.log('🔍 Detectando situación actual del período (modo legacy)...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Verificar si hay períodos activos (borrador o en proceso)
      const { data: activePeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error buscando períodos activos:', error);
        throw error;
      }

      // Si hay un período activo, continuamos con él
      if (activePeriods && activePeriods.length > 0) {
        const activePeriod = activePeriods[0];
        console.log('✅ Período activo encontrado:', activePeriod.periodo);
        
        return {
          hasActivePeriod: true,
          activePeriod,
          suggestedAction: 'continue',
          message: `Continuando con período activo: ${activePeriod.periodo}`,
          periodData: {
            startDate: activePeriod.fecha_inicio,
            endDate: activePeriod.fecha_fin,
            periodName: activePeriod.periodo,
            type: activePeriod.tipo_periodo as 'semanal' | 'quincenal' | 'mensual'
          }
        };
      }

      // Si no hay período activo, sugerir crear uno nuevo
      const today = new Date();
      const periodData = this.calculatePeriodDates(today, 'mensual');
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: 'No hay períodos activos. Crear nuevo período.',
        periodData
      };

    } catch (error) {
      console.error('💥 Error en detección de período legacy:', error);
      
      const today = new Date();
      const periodData = this.calculatePeriodDates(today, 'mensual');
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: 'Error detectando período. Se creará un nuevo período.',
        periodData
      };
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
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

  private static async getCompanyPeriodicity(companyId: string): Promise<'semanal' | 'quincenal' | 'mensual'> {
    try {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      return (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'mensual';
    } catch (error) {
      console.error('Error getting periodicity:', error);
      return 'mensual';
    }
  }

  static calculatePeriodDates(referenceDate: Date, periodicity: 'semanal' | 'quincenal' | 'mensual') {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    
    let startDate: Date;
    let endDate: Date;
    
    switch (periodicity) {
      case 'quincenal':
        if (day <= 15) {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month, 15);
        } else {
          startDate = new Date(year, month, 16);
          endDate = new Date(year, month + 1, 0);
        }
        break;
        
      case 'semanal':
        const dayOfWeek = referenceDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        startDate = new Date(referenceDate);
        startDate.setDate(referenceDate.getDate() + mondayOffset);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
        
      default: // mensual
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const periodName = PeriodDisplayService.generatePeriodName(startDateStr, endDateStr);
    
    return {
      startDate: startDateStr,
      endDate: endDateStr,
      periodName,
      type: periodicity
    };
  }

  static async getLastClosedPeriod(): Promise<any | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return null;

      const { data: lastPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .single();

      return lastPeriod;
    } catch (error) {
      console.error('Error getting last closed period:', error);
      return null;
    }
  }
}
