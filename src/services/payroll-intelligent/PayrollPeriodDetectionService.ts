
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';

export interface PeriodDetectionResult {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'wait';
  message: string;
  periodData?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
}

export class PayrollPeriodDetectionService {
  
  static async detectCurrentPeriodSituation(): Promise<PeriodDetectionResult> {
    try {
      console.log('🔍 Iniciando detección de período actual...');
      
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
          message: `Continuando con período activo: ${activePeriod.periodo}`
        };
      }

      // Si no hay período activo, verificar el histórico para sugerir el siguiente
      console.log('📊 No hay período activo, consultando historial...');
      
      const historicalPeriods = await PayrollHistoryService.getHistoryPeriods();
      
      if (historicalPeriods.length === 0) {
        // Primera vez - crear período inicial
        const suggestedPeriod = await this.generateSuggestedPeriod(companyId);
        
        return {
          hasActivePeriod: false,
          suggestedAction: 'create',
          message: 'No hay períodos creados. Crear el primer período.',
          periodData: suggestedPeriod
        };
      }

      // Determinar el siguiente período basado en el último cerrado
      const lastPeriod = historicalPeriods
        .filter(p => p.status === 'cerrado')
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

      if (!lastPeriod) {
        // Hay períodos pero ninguno cerrado - situación anómala
        const suggestedPeriod = await this.generateSuggestedPeriod(companyId);
        
        return {
          hasActivePeriod: false,
          suggestedAction: 'create',
          message: 'Períodos encontrados pero ninguno cerrado. Crear nuevo período.',
          periodData: suggestedPeriod
        };
      }

      // Generar el siguiente período después del último cerrado
      const nextPeriod = await this.generateNextPeriod(lastPeriod, companyId);
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: `Crear siguiente período después de: ${lastPeriod.period}`,
        periodData: nextPeriod
      };

    } catch (error) {
      console.error('💥 Error en detección de período:', error);
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'wait',
        message: 'Error detectando período. Revisa la configuración.'
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

  private static async generateSuggestedPeriod(companyId: string) {
    const periodicity = await this.getCompanyPeriodicity(companyId);
    const today = new Date();
    
    return this.calculatePeriodDates(today, periodicity);
  }

  private static async generateNextPeriod(lastPeriod: any, companyId: string) {
    const periodicity = await this.getCompanyPeriodicity(companyId);
    const lastEndDate = new Date(lastPeriod.endDate);
    
    // El siguiente período comienza el día después del último
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    return this.calculatePeriodDates(nextStartDate, periodicity);
  }

  private static calculatePeriodDates(referenceDate: Date, periodicity: 'semanal' | 'quincenal' | 'mensual') {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    
    let startDate: Date;
    let endDate: Date;
    let periodName: string;
    
    switch (periodicity) {
      case 'quincenal':
        if (day <= 15) {
          // Primera quincena
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month, 15);
          periodName = `1 - 15 ${this.getMonthName(month)} ${year}`;
        } else {
          // Segunda quincena
          startDate = new Date(year, month, 16);
          endDate = new Date(year, month + 1, 0); // Último día del mes
          periodName = `16 - ${endDate.getDate()} ${this.getMonthName(month)} ${year}`;
        }
        break;
        
      case 'semanal':
        // Lunes a domingo
        const dayOfWeek = referenceDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        startDate = new Date(referenceDate);
        startDate.setDate(referenceDate.getDate() + mondayOffset);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        periodName = `Semana ${startDate.getDate()}-${endDate.getDate()} ${this.getMonthName(startDate.getMonth())} ${year}`;
        break;
        
      default: // mensual
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        periodName = `${this.getMonthName(month)} ${year}`;
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodName,
      type: periodicity
    };
  }

  private static getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  // Método público para usar en otros servicios
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
