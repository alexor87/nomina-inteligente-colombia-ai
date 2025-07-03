
import { supabase } from '@/integrations/supabase/client';

/**
 * Servicio especializado SOLO en corrección de nombres de períodos
 * NO modifica fechas, solo normaliza nombres
 */
export class PeriodNameCorrectionService {
  
  /**
   * Corregir SOLO los nombres de períodos sin tocar fechas
   */
  static async correctPeriodNamesOnly(companyId: string): Promise<{
    corrected: number;
    errors: string[];
    summary: string;
  }> {
    console.log('🏷️ CORRECCIÓN SOLO DE NOMBRES para empresa:', companyId);
    
    let corrected = 0;
    const errors: string[] = [];

    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        return { 
          corrected: 0, 
          errors: [], 
          summary: 'No hay períodos para corregir nombres'
        };
      }

      console.log(`📝 Corrigiendo nombres de ${periods.length} períodos (SIN tocar fechas)`);

      for (const period of periods) {
        // Generar nombre correcto basado en las fechas EXISTENTES
        const correctName = this.generateCorrectPeriodName(
          period.fecha_inicio,
          period.fecha_fin
        );

        // Solo actualizar si el nombre es diferente
        if (correctName !== period.periodo) {
          console.log(`📝 NOMBRE: "${period.periodo}" → "${correctName}"`);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ 
              periodo: correctName,
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);

          if (updateError) {
            const errorMsg = `Error corrigiendo nombre del período ${period.id}: ${updateError.message}`;
            console.error('❌', errorMsg);
            errors.push(errorMsg);
          } else {
            console.log(`✅ Nombre corregido para período ${period.id}`);
            corrected++;
          }
        } else {
          console.log(`✅ Nombre ya correcto: "${period.periodo}"`);
        }
      }

      const summary = `✅ Corrección de nombres completada: ${corrected} nombres corregidos, ${errors.length} errores`;
      console.log(summary);
      
      return { corrected, errors, summary };

    } catch (error) {
      console.error('❌ Error en corrección de nombres:', error);
      return {
        corrected: 0,
        errors: [`Error general: ${error.message}`],
        summary: '❌ Error en corrección de nombres'
      };
    }
  }

  /**
   * Generar nombre correcto basado en fechas existentes
   */
  private static generateCorrectPeriodName(startDate: string, endDate: string): string {
    const { getPeriodNameFromDates } = require('@/utils/periodDateUtils');
    return getPeriodNameFromDates(startDate, endDate);
  }
}
