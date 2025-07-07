
import { supabase } from '@/integrations/supabase/client';

export interface GeneratedPeriod {
  id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  numero_periodo_anual: number;
  etiqueta_visible: string;
  periodo: string; // Agregado: requerido por la base de datos
  estado: 'borrador' | 'en_proceso' | 'cerrado';
  company_id: string;
}

export interface AvailablePeriod extends GeneratedPeriod {
  can_select: boolean;
  reason?: string;
}

export class PeriodGenerationService {
  
  /**
   * Generar todos los períodos del año para una empresa
   */
  static async generateYearPeriods(
    companyId: string, 
    year: number = new Date().getFullYear(),
    periodicity: 'semanal' | 'quincenal' | 'mensual' = 'quincenal'
  ): Promise<GeneratedPeriod[]> {
    console.log(`🔧 Generando períodos ${periodicity} para año ${year}`);
    
    const periods: GeneratedPeriod[] = [];
    
    switch (periodicity) {
      case 'quincenal':
        periods.push(...this.generateBiWeeklyPeriods(companyId, year));
        break;
      case 'semanal':
        periods.push(...this.generateWeeklyPeriods(companyId, year));
        break;
      case 'mensual':
        periods.push(...this.generateMonthlyPeriods(companyId, year));
        break;
    }
    
    console.log(`✅ Generados ${periods.length} períodos ${periodicity}`);
    return periods;
  }
  
  /**
   * Generar períodos quincenales del año
   */
  private static generateBiWeeklyPeriods(companyId: string, year: number): GeneratedPeriod[] {
    const periods: GeneratedPeriod[] = [];
    let periodNumber = 1;
    
    for (let month = 0; month < 12; month++) {
      // Primera quincena (1-15)
      const firstStart = new Date(year, month, 1);
      const firstEnd = new Date(year, month, 15);
      const firstLabel = `Quincena ${periodNumber} - 1 al 15 de ${this.getMonthName(month)} ${year}`;
      
      periods.push({
        fecha_inicio: firstStart.toISOString().split('T')[0],
        fecha_fin: firstEnd.toISOString().split('T')[0],
        tipo_periodo: 'quincenal',
        numero_periodo_anual: periodNumber++,
        etiqueta_visible: firstLabel,
        periodo: firstLabel, // Agregado: campo requerido
        estado: 'borrador',
        company_id: companyId
      });
      
      // Segunda quincena (16-fin de mes)
      const secondStart = new Date(year, month, 16);
      const secondEnd = new Date(year, month + 1, 0); // Último día del mes
      const secondLabel = `Quincena ${periodNumber} - 16 al ${secondEnd.getDate()} de ${this.getMonthName(month)} ${year}`;
      
      periods.push({
        fecha_inicio: secondStart.toISOString().split('T')[0],
        fecha_fin: secondEnd.toISOString().split('T')[0],
        tipo_periodo: 'quincenal',
        numero_periodo_anual: periodNumber++,
        etiqueta_visible: secondLabel,
        periodo: secondLabel, // Agregado: campo requerido
        estado: 'borrador',
        company_id: companyId
      });
    }
    
    return periods;
  }
  
  /**
   * Generar períodos semanales del año
   */
  private static generateWeeklyPeriods(companyId: string, year: number): GeneratedPeriod[] {
    const periods: GeneratedPeriod[] = [];
    let periodNumber = 1;
    
    // Comenzar desde el primer lunes del año
    const startOfYear = new Date(year, 0, 1);
    let currentMonday = new Date(startOfYear);
    
    // Encontrar el primer lunes
    while (currentMonday.getDay() !== 1) {
      currentMonday.setDate(currentMonday.getDate() + 1);
    }
    
    while (currentMonday.getFullYear() === year) {
      const sunday = new Date(currentMonday);
      sunday.setDate(currentMonday.getDate() + 6);
      
      // Si el domingo está en el siguiente año, parar
      if (sunday.getFullYear() > year) break;
      
      const label = `Semana ${periodNumber} - ${currentMonday.getDate()} al ${sunday.getDate()} de ${this.getMonthName(currentMonday.getMonth())} ${year}`;
      
      periods.push({
        fecha_inicio: currentMonday.toISOString().split('T')[0],
        fecha_fin: sunday.toISOString().split('T')[0],
        tipo_periodo: 'semanal',
        numero_periodo_anual: periodNumber++,
        etiqueta_visible: label,
        periodo: label, // Agregado: campo requerido
        estado: 'borrador',
        company_id: companyId
      });
      
      // Avanzar a la siguiente semana
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    
    return periods;
  }
  
  /**
   * Generar períodos mensuales del año
   */
  private static generateMonthlyPeriods(companyId: string, year: number): GeneratedPeriod[] {
    const periods: GeneratedPeriod[] = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Último día del mes
      const label = `${this.getMonthName(month)} ${year}`;
      
      periods.push({
        fecha_inicio: startDate.toISOString().split('T')[0],
        fecha_fin: endDate.toISOString().split('T')[0],
        tipo_periodo: 'mensual',
        numero_periodo_anual: month + 1,
        etiqueta_visible: label,
        periodo: label, // Agregado: campo requerido
        estado: 'borrador',
        company_id: companyId
      });
    }
    
    return periods;
  }
  
  /**
   * Obtener períodos disponibles para liquidación
   */
  static async getAvailablePeriods(companyId: string, year: number = new Date().getFullYear()): Promise<AvailablePeriod[]> {
    try {
      // Obtener configuración de empresa
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();
      
      const periodicity = (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'quincenal';
      
      // Verificar si ya existen períodos generados para este año
      const { data: existingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`)
        .order('numero_periodo_anual');
      
      let availablePeriods: AvailablePeriod[];
      
      if (!existingPeriods || existingPeriods.length === 0) {
        // Generar períodos por primera vez
        console.log('🔧 Generando períodos por primera vez para', year);
        const generatedPeriods = await this.generateYearPeriods(companyId, year, periodicity);
        
        // Insertar en base de datos - Mapear correctamente las propiedades
        const periodsToInsert = generatedPeriods.map(period => ({
          company_id: period.company_id,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          tipo_periodo: period.tipo_periodo,
          numero_periodo_anual: period.numero_periodo_anual,
          periodo: period.periodo, // Corregido: usar periodo en lugar de etiqueta_visible
          estado: period.estado,
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        }));
        
        const { data: insertedPeriods, error } = await supabase
          .from('payroll_periods_real')
          .insert(periodsToInsert)
          .select();
        
        if (error) throw error;
        
        // Mapear correctamente a AvailablePeriod
        availablePeriods = (insertedPeriods || []).map(period => ({
          ...period,
          etiqueta_visible: period.periodo, // Mapear periodo a etiqueta_visible
          can_select: period.estado === 'borrador' || period.estado === 'en_proceso',
          reason: period.estado === 'cerrado' ? 'Período ya liquidado' : undefined
        }));
      } else {
        // Usar períodos existentes - Mapear correctamente a AvailablePeriod
        availablePeriods = existingPeriods.map(period => ({
          ...period,
          etiqueta_visible: period.periodo, // Mapear periodo a etiqueta_visible
          can_select: period.estado === 'borrador' || period.estado === 'en_proceso',
          reason: period.estado === 'cerrado' ? 'Período ya liquidado' : undefined
        }));
      }
      
      return availablePeriods;
    } catch (error) {
      console.error('Error obteniendo períodos disponibles:', error);
      return [];
    }
  }
  
  /**
   * Obtener siguiente período disponible
   */
  static async getNextAvailablePeriod(companyId: string): Promise<AvailablePeriod | null> {
    const periods = await this.getAvailablePeriods(companyId);
    const availablePeriods = periods.filter(p => p.can_select);
    
    if (availablePeriods.length === 0) return null;
    
    // Retorna el primer período disponible por número
    return availablePeriods.sort((a, b) => (a.numero_periodo_anual || 0) - (b.numero_periodo_anual || 0))[0];
  }
  
  /**
   * Marcar período como liquidado
   */
  static async markPeriodAsLiquidated(periodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
      
      return !error;
    } catch (error) {
      console.error('Error marcando período como liquidado:', error);
      return false;
    }
  }
  
  private static getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }
}
