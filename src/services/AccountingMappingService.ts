import { supabase } from '@/integrations/supabase/client';
import { SecureBaseService } from './SecureBaseService';

export interface AccountingMapping {
  id: string;
  company_id: string;
  concept: string;
  puc_account: string;
  puc_description: string;
  entry_type: 'debito' | 'credito';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Labels amigables para mostrar en la UI
export const conceptLabels: Record<string, string> = {
  'salario_basico': 'Salario Básico',
  'auxilio_transporte': 'Auxilio de Transporte',
  'horas_extra': 'Horas Extra',
  'recargos_nocturnos': 'Recargos Nocturnos',
  'bonificaciones': 'Bonificaciones',
  'comisiones': 'Comisiones',
  'incapacidades': 'Incapacidades',
  'licencias': 'Licencias Remuneradas',
  'salud_empleador': 'Salud Empleador',
  'pension_empleador': 'Pensión Empleador',
  'arl': 'ARL',
  'caja_compensacion': 'Caja de Compensación',
  'sena': 'SENA',
  'icbf': 'ICBF',
  'salud_empleado': 'Salud Empleado',
  'pension_empleado': 'Pensión Empleado',
  'fondo_solidaridad': 'Fondo Solidaridad',
  'retencion_fuente': 'Retención en la Fuente',
  'cesantias': 'Cesantías',
  'intereses_cesantias': 'Intereses Cesantías',
  'prima_servicios': 'Prima de Servicios',
  'vacaciones': 'Vacaciones',
  'neto_pagar': 'Neto a Pagar'
};

// Tooltips explicativos para cada concepto
export const conceptTooltips: Record<string, string> = {
  'salario_basico': 'Remuneración básica mensual del empleado',
  'auxilio_transporte': 'Subsidio legal de transporte para empleados que ganan hasta 2 SMMLV',
  'horas_extra': 'Horas trabajadas adicionales a la jornada ordinaria',
  'recargos_nocturnos': 'Recargo por trabajo nocturno (10pm - 6am)',
  'bonificaciones': 'Pagos adicionales no constitutivos de salario',
  'comisiones': 'Porcentaje sobre ventas o resultados',
  'incapacidades': 'Pagos durante ausencia por enfermedad',
  'licencias': 'Permisos remunerados (luto, maternidad, etc.)',
  'salud_empleador': 'Aporte patronal al sistema de salud (8.5%)',
  'pension_empleador': 'Aporte patronal al sistema pensional (12%)',
  'arl': 'Aporte a riesgos laborales según nivel de riesgo',
  'caja_compensacion': 'Aporte a caja de compensación familiar (4%)',
  'sena': 'Aporte al Servicio Nacional de Aprendizaje (2%)',
  'icbf': 'Aporte al Instituto Colombiano de Bienestar Familiar (3%)',
  'salud_empleado': 'Descuento al empleado para salud (4%)',
  'pension_empleado': 'Descuento al empleado para pensión (4%)',
  'fondo_solidaridad': 'Aporte solidario para salarios > 4 SMMLV',
  'retencion_fuente': 'Impuesto retenido según tabla de retención',
  'cesantias': 'Provisión mensual de cesantías (8.33%)',
  'intereses_cesantias': 'Intereses sobre cesantías (12% anual)',
  'prima_servicios': 'Provisión de prima semestral (8.33%)',
  'vacaciones': 'Provisión de vacaciones (4.17%)',
  'neto_pagar': 'Valor final a consignar al empleado'
};

export class AccountingMappingService extends SecureBaseService {
  
  /**
   * Obtiene todos los mapeos PUC de la empresa actual
   */
  static async getMappings(): Promise<AccountingMapping[]> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      console.warn('🔒 No company context for getMappings');
      return [];
    }

    const { data, error } = await supabase
      .from('accounting_account_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('concept');

    if (error) {
      console.error('Error fetching mappings:', error);
      throw error;
    }

    return (data || []) as AccountingMapping[];
  }

  /**
   * Actualiza un mapeo específico
   */
  static async updateMapping(
    id: string, 
    updates: Partial<Pick<AccountingMapping, 'puc_account' | 'puc_description' | 'is_active'>>
  ): Promise<AccountingMapping> {
    const { data, error } = await supabase
      .from('accounting_account_mappings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mapping:', error);
      throw error;
    }

    return data as AccountingMapping;
  }

  /**
   * Actualiza múltiples mapeos en batch
   */
  static async updateMappingsBatch(
    mappings: Array<{ id: string; puc_account: string; puc_description: string }>
  ): Promise<void> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) throw new Error('No company context');

    // Actualizar cada mapeo
    for (const mapping of mappings) {
      const { error } = await supabase
        .from('accounting_account_mappings')
        .update({
          puc_account: mapping.puc_account,
          puc_description: mapping.puc_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', mapping.id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error updating mapping:', mapping.id, error);
        throw error;
      }
    }
  }

  /**
   * Restaura los mapeos a valores por defecto usando la función SQL
   */
  static async restoreDefaults(): Promise<void> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) throw new Error('No company context');

    const { error } = await supabase.rpc('initialize_puc_mappings', {
      p_company_id: companyId
    });

    if (error) {
      console.error('Error restoring defaults:', error);
      throw error;
    }
  }

  /**
   * Inicializa los mapeos para una empresa nueva (si no existen)
   */
  static async initializeIfNeeded(): Promise<boolean> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return false;

    // Verificar si ya existen mapeos
    const { count, error: countError } = await supabase
      .from('accounting_account_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (countError) {
      console.error('Error checking mappings:', countError);
      return false;
    }

    // Si no hay mapeos, inicializar
    if (!count || count === 0) {
      await this.restoreDefaults();
      return true;
    }

    return false;
  }

  /**
   * Obtiene el mapeo para un concepto específico
   */
  static async getMappingByConcept(concept: string): Promise<AccountingMapping | null> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return null;

    const { data, error } = await supabase
      .from('accounting_account_mappings')
      .select('*')
      .eq('company_id', companyId)
      .eq('concept', concept)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      console.error('Error fetching mapping:', error);
      throw error;
    }

    return data as AccountingMapping;
  }

  /**
   * Valida el formato de una cuenta PUC
   */
  static validatePucAccount(account: string): boolean {
    // PUC colombiano: 4-10 dígitos numéricos
    return /^\d{4,10}$/.test(account);
  }
}
