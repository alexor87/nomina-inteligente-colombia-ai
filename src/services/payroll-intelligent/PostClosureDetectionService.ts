
import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES } from '@/constants/payrollStates';
import { PeriodNameUnifiedService } from './PeriodNameUnifiedService';

export interface PostClosureResult {
  success: boolean;
  message: string;
  closedPeriod?: any;
  nextPeriodSuggestion?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  error?: string;
}

export class PostClosureDetectionService {
  private static verificationCache = new Map<string, any>();
  private static readonly VERIFICATION_TIMEOUT = 10000; // 10 segundos
  private static readonly MAX_RETRIES = 5;

  /**
   * MÉTODO PRINCIPAL: Verificar cierre y detectar siguiente período
   */
  static async verifyClosureAndDetectNext(
    expectedPeriodId: string,
    companyId: string
  ): Promise<PostClosureResult> {
    console.log('🔐 Iniciando verificación post-cierre...');
    console.log('📊 Período esperado:', expectedPeriodId);
    console.log('🏢 Empresa:', companyId);

    try {
      // Paso 1: Verificar que el período se cerró correctamente
      const closureVerification = await this.verifyPeriodClosure(expectedPeriodId);
      
      if (!closureVerification.success) {
        return {
          success: false,
          message: 'El período no se cerró correctamente',
          error: closureVerification.error
        };
      }

      console.log('✅ Cierre verificado correctamente');

      // Paso 2: Detectar siguiente período con retry robusto
      const nextPeriodDetection = await this.detectNextPeriodWithRetry(
        companyId,
        closureVerification.closedPeriod
      );

      return nextPeriodDetection;

    } catch (error) {
      console.error('💥 Error crítico en verificación post-cierre:', error);
      return {
        success: false,
        message: 'Error crítico en la verificación del cierre',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Verificar que el período se cerró correctamente
   */
  private static async verifyPeriodClosure(periodId: string): Promise<{
    success: boolean;
    closedPeriod?: any;
    error?: string;
  }> {
    console.log('🔍 Verificando cierre del período:', periodId);

    try {
      // Usar timeout para evitar esperas indefinidas
      const verificationPromise = this.performClosureVerification(periodId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en verificación')), this.VERIFICATION_TIMEOUT)
      );

      const result = await Promise.race([verificationPromise, timeoutPromise]);
      
      if (result && typeof result === 'object' && 'success' in result) {
        return result as { success: boolean; closedPeriod?: any; error?: string };
      }

      throw new Error('Resultado de verificación inválido');

    } catch (error) {
      console.error('❌ Error verificando cierre:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en verificación'
      };
    }
  }

  /**
   * Realizar la verificación real del cierre
   */
  private static async performClosureVerification(periodId: string): Promise<{
    success: boolean;
    closedPeriod?: any;
    error?: string;
  }> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      console.log(`🔄 Intento de verificación ${attempt}/${this.MAX_RETRIES}`);

      try {
        const { data: period, error } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('id', periodId)
          .single();

        if (error) {
          console.error('❌ Error consultando período:', error);
          
          if (attempt === this.MAX_RETRIES) {
            return { success: false, error: error.message };
          }
          
          await this.delay(1000 * attempt);
          continue;
        }

        if (!period) {
          console.error('❌ Período no encontrado:', periodId);
          return { success: false, error: 'Período no encontrado' };
        }

        console.log('📊 Estado del período:', period.estado);

        // Verificar que esté en estado cerrado
        if (period.estado === PAYROLL_STATES.CERRADO) {
          console.log('✅ Período verificado como cerrado');
          return { success: true, closedPeriod: period };
        }

        // Si no está cerrado pero es el último intento
        if (attempt === this.MAX_RETRIES) {
          return {
            success: false,
            error: `Período en estado '${period.estado}', esperado '${PAYROLL_STATES.CERRADO}'`
          };
        }

        // Esperar antes del siguiente intento
        console.log(`⏰ Esperando ${1000 * attempt}ms antes del siguiente intento...`);
        await this.delay(1000 * attempt);

      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
        }

        await this.delay(1000 * attempt);
      }
    }

    return { success: false, error: 'Máximo de intentos alcanzado' };
  }

  /**
   * Detectar siguiente período con retry mejorado
   */
  private static async detectNextPeriodWithRetry(
    companyId: string,
    closedPeriod: any
  ): Promise<PostClosureResult> {
    console.log('🔍 Detectando siguiente período disponible...');

    try {
      // Obtener configuración de periodicidad
      const periodicity = await this.getCompanyPeriodicity(companyId);
      
      // Generar fechas del siguiente período
      const nextPeriodDates = this.calculateNextPeriodDates(closedPeriod, periodicity);
      
      // Verificar si ya existe un período para esas fechas
      const existingPeriod = await this.checkExistingPeriod(companyId, nextPeriodDates);
      
      if (existingPeriod) {
        console.log('⚠️ Ya existe período para las fechas calculadas');
        
        // Buscar el siguiente disponible
        const nextAvailable = await this.findNextAvailablePeriod(companyId, periodicity);
        
        if (nextAvailable) {
          return {
            success: true,
            message: 'Siguiente período disponible detectado',
            closedPeriod,
            nextPeriodSuggestion: nextAvailable
          };
        }
      }

      // Generar nombre unificado para el período sugerido
      const periodName = PeriodNameUnifiedService.generateUnifiedPeriodName({
        startDate: nextPeriodDates.startDate,
        endDate: nextPeriodDates.endDate,
        periodicity: periodicity as any
      });

      return {
        success: true,
        message: `Siguiente período detectado: ${periodName}`,
        closedPeriod,
        nextPeriodSuggestion: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: periodicity
        }
      };

    } catch (error) {
      console.error('❌ Error detectando siguiente período:', error);
      return {
        success: false,
        message: 'Error detectando siguiente período',
        closedPeriod,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener periodicidad de la empresa
   */
  private static async getCompanyPeriodicity(companyId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data?.periodicity || 'mensual';
    } catch (error) {
      console.error('❌ Error obteniendo periodicidad:', error);
      return 'mensual';
    }
  }

  /**
   * Calcular fechas del siguiente período
   */
  private static calculateNextPeriodDates(
    closedPeriod: any,
    periodicity: string
  ): { startDate: string; endDate: string } {
    const lastEndDate = new Date(closedPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);

    let nextEndDate: Date;

    switch (periodicity) {
      case 'quincenal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 14);
        break;
      case 'semanal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 6);
        break;
      default: // mensual
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
        nextEndDate.setDate(nextEndDate.getDate() - 1);
    }

    return {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };
  }

  /**
   * Verificar si ya existe un período para las fechas dadas
   */
  private static async checkExistingPeriod(
    companyId: string,
    dates: { startDate: string; endDate: string }
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', dates.startDate)
        .eq('fecha_fin', dates.endDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error verificando período existente:', error);
      return null;
    }
  }

  /**
   * Encontrar siguiente período disponible
   */
  private static async findNextAvailablePeriod(
    companyId: string,
    periodicity: string
  ): Promise<{ startDate: string; endDate: string; type: string } | null> {
    // Implementar lógica para encontrar siguiente período disponible
    // Esta es una implementación simplificada
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    nextMonth.setDate(1);

    const endOfNextMonth = new Date(nextMonth);
    endOfNextMonth.setMonth(endOfNextMonth.getMonth() + 1);
    endOfNextMonth.setDate(0);

    return {
      startDate: nextMonth.toISOString().split('T')[0],
      endDate: endOfNextMonth.toISOString().split('T')[0],
      type: periodicity
    };
  }

  /**
   * Utilidad para delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpiar cache de verificaciones
   */
  static clearCache(): void {
    this.verificationCache.clear();
    console.log('🧹 Cache de verificaciones limpiado');
  }
}
