
import { supabase } from '@/integrations/supabase/client';

export interface SmartPeriodDetection {
  success: boolean;
  current_date: string;
  periodicity: string;
  calculated_period: {
    start_date: string;
    end_date: string;
    period_name: string;
    type: string;
  };
  existing_period?: {
    id: string;
    periodo: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
  } | null;
  active_period?: {
    id: string;
    periodo: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
  } | null;
  action: 'resume' | 'create';
  message: string;
}

export class SmartPeriodDetectionService {
  
  /**
   * DETECCIÓN INTELIGENTE BASADA EN FECHA ACTUAL
   * Utiliza la función de base de datos para detectar correctamente el período
   */
  static async detectCurrentPeriod(): Promise<SmartPeriodDetection> {
    try {
      console.log('🎯 INICIANDO DETECCIÓN INTELIGENTE...');
      
      // Llamar a la función de base de datos que limpiamos y corregimos
      const { data, error } = await supabase.rpc('detect_current_smart_period');
      
      if (error) {
        console.error('❌ Error en función de detección:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No se recibieron datos de la función de detección');
      }
      
      // Cast the data to our interface with proper type checking
      const detection = data as unknown as SmartPeriodDetection;
      
      console.log('✅ DETECCIÓN COMPLETADA:', detection);
      console.log('📅 Período sugerido:', detection.calculated_period?.period_name);
      console.log('🎯 Acción recomendada:', detection.action);
      
      return detection;
      
    } catch (error) {
      console.error('💥 ERROR EN DETECCIÓN INTELIGENTE:', error);
      throw error;
    }
  }

  /**
   * CREAR PERÍODO AUTOMÁTICAMENTE
   * Crea el período basado en la detección inteligente
   */
  static async createPeriodFromDetection(detection: SmartPeriodDetection): Promise<any> {
    try {
      console.log('🆕 CREANDO PERÍODO AUTOMÁTICO...');
      
      const { calculated_period } = detection;
      
      // Get the current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');

      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: profile.company_id,
          fecha_inicio: calculated_period.start_date,
          fecha_fin: calculated_period.end_date,
          tipo_periodo: calculated_period.type,
          periodo: calculated_period.period_name,
          estado: 'borrador'
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ PERÍODO CREADO EXITOSAMENTE:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      throw error;
    }
  }

  /**
   * VALIDAR CONSISTENCIA DEL PERÍODO
   * Verifica que no existan duplicados o inconsistencias
   */
  static async validatePeriodConsistency(): Promise<boolean> {
    try {
      console.log('🔍 VALIDANDO CONSISTENCIA DE PERÍODOS...');
      
      // Obtener company_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return false;

      // Verificar duplicados
      const { data: periods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (!periods) return true;

      // Buscar duplicados por nombre
      const periodNames = periods.map(p => p.periodo);
      const duplicates = periodNames.filter((name, index) => periodNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICADOS ENCONTRADOS:', duplicates);
        return false;
      }
      
      console.log('✅ CONSISTENCIA VALIDADA');
      return true;
      
    } catch (error) {
      console.error('❌ Error validando consistencia:', error);
      return false;
    }
  }

  /**
   * LIMPIAR CACHE Y REINICIALIZAR
   * Útil para casos donde necesitamos empezar desde cero
   */
  static clearCache(): void {
    console.log('🗑️ CACHE LIMPIADO');
    // En el futuro podemos agregar limpieza de localStorage u otros caches
  }
}
