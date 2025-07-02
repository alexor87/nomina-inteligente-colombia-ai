import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';
import { PayrollPeriod } from '@/types/payroll';

export class PayrollPeriodValidationService {
  // Validar que solo haya un período abierto por empresa
  static async validateSingleOpenPeriod(companyId?: string): Promise<{ 
    isValid: boolean; 
    openPeriod?: PayrollPeriod;
    message?: string; 
  }> {
    try {
      const currentCompanyId = companyId || await PayrollPeriodService.getCurrentUserCompanyId();
      if (!currentCompanyId) return { isValid: false, message: 'No se encontró información de la empresa' };

      console.log('🔍 Validando período único abierto para empresa:', currentCompanyId);

      // Buscar períodos en estado borrador o reabierto en payroll_periods_real
      const { data: openPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', currentCompanyId)
        .eq('estado', 'borrador');

      if (error) {
        console.error('❌ Error consultando períodos abiertos:', error);
        throw error;
      }

      console.log('📊 Períodos abiertos encontrados:', openPeriods?.length || 0);

      if (!openPeriods || openPeriods.length === 0) {
        console.log('✅ No hay períodos abiertos, validación exitosa');
        return { isValid: true };
      }

      if (openPeriods.length === 1) {
        console.log('✅ Un período abierto encontrado, validación exitosa');
        return { 
          isValid: true, 
          openPeriod: openPeriods[0] as PayrollPeriod 
        };
      }

      // Más de un período abierto - esto no debería pasar
      console.log('⚠️ Múltiples períodos abiertos detectados:', openPeriods.length);
      return {
        isValid: false,
        openPeriod: openPeriods[0] as PayrollPeriod,
        message: `Se encontraron ${openPeriods.length} períodos abiertos. Solo se permite un período abierto por empresa.`
      };

    } catch (error) {
      console.error('❌ Error validando período único abierto:', error);
      return { isValid: false, message: 'Error al validar períodos abiertos' };
    }
  }

  // Validar regla de múltiples períodos pasados pero solo 1 futuro
  static async validateFuturePeriodLimit(
    startDate: string, 
    endDate: string, 
    companyId?: string,
    excludePeriodId?: string
  ): Promise<{ 
    isValid: boolean; 
    futurePeriods?: PayrollPeriod[];
    message?: string; 
  }> {
    try {
      const currentCompanyId = companyId || await PayrollPeriodService.getCurrentUserCompanyId();
      if (!currentCompanyId) return { isValid: false, message: 'No se encontró información de la empresa' };

      console.log('🔍 Validando límite de períodos futuros para empresa:', currentCompanyId);
      console.log('📅 Período a validar:', { startDate, endDate, excludePeriodId });

      const today = new Date().toISOString().split('T')[0];
      const newPeriodStart = new Date(startDate);
      const todayDate = new Date(today);

      // Verificar si el nuevo período es futuro
      const isNewPeriodFuture = newPeriodStart > todayDate;

      if (!isNewPeriodFuture) {
        console.log('✅ Período no es futuro, validación exitosa');
        return { isValid: true };
      }

      // Buscar períodos futuros existentes
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', currentCompanyId)
        .gt('fecha_inicio', today)
        .neq('estado', 'cancelado');

      if (error) {
        console.error('❌ Error consultando períodos futuros:', error);
        throw error;
      }

      console.log('📊 Períodos futuros encontrados:', periods?.length || 0);

      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos futuros, validación exitosa');
        return { isValid: true };
      }

      // Filtrar período excluido si se especifica
      const periodsToCheck = excludePeriodId 
        ? periods.filter(p => p.id !== excludePeriodId)
        : periods;

      console.log('📋 Períodos futuros a verificar después de filtros:', periodsToCheck.length);

      if (periodsToCheck.length === 0) {
        console.log('✅ No hay períodos futuros después de filtrar exclusiones, validación exitosa');
        return { isValid: true };
      }

      if (periodsToCheck.length >= 1) {
        console.log('⚠️ Ya existe un período futuro, se alcanzó el límite');
        return {
          isValid: false,
          futurePeriods: periodsToCheck as PayrollPeriod[],
          message: `Ya existe un período futuro (${periodsToCheck[0].fecha_inicio} - ${periodsToCheck[0].fecha_fin}). Solo se permite un período futuro por empresa.`
        };
      }

      return { isValid: true };

    } catch (error) {
      console.error('❌ Error validando límite de períodos futuros:', error);
      return { isValid: false, message: 'Error al validar períodos futuros' };
    }
  }
  // Validar que no haya periodos superpuestos - VERSIÓN MEJORADA Y COMPLETA
  static async validateNonOverlappingPeriod(
    startDate: string, 
    endDate: string, 
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; conflictPeriod?: PayrollPeriod; message?: string }> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return { isValid: false, message: 'No se encontró información de la empresa' };

      console.log('🔍 Validando superposición de períodos para empresa:', companyId);
      console.log('📅 Período a validar:', { startDate, endDate, excludePeriodId });

      // Obtener todos los períodos activos de la empresa desde payroll_periods_real
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .neq('estado', 'cancelado'); // Excluir períodos cancelados

      if (error) {
        console.error('❌ Error consultando períodos:', error);
        throw error;
      }

      console.log('📊 Períodos encontrados:', periods?.length || 0);

      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos existentes, validación exitosa');
        return { isValid: true };
      }

      // Filtrar período excluido si se especifica
      const periodsToCheck = excludePeriodId 
        ? periods.filter(p => p.id !== excludePeriodId)
        : periods;

      console.log('📋 Períodos a verificar después de filtros:', periodsToCheck.length);

      // Verificar superposición con cada período
      const newStart = new Date(startDate).getTime();
      const newEnd = new Date(endDate).getTime();

      for (const period of periodsToCheck) {
        const periodStart = new Date(period.fecha_inicio).getTime();
        const periodEnd = new Date(period.fecha_fin).getTime();
        
        // Verificar si hay superposición:
        // Hay superposición si el nuevo período empieza antes de que termine el existente
        // Y termina después de que empiece el existente
        const overlaps = newStart <= periodEnd && newEnd >= periodStart;
        
        if (overlaps) {
          console.log('⚠️ Superposición detectada:', {
            periodoExistente: {
              id: period.id,
              inicio: period.fecha_inicio,
              fin: period.fecha_fin,
              estado: period.estado
            },
            periodoNuevo: { inicio: startDate, fin: endDate }
          });
          
          return { 
            isValid: false, 
            conflictPeriod: period as PayrollPeriod,
            message: `El período se superpone con el período existente ${period.fecha_inicio} - ${period.fecha_fin}`
          };
        }
      }

      console.log('✅ No se detectaron superposiciones');
      return { isValid: true };
      
    } catch (error) {
      console.error('❌ Error validando superposición de periodos:', error);
      return { isValid: false, message: 'Error al validar superposición de períodos' };
    }
  }

  // Validación integral que combina todas las reglas
  static async validatePeriodCreation(
    startDate: string,
    endDate: string,
    companyId?: string,
    excludePeriodId?: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    canCreateNew: boolean;
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      console.log('🔍 Validación integral de creación de período');

      // 1. Validar un solo período abierto
      const openPeriodValidation = await this.validateSingleOpenPeriod(companyId);
      if (!openPeriodValidation.isValid && openPeriodValidation.message) {
        errors.push(openPeriodValidation.message);
      }

      // 2. Validar límite de períodos futuros
      const futurePeriodValidation = await this.validateFuturePeriodLimit(startDate, endDate, companyId, excludePeriodId);
      if (!futurePeriodValidation.isValid && futurePeriodValidation.message) {
        errors.push(futurePeriodValidation.message);
      }

      // 3. Validar superposición
      const overlapValidation = await this.validateNonOverlappingPeriod(startDate, endDate, excludePeriodId);
      if (!overlapValidation.isValid && overlapValidation.message) {
        errors.push(overlapValidation.message);
      }

      // 4. Validar fechas del período
      const periodValidation = PayrollPeriodService.validatePeriod(startDate, endDate);
      if (!periodValidation.isValid) {
        errors.push(...periodValidation.warnings);
      } else if (periodValidation.warnings.length > 0) {
        warnings.push(...periodValidation.warnings);
      }

      const isValid = errors.length === 0;
      const canCreateNew = isValid;

      console.log('📊 Resultado de validación integral:', {
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        canCreateNew
      });

      return {
        isValid,
        errors,
        warnings,
        canCreateNew
      };

    } catch (error) {
      console.error('❌ Error en validación integral:', error);
      return {
        isValid: false,
        errors: ['Error interno durante la validación'],
        warnings: [],
        canCreateNew: false
      };
    }
  }
}
