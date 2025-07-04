
import { supabase } from '@/integrations/supabase/client';

export interface PeriodStatus {
  currentPeriod: any | null;
  needsCreation: boolean;
  canContinue: boolean;
  message: string;
  suggestion: string;
}

export class PayrollPeriodIntelligentService {
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🎯 DETECCIÓN CORREGIDA - FORZANDO PERÍODO ACTUAL JULIO 2025...');
      
      // Obtener company_id del usuario actual
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🏢 Company ID detectado:', companyId);

      // Obtener configuración de periodicidad
      const periodicity = await this.getUserConfiguredPeriodicity();
      console.log(`⚙️ Configuración obtenida: ${periodicity}`);

      // Generar el período actual basado en la fecha actual
      const currentPeriod = this.generateCurrentPeriodCorrected(periodicity);
      console.log('📊 PERÍODO ACTUAL REAL CALCULADO:', currentPeriod);

      // Buscar período existente por fechas exactas
      console.log(`🔍 Buscando período por fechas exactas: ${currentPeriod.startDate} - ${currentPeriod.endDate}`);
      
      const { data: existingPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', currentPeriod.startDate)
        .eq('fecha_fin', currentPeriod.endDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error buscando períodos:', error);
        throw error;
      }

      if (existingPeriods && existingPeriods.length > 0) {
        const period = existingPeriods[0];
        console.log(`✅ Período encontrado por fechas: ${period.periodo}`);

        if (period.estado === 'cerrado') {
          console.log('✅ Período actual correcto ya existe:', period.periodo);
          
          // ✅ FORZAR CONVERSIÓN A BORRADOR para permitir continuar trabajando
          console.log('🔄 Convirtiendo período a borrador...');
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ 
              estado: 'borrador',
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);

          if (updateError) {
            console.error('❌ Error actualizando estado:', updateError);
          }

          // Asegurar nombre correcto del período
          await this.ensureCorrectPeriodName(period.id, currentPeriod.startDate, currentPeriod.endDate);
          
          // Actualizar estado local
          period.estado = 'borrador';
        }

        return {
          currentPeriod: period,
          needsCreation: false,
          canContinue: true,
          message: `Continuando con período: ${period.periodo}`,
          suggestion: 'Período activo encontrado'
        };
      }

      // Si no existe, sugerir creación
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: `No existe período para ${currentPeriod.periodName}`,
        suggestion: `Crear período: ${currentPeriod.periodName}`
      };

    } catch (error) {
      console.error('💥 Error en detección de período:', error);
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: 'Error detectando período actual',
        suggestion: 'Revisar configuración'
      };
    }
  }

  // ✅ NUEVO MÉTODO: Crear siguiente período
  static async createNextPeriod(): Promise<{success: boolean, period?: any, message: string}> {
    try {
      console.log('🆕 Creando nuevo período...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return { success: false, message: 'No se pudo obtener la empresa' };
      }

      const periodicity = await this.getUserConfiguredPeriodicity();
      const currentPeriod = this.generateCurrentPeriodCorrected(periodicity);

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', currentPeriod.startDate)
        .eq('fecha_fin', currentPeriod.endDate);

      if (existing && existing.length > 0) {
        return {
          success: true,
          period: existing[0],
          message: `Período ${existing[0].periodo} ya existe`
        };
      }

      // Crear nuevo período
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: currentPeriod.periodName,
          fecha_inicio: currentPeriod.startDate,
          fecha_fin: currentPeriod.endDate,
          tipo_periodo: periodicity,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando período:', error);
        return { success: false, message: error.message };
      }

      console.log(`✅ Período creado: ${newPeriod.periodo}`);
      return {
        success: true,
        period: newPeriod,
        message: `Período ${newPeriod.periodo} creado exitosamente`
      };

    } catch (error) {
      console.error('❌ Error creando período:', error);
      return { success: false, message: `Error: ${error}` };
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

  private static async getUserConfiguredPeriodicity(): Promise<'quincenal' | 'mensual' | 'semanal'> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('⚠️ No se pudo obtener company_id, usando quincenal por defecto');
        return 'quincenal';
      }

      console.log('🏢 Company ID detectado:', companyId);
      console.log('⚙️ Verificando configuración de empresa...');

      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo configuración:', error);
        console.log('⚙️ Configuración no encontrada, asegurando quincenal...');
        
        // Crear configuración por defecto
        await supabase
          .from('company_settings')
          .upsert({
            company_id: companyId,
            periodicity: 'quincenal'
          }, {
            onConflict: 'company_id'
          });
        
        return 'quincenal';
      }

      const periodicity = settings?.periodicity || 'quincenal';
      console.log(`📊 Configuración obtenida: ${periodicity}`);
      console.log(`⚙️ Configuración asegurada - periodicidad: ${periodicity}`);

      return periodicity as 'quincenal' | 'mensual' | 'semanal';
    } catch (error) {
      console.error('❌ Error obteniendo periodicidad:', error);
      return 'quincenal';
    }
  }

  private static generateCurrentPeriodCorrected(periodicity: 'quincenal' | 'mensual' | 'semanal'): {
    startDate: string;
    endDate: string;
    periodName: string;
  } {
    console.log(`📅 GENERANDO PERÍODO ACTUAL CORREGIDO para periodicidad: ${periodicity}`);
    
    const today = new Date();
    
    switch (periodicity) {
      case 'quincenal':
        return this.generateQuincenalPeriodCorrected(today);
      case 'semanal':
        return this.generateSemanalPeriod(today);
      case 'mensual':
      default:
        return this.generateMensualPeriod(today);
    }
  }

  private static generateQuincenalPeriodCorrected(fecha: Date): {
    startDate: string;
    endDate: string;
    periodName: string;
  } {
    console.log('📅 GENERANDO PERÍODO QUINCENAL ACTUAL CORREGIDO');
    
    const day = fecha.getDate();
    const month = fecha.getMonth() + 1;
    const year = fecha.getFullYear();
    
    console.log('🔍 FECHA ACTUAL:', { day, month, year });
    
    let startDate: string;
    let endDate: string;
    let periodName: string;
    
    if (day <= 15) {
      // Primera quincena (1-15)
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      endDate = `${year}-${month.toString().padStart(2, '0')}-15`;
      console.log('✅ PRIMERA QUINCENA DETECTADA:', { startDate, endDate });
    } else {
      // Segunda quincena (16-fin de mes)
      const lastDay = new Date(year, month, 0).getDate();
      startDate = `${year}-${month.toString().padStart(2, '0')}-16`;
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      console.log('✅ SEGUNDA QUINCENA DETECTADA:', { startDate, endDate, lastDay });
    }
    
    periodName = this.generatePeriodName(startDate, endDate);
    
    console.log('✅ PERÍODO ACTUAL CORREGIDO GENERADO:', { startDate, endDate });
    
    return { startDate, endDate, periodName };
  }

  private static generateSemanalPeriod(fecha: Date): {
    startDate: string;
    endDate: string;
    periodName: string;
  } {
    const dayOfWeek = fecha.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(fecha);
    monday.setDate(fecha.getDate() + mondayOffset);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];
    const periodName = this.generatePeriodName(startDate, endDate);
    
    return { startDate, endDate, periodName };
  }

  private static generateMensualPeriod(fecha: Date): {
    startDate: string;
    endDate: string;
    periodName: string;
  } {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    const periodName = this.generatePeriodName(startDate, endDate);
    
    return { startDate, endDate, periodName };
  }

  private static generatePeriodName(startDate: string, endDate: string): string {
    console.log('🏷️ GENERANDO NOMBRE CORREGIDO DEFINITIVO:', { startDate, endDate });
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    const startDay = start.getDate();
    const startMonth = start.getMonth() + 1;
    const startYear = start.getFullYear();
    
    const endDay = end.getDate();
    const endMonth = end.getMonth() + 1;
    const endYear = end.getFullYear();
    
    console.log('📊 DATOS PARSEADOS CORRECTAMENTE:', {
      startYear, startMonth, startDay,
      endYear, endMonth, endDay,
      sameMonth: startMonth === endMonth,
      sameYear: startYear === endYear
    });
    
    const monthNames = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (startMonth === endMonth && startYear === endYear) {
      const monthName = monthNames[startMonth];
      const lastDayOfMonth = new Date(startYear, startMonth, 0).getDate();
      
      console.log(`📅 MISMO MES: ${monthName} ${startYear}, último día: ${lastDayOfMonth}`);
      
      if (startDay === 1 && endDay === 15) {
        const name = `1 - 15 ${monthName} ${startYear}`;
        console.log('✅ PRIMERA QUINCENA GENERADA:', name);
        return name;
      } else if (startDay === 16 && endDay === lastDayOfMonth) {
        const name = `16 - ${endDay} ${monthName} ${startYear}`;
        console.log('✅ SEGUNDA QUINCENA GENERADA:', name);
        return name;
      } else if (startDay === 1 && endDay === lastDayOfMonth) {
        const name = `${monthName} ${startYear}`;
        console.log('✅ MES COMPLETO GENERADO:', name);
        return name;
      }
    }
    
    // Para períodos que cruzan meses
    const name = `${startDay}/${startMonth} - ${endDay}/${endMonth}/${endYear}`;
    console.log('✅ PERÍODO CRUZADO GENERADO:', name);
    return name;
  }

  private static async ensureCorrectPeriodName(periodId: string, startDate: string, endDate: string): Promise<void> {
    console.log('🔧 FORZANDO CORRECCIÓN DE NOMBRE DEL PERÍODO:', periodId);
    
    const correctName = this.generatePeriodName(startDate, endDate);
    
    // Obtener nombre actual
    const { data: currentPeriod } = await supabase
      .from('payroll_periods_real')
      .select('periodo')
      .eq('id', periodId)
      .single();
    
    const currentName = currentPeriod?.periodo || '';
    
    console.log('📝 COMPARANDO NOMBRES:', `"${correctName}" vs "${currentName}"`);
    
    if (currentName !== correctName) {
      console.log('🔄 ACTUALIZANDO NOMBRE DEL PERÍODO...');
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          periodo: correctName,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
      
      if (error) {
        console.error('❌ Error actualizando nombre:', error);
      } else {
        console.log('✅ Nombre actualizado:', correctName);
      }
    } else {
      console.log('✅ Nombre ya es correcto:', correctName);
    }
  }
}
