import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriod } from '@/types/payroll';

export interface CompanySettings {
  id: string;
  company_id: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  created_at: string;
  updated_at: string;
}

export class PayrollPeriodService {
  // Obtener el company_id del usuario actual
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Getting company ID for user:', user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      console.log('Company ID found:', profile.company_id);
      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  // Obtener configuración de periodicidad de la empresa
  static async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('No company ID available for settings');
        return null;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.log('No company settings found, will use defaults');
        return null;
      }
      
      return data as CompanySettings;
    } catch (error) {
      console.error('Error getting company settings:', error);
      return null;
    }
  }

  // Generar rango de fechas según periodicidad
  static generatePeriodDates(periodicity: string, referenceDate: Date = new Date()): { startDate: string; endDate: string } {
    console.log('📅 Generando fechas para periodicidad:', periodicity);
    const today = new Date(referenceDate);
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    switch (periodicity) {
      case 'mensual':
        console.log('📅 Generando periodo mensual');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };

      case 'quincenal':
        console.log('📅 Generando periodo quincenal');
        if (day <= 15) {
          // Primera quincena del mes
          return {
            startDate: new Date(year, month, 1).toISOString().split('T')[0],
            endDate: new Date(year, month, 15).toISOString().split('T')[0]
          };
        } else {
          // Segunda quincena del mes
          return {
            startDate: new Date(year, month, 16).toISOString().split('T')[0],
            endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
          };
        }

      case 'semanal':
        console.log('📅 Generando periodo semanal');
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lunes = 1
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {
          startDate: monday.toISOString().split('T')[0],
          endDate: sunday.toISOString().split('T')[0]
        };

      case 'personalizado':
      default:
        console.log('📅 Periodicidad personalizada o no reconocida, usando mensual como fallback');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
    }
  }

  // Crear un nuevo período de nómina con validaciones completas
  static async createPayrollPeriod(startDate: string, endDate: string, periodType: string): Promise<PayrollPeriod | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('Cannot create payroll period: No company ID found');
        return null;
      }

      console.log('🚀 Creando nuevo período con validaciones completas:', { startDate, endDate, periodType });

      // Importar PayrollPeriodValidationService dinámicamente para evitar dependencias circulares
      const { PayrollPeriodValidationService } = await import('./payroll-intelligent/PayrollPeriodValidationService');
      
      // Ejecutar validaciones integrales
      const validation = await PayrollPeriodValidationService.validatePeriodCreation(
        startDate, 
        endDate, 
        companyId
      );

      if (!validation.isValid) {
        console.error('❌ Validación de período falló:', validation.errors);
        throw new Error(`No se puede crear el período: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Advertencias en creación de período:', validation.warnings);
      }

      // Generate period string (e.g., "2025-01")
      const startDateObj = new Date(startDate);
      const periodo = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: periodType,
          periodo: periodo,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error insertando período de nómina:', error);
        throw error;
      }
      
      console.log('✅ Período de nómina creado exitosamente:', data);
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error creando período de nómina:', error);
      return null;
    }
  }

  // Actualizar período de nómina usando payroll_periods_real
  static async updatePayrollPeriod(periodId: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) throw error;
      return data as PayrollPeriod;
    } catch (error) {
      console.error('Error updating payroll period:', error);
      return null;
    }
  }

  // Obtener período actual activo (borrador) usando payroll_periods_real
  static async getCurrentActivePeriod(): Promise<PayrollPeriod | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return null;

      console.log('🔍 Buscando período activo en payroll_periods_real para company:', companyId);

      // Buscar período activo en payroll_periods_real
      const { data: activePeriod, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error buscando período activo:', error);
        throw error;
      }

      // Si encontramos un período activo, devolverlo
      if (activePeriod) {
        console.log('✅ Período activo encontrado en payroll_periods_real:', activePeriod);
        return activePeriod as PayrollPeriod;
      }

      console.log('ℹ️ No se encontró período activo en payroll_periods_real');

      // Si no hay período activo, verificar si hay períodos reabiertos en payrolls
      const { data: reopenedPayrolls, error: reopenedError } = await supabase
        .from('payrolls')
        .select('periodo, reabierto_por, fecha_reapertura, created_at')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .not('reabierto_por', 'is', null)
        .order('fecha_reapertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reopenedError) {
        console.error('Error checking reopened periods:', reopenedError);
        return null;
      }

      // Si encontramos un período reabierto, crear el período correspondiente en payroll_periods_real
      if (reopenedPayrolls) {
        console.log('🔄 Período reabierto detectado, creando período en payroll_periods_real:', reopenedPayrolls.periodo);
        
        // Generar fechas basadas en el período
        const periodDate = new Date(reopenedPayrolls.periodo + '-01');
        const startDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
        const endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

        const { data: newPeriod, error: createError } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            fecha_inicio: startDate.toISOString().split('T')[0],
            fecha_fin: endDate.toISOString().split('T')[0],
            tipo_periodo: 'mensual',
            periodo: reopenedPayrolls.periodo,
            estado: 'borrador',
            empleados_count: 0,
            total_devengado: 0,
            total_deducciones: 0,
            total_neto: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating period for reopened payroll:', createError);
          return null;
        }

        console.log('✅ Período creado automáticamente en payroll_periods_real para período reabierto:', newPeriod);
        return newPeriod as PayrollPeriod;
      }

      return null;
    } catch (error) {
      console.error('Error getting current active period:', error);
      return null;
    }
  }

  // Formatear período para mostrar
  static formatPeriodText(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long'
    });
    
    const endFormatted = end.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `del ${startFormatted} al ${endFormatted}`;
  }

  // Validar si el período es válido
  static validatePeriod(startDate: string, endDate: string): { isValid: boolean; warnings: string[] } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const warnings: string[] = [];
    
    if (diffDays > 31) {
      warnings.push('El período supera 31 días');
    }
    
    if (diffDays < 1) {
      warnings.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  // Obtener un período específico por ID usando payroll_periods_real
  static async getPayrollPeriodById(periodId: string): Promise<PayrollPeriod | null> {
    try {
      console.log('🔍 Buscando período por ID en payroll_periods_real:', periodId);
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error obteniendo período por ID:', error);
        throw error;
      }

      if (!data) {
        console.log('ℹ️ Período no encontrado con ID:', periodId);
        return null;
      }

      console.log('✅ Período encontrado en payroll_periods_real:', data);
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error en getPayrollPeriodById:', error);
      return null;
    }
  }

  // Cerrar período con validaciones completas (Fase 3)
  static async closePeriod(periodId: string): Promise<{
    success: boolean;
    period?: PayrollPeriod;
    errors: string[];
    warnings: string[];
  }> {
    try {
      console.log('🔒 Iniciando cierre de período con validaciones:', periodId);

      // Importar PayrollPeriodValidationService dinámicamente
      const { PayrollPeriodValidationService } = await import('./payroll-intelligent/PayrollPeriodValidationService');
      
      // 1. Ejecutar validaciones de cierre
      const closureValidation = await PayrollPeriodValidationService.validatePeriodClosure(periodId);
      
      if (!closureValidation.canClose) {
        console.error('❌ No se puede cerrar el período:', closureValidation.errors);
        return {
          success: false,
          errors: closureValidation.errors,
          warnings: closureValidation.warnings
        };
      }

      // 2. Validar generación de comprobantes
      const voucherValidation = await PayrollPeriodValidationService.validateVouchersGeneration(periodId);
      
      if (!voucherValidation.isValid) {
        console.error('❌ Error en validación de comprobantes:', voucherValidation.errors);
        return {
          success: false,
          errors: voucherValidation.errors,
          warnings: voucherValidation.warnings
        };
      }

      console.log('✅ Validaciones de cierre exitosas, procediendo con el cierre');

      // 3. Generar comprobantes automáticamente si faltan algunos
      if (voucherValidation.voucherInfo && voucherValidation.voucherInfo.vouchersPending > 0) {
        console.log('📄 Generando comprobantes faltantes...');
        // Aquí se podría integrar con el servicio de generación de comprobantes
        // Por ahora solo logueamos la acción
        console.log(`📄 Se deberían generar ${voucherValidation.voucherInfo.vouchersPending} comprobantes`);
      }

      // 4. Actualizar estado del período a 'aprobado'
      const { data: updatedPeriod, error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'aprobado',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error actualizando estado del período:', updateError);
        return {
          success: false,
          errors: ['Error al actualizar el estado del período'],
          warnings: []
        };
      }

      console.log('✅ Período cerrado exitosamente:', updatedPeriod);

      return {
        success: true,
        period: updatedPeriod as PayrollPeriod,
        errors: [],
        warnings: [...closureValidation.warnings, ...voucherValidation.warnings]
      };

    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      return {
        success: false,
        errors: ['Error interno al cerrar el período'],
        warnings: []
      };
    }
  }

  // Reabrir período con validaciones
  static async reopenPeriod(periodId: string, userId: string): Promise<{
    success: boolean;
    period?: PayrollPeriod;
    errors: string[];
    warnings: string[];
  }> {
    try {
      console.log('🔓 Reabriendo período:', periodId);

      // 1. Verificar que el período existe y está cerrado
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return {
          success: false,
          errors: ['Período no encontrado'],
          warnings: []
        };
      }

      if (period.estado === 'borrador') {
        return {
          success: false,
          errors: ['El período ya está abierto'],
          warnings: []
        };
      }

      // 2. Verificar que no hay otro período abierto
      const { PayrollPeriodValidationService } = await import('./payroll-intelligent/PayrollPeriodValidationService');
      const openPeriodValidation = await PayrollPeriodValidationService.validateSingleOpenPeriod(period.company_id);
      
      if (!openPeriodValidation.isValid && openPeriodValidation.openPeriod) {
        return {
          success: false,
          errors: [`Ya existe un período abierto (${openPeriodValidation.openPeriod.fecha_inicio} - ${openPeriodValidation.openPeriod.fecha_fin}). Cierra ese período antes de reabrir otro.`],
          warnings: []
        };
      }

      // 3. Reabrir el período
      const { data: reopenedPeriod, error: reopenError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'borrador',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (reopenError) {
        console.error('❌ Error reabriendo período:', reopenError);
        return {
          success: false,
          errors: ['Error al reabrir el período'],
          warnings: []
        };
      }

      console.log('✅ Período reabierto exitosamente:', reopenedPeriod);

      return {
        success: true,
        period: reopenedPeriod as PayrollPeriod,
        errors: [],
        warnings: ['El período ha sido reabierto. Puedes realizar modificaciones y volver a cerrarlo cuando termines.']
      };

    } catch (error) {
      console.error('❌ Error reabriendo período:', error);
      return {
        success: false,
        errors: ['Error interno al reabrir el período'],
        warnings: []
      };
    }
  }
}
