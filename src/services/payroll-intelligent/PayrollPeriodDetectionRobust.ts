import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_PAYROLL_STATES, ACTIVE_STATES, CLOSED_STATES, isValidPayrollState } from '@/constants/payrollStatesUnified';
import { PayrollDiagnosticService } from './PayrollDiagnosticService';
import { PeriodNameUnifiedService } from './PeriodNameUnifiedService';

export interface RobustPeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  action: 'resume' | 'create' | 'diagnose' | 'emergency';
  message: string;
  diagnostic?: any;
}

export class PayrollPeriodDetectionRobust {
  
  static async detectWithDiagnosis(): Promise<RobustPeriodStatus> {
    try {
      console.log('🔍 DETECCIÓN ROBUSTA CON DIAGNÓSTICO INICIADA...');
      
      // Paso 1: Obtener company ID
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('❌ No se encontró company_id');
        return this.createEmergencyResponse('No se encontró información de la empresa');
      }

      console.log('🏢 Company ID:', companyId);

      // Paso 2: Ejecutar diagnóstico completo
      const diagnostic = await PayrollDiagnosticService.generateCompleteDiagnostic(companyId);
      
      // Paso 3: Analizar diagnóstico y decidir acción
      return this.analyzeAndDecide(companyId, diagnostic);

    } catch (error) {
      console.error('💥 Error crítico en detección robusta:', error);
      return this.createEmergencyResponse('Error crítico en detección de período');
    }
  }

  private static async analyzeAndDecide(companyId: string, diagnostic: any): Promise<RobustPeriodStatus> {
    console.log('🧠 ANALIZANDO DIAGNÓSTICO...');
    
    // **CORRECCIÓN PROFESIONAL**: Detección y corrección automática de inconsistencias
    console.log('🤖 SISTEMA INTELIGENTE: Detectando inconsistencias de estado...');
    const correctionResult = await this.detectAndCorrectStateInconsistencies(companyId, diagnostic.periodsReal);
    
    // **CORRECCIÓN PROFESIONAL**: Si se hicieron correcciones, re-ejecutar diagnóstico
    let finalDiagnostic = diagnostic;
    if (correctionResult.correctionsMade > 0) {
      console.log('🔄 Re-ejecutando diagnóstico después de auto-correcciones...');
      finalDiagnostic = await PayrollDiagnosticService.generateCompleteDiagnostic(companyId);
    }
    
    // Análisis 1: ¿Hay período activo?
    const activePeriods = finalDiagnostic.periodsReal.filter((p: any) => 
      ACTIVE_STATES.includes(p.estado)
    );

    if (activePeriods.length === 1) {
      console.log('✅ Período activo único encontrado:', activePeriods[0].periodo);
      return {
        hasActivePeriod: true,
        currentPeriod: activePeriods[0],
        action: 'resume',
        message: `Continuando con período activo: ${activePeriods[0].periodo}`,
        diagnostic: finalDiagnostic
      };
    }

    if (activePeriods.length > 1) {
      console.log('⚠️ Múltiples períodos activos - requiere intervención');
      return {
        hasActivePeriod: false,
        action: 'diagnose',
        message: `Se encontraron ${activePeriods.length} períodos activos. Requiere revisión manual.`,
        diagnostic: finalDiagnostic
      };
    }

    // Análisis 2: ¿Hay períodos cerrados para calcular siguiente?
    const closedPeriods = finalDiagnostic.periodsReal.filter((p: any) => 
      CLOSED_STATES.includes(p.estado)
    ).sort((a: any, b: any) => new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime());

    if (closedPeriods.length > 0) {
      console.log('📅 Último período cerrado encontrado:', closedPeriods[0].periodo);
      
      // Intentar calcular siguiente período
      const nextPeriod = await this.calculateNextPeriod(companyId, closedPeriods[0]);
      
      if (nextPeriod) {
        return {
          hasActivePeriod: false,
          nextPeriod,
          action: 'create',
          message: `Crear siguiente período: ${nextPeriod.startDate} - ${nextPeriod.endDate}`,
          diagnostic: finalDiagnostic
        };
      }
    }

    // Análisis 3: No hay períodos - crear el primero
    if (finalDiagnostic.periodsReal.length === 0) {
      console.log('🆕 No hay períodos - crear el primero');
      
      const firstPeriod = await this.calculateFirstPeriod(companyId);
      
      return {
        hasActivePeriod: false,
        nextPeriod: firstPeriod,
        action: 'create',
        message: 'Crear primer período de nómina',
        diagnostic: finalDiagnostic
      };
    }

    // Fallback: Situación compleja requiere diagnóstico
    console.log('🔧 Situación compleja detectada');
    return {
      hasActivePeriod: false,
      action: 'diagnose',
      message: 'Situación compleja detectada. Revisar diagnóstico.',
      diagnostic: finalDiagnostic
    };
  }

  /**
   * 🤖 SISTEMA INTELIGENTE CORREGIDO: Detección automática de inconsistencias de estado
   * Detecta períodos en estado "borrador" que tienen nóminas ya procesadas
   */
  private static async detectAndCorrectStateInconsistencies(companyId: string, periods: any[]): Promise<{correctionsMade: number, errors: string[]}> {
    try {
      console.log('🔍 INTELIGENCIA: Iniciando detección de inconsistencias...');
      
      let correctionsMade = 0;
      const errors: string[] = [];
      
      // **CORRECCIÓN PROFESIONAL**: Filtrar períodos en estado borrador
      const draftPeriods = periods.filter(p => p.estado === 'borrador');
      
      if (draftPeriods.length === 0) {
        console.log('✅ INTELIGENCIA: No hay períodos en borrador para verificar');
        return { correctionsMade: 0, errors: [] };
      }

      console.log(`🔍 INTELIGENCIA: Verificando ${draftPeriods.length} período(s) en borrador...`);
      
      for (const period of draftPeriods) {
        try {
          console.log(`🔍 INTELIGENCIA: Analizando período "${period.periodo}"...`);
          
          // **CORRECCIÓN PROFESIONAL**: Verificar si tiene nóminas procesadas
          const { data: payrolls, error } = await supabase
            .from('payrolls')
            .select('id, estado, employee_id, total_devengado, total_deducciones, neto_pagado')
            .eq('company_id', companyId)
            .eq('period_id', period.id);

          if (error) {
            console.error(`❌ INTELIGENCIA: Error consultando nóminas para período ${period.periodo}:`, error);
            errors.push(`Error consultando nóminas para ${period.periodo}: ${error.message}`);
            continue;
          }

          if (!payrolls || payrolls.length === 0) {
            console.log(`ℹ️ INTELIGENCIA: Período "${period.periodo}" sin nóminas - Estado borrador correcto`);
            continue;
          }

          // **CORRECCIÓN PROFESIONAL**: Verificar estados de las nóminas
          const processedPayrolls = payrolls.filter(p => 
            p.estado === 'procesada' || p.estado === 'cerrada' || p.estado === 'pagada'
          );

          if (processedPayrolls.length > 0) {
            console.log(`🚨 INTELIGENCIA: INCONSISTENCIA DETECTADA en "${period.periodo}"`);
            console.log(`   - Estado del período: ${period.estado}`);
            console.log(`   - Nóminas procesadas: ${processedPayrolls.length}/${payrolls.length}`);
            
            // **CORRECCIÓN PROFESIONAL**: Auto-corrección inteligente
            const correctionSuccess = await this.silentStateCorrection(period, payrolls);
            if (correctionSuccess) {
              correctionsMade++;
            } else {
              errors.push(`Error corrigiendo período ${period.periodo}`);
            }
          } else {
            console.log(`✅ INTELIGENCIA: Período "${period.periodo}" consistente (borrador con nóminas borrador)`);
          }
        } catch (periodError) {
          console.error(`❌ INTELIGENCIA: Error procesando período ${period.periodo}:`, periodError);
          errors.push(`Error procesando período ${period.periodo}: ${periodError.message}`);
        }
      }
      
      console.log(`✅ INTELIGENCIA: Detección completada - ${correctionsMade} correcciones, ${errors.length} errores`);
      return { correctionsMade, errors };
      
    } catch (error) {
      console.error('❌ INTELIGENCIA: Error crítico en detección de inconsistencias:', error);
      return { correctionsMade: 0, errors: [`Error crítico: ${error.message}`] };
    }
  }

  /**
   * 🤖 SISTEMA INTELIGENTE CORREGIDO: Auto-corrección silenciosa de estados inconsistentes
   * Corrige automáticamente períodos con estados inconsistentes de manera transparente
   */
  private static async silentStateCorrection(period: any, payrolls: any[]): Promise<boolean> {
    try {
      console.log(`🔧 INTELIGENCIA: Iniciando auto-corrección silenciosa para "${period.periodo}"`);
      
      // **CORRECCIÓN PROFESIONAL**: Calcular totales directamente desde los payrolls pasados
      const validPayrolls = payrolls.filter(p => p.estado !== 'borrador');
      
      if (validPayrolls.length === 0) {
        console.log(`ℹ️ INTELIGENCIA: No hay nóminas válidas para corregir "${period.periodo}"`);
        return false;
      }

      // **CORRECCIÓN PROFESIONAL**: Calcular totales de manera robusta
      const totalDevengado = validPayrolls.reduce((sum, p) => sum + (Number(p.total_devengado) || 0), 0);
      const totalDeducciones = validPayrolls.reduce((sum, p) => sum + (Number(p.total_deducciones) || 0), 0);
      const totalNeto = validPayrolls.reduce((sum, p) => sum + (Number(p.neto_pagado) || 0), 0);

      console.log(`💰 INTELIGENCIA: Totales calculados para "${period.periodo}":`, {
        empleados: validPayrolls.length,
        totalDevengado,
        totalDeducciones,
        totalNeto
      });

      // **CORRECCIÓN PROFESIONAL**: Validar datos antes de actualizar
      if (totalDevengado < 0 || totalDeducciones < 0 || totalNeto < 0) {
        console.error(`❌ INTELIGENCIA: Datos inválidos para "${period.periodo}" - totales negativos`);
        return false;
      }

      // **CORRECCIÓN PROFESIONAL**: Transacción atómica para corrección de estado
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'cerrado',
          empleados_count: validPayrolls.length,
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (updateError) {
        console.error(`❌ INTELIGENCIA: Error en auto-corrección para "${period.periodo}":`, updateError);
        return false;
      }

      console.log(`✅ INTELIGENCIA: Auto-corrección completada exitosamente para "${period.periodo}"`);
      console.log(`   ├─ Estado: borrador → cerrado`);
      console.log(`   ├─ Empleados: ${validPayrolls.length}`);
      console.log(`   ├─ Total devengado: $${totalDevengado.toLocaleString()}`);
      console.log(`   ├─ Total deducciones: $${totalDeducciones.toLocaleString()}`);
      console.log(`   └─ Total neto: $${totalNeto.toLocaleString()}`);

      return true;
      
    } catch (error) {
      console.error(`💥 INTELIGENCIA: Error crítico en auto-corrección para "${period.periodo}":`, error);
      return false;
    }
  }

  private static async calculateNextPeriod(companyId: string, lastPeriod: any): Promise<{startDate: string; endDate: string; type: string} | null> {
    try {
      // Obtener configuración de empresa
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = settings?.periodicity || 'mensual';
      
      // Calcular siguiente período
      const lastEndDate = new Date(lastPeriod.fecha_fin);
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
        endDate: nextEndDate.toISOString().split('T')[0],
        type: periodicity
      };

    } catch (error) {
      console.error('❌ Error calculando siguiente período:', error);
      return null;
    }
  }

  private static async calculateFirstPeriod(companyId: string): Promise<{startDate: string; endDate: string; type: string}> {
    try {
      // Obtener configuración
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = settings?.periodicity || 'mensual';
      const today = new Date();
      
      let startDate: Date;
      let endDate: Date;

      switch (periodicity) {
        case 'mensual':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        
        case 'quincenal':
          const day = today.getDate();
          if (day <= 15) {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 15);
          } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 16);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          }
          break;
        
        case 'semanal':
          const dayOfWeek = today.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          startDate = new Date(today);
          startDate.setDate(today.getDate() + mondayOffset);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }

      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        type: periodicity
      };

    } catch (error) {
      console.error('❌ Error calculando primer período:', error);
      // Fallback a período mensual actual
      const today = new Date();
      return {
        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        type: 'mensual'
      };
    }
  }

  private static createEmergencyResponse(message: string): RobustPeriodStatus {
    return {
      hasActivePeriod: false,
      action: 'emergency',
      message,
      diagnostic: null
    };
  }

  static async createPeriodFromSuggestion(nextPeriod: {startDate: string; endDate: string; type: string}): Promise<any> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Generar nombre unificado
      const periodName = PeriodNameUnifiedService.generateUnifiedPeriodName({
        startDate: nextPeriod.startDate,
        endDate: nextPeriod.endDate,
        periodicity: nextPeriod.type as any
      });

      console.log('🆕 Creando período:', periodName);

      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: nextPeriod.startDate,
          fecha_fin: nextPeriod.endDate,
          tipo_periodo: nextPeriod.type,
          periodo: periodName,
          estado: UNIFIED_PAYROLL_STATES.BORRADOR
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Período creado exitosamente:', data);
      return data;

    } catch (error) {
      console.error('❌ Error creando período:', error);
      throw error;
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
}
