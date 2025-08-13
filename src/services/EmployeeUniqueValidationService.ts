
import { supabase } from '@/integrations/supabase/client';

export class EmployeeUniqueValidationService {
  /**
   * Check if cedula is unique within the company
   */
  static async isCedulaUnique(cedula: string, companyId: string, excludeEmployeeId?: string): Promise<{ isUnique: boolean; existingEmployee?: any }> {
    try {
      console.log('🔍 Checking cedula uniqueness:', { cedula, companyId, excludeEmployeeId });

      let query = supabase
        .from('employees')
        .select('id, nombre, apellido, cedula')
        .eq('company_id', companyId)
        .eq('cedula', cedula)
        .neq('estado', 'eliminado'); // Exclude deleted employees

      // If updating an existing employee, exclude it from the check
      if (excludeEmployeeId) {
        query = query.neq('id', excludeEmployeeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error checking cedula uniqueness:', error);
        throw error;
      }

      const isUnique = !data || data.length === 0;
      const existingEmployee = data && data.length > 0 ? data[0] : undefined;

      console.log('✅ Cedula uniqueness check result:', { isUnique, existingEmployee });

      return { isUnique, existingEmployee };
    } catch (error) {
      console.error('❌ Exception in cedula uniqueness check:', error);
      throw error;
    }
  }

  /**
   * Validate that affiliation entities exist in master tables
   */
  static async validateAffiliationEntities(data: {
    eps?: string;
    afp?: string;
    arl?: string;
    cajaCompensacion?: string;
    tipoCotizanteId?: string;
    subtipoCotizanteId?: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate EPS
      if (data.eps) {
        const { data: epsData, error: epsError } = await supabase
          .from('eps_entities')
          .select('name')
          .eq('name', data.eps)
          .eq('status', 'active')
          .single();

        if (epsError || !epsData) {
          errors.push(`EPS "${data.eps}" no encontrada en el catálogo`);
        }
      }

      // Validate AFP
      if (data.afp) {
        const { data: afpData, error: afpError } = await supabase
          .from('afp_entities')
          .select('name')
          .eq('name', data.afp)
          .eq('status', 'active')
          .single();

        if (afpError || !afpData) {
          errors.push(`AFP "${data.afp}" no encontrada en el catálogo`);
        }
      }

      // Validate ARL
      if (data.arl) {
        const { data: arlData, error: arlError } = await supabase
          .from('arl_entities')
          .select('name')
          .eq('name', data.arl)
          .eq('status', 'active')
          .single();

        if (arlError || !arlData) {
          errors.push(`ARL "${data.arl}" no encontrada en el catálogo`);
        }
      }

      // Validate Compensation Fund
      if (data.cajaCompensacion) {
        const { data: fundData, error: fundError } = await supabase
          .from('compensation_funds')
          .select('name')
          .eq('name', data.cajaCompensacion)
          .eq('status', 'active')
          .single();

        if (fundError || !fundData) {
          errors.push(`Caja de compensación "${data.cajaCompensacion}" no encontrada en el catálogo`);
        }
      }

      // Validate Tipo Cotizante
      if (data.tipoCotizanteId) {
        const { data: tipoData, error: tipoError } = await supabase
          .from('tipos_cotizante')
          .select('id, nombre')
          .eq('id', data.tipoCotizanteId)
          .eq('activo', true)
          .single();

        if (tipoError || !tipoData) {
          errors.push(`Tipo de cotizante no encontrado en el catálogo`);
        }
      }

      // Validate Subtipo Cotizante
      if (data.subtipoCotizanteId && data.tipoCotizanteId) {
        const { data: subtipoData, error: subtipoError } = await supabase
          .from('subtipos_cotizante')
          .select('id, nombre')
          .eq('id', data.subtipoCotizanteId)
          .eq('tipo_cotizante_id', data.tipoCotizanteId)
          .eq('activo', true)
          .single();

        if (subtipoError || !subtipoData) {
          errors.push(`Subtipo de cotizante no válido para el tipo seleccionado`);
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      console.error('❌ Error validating affiliation entities:', error);
      errors.push('Error al validar entidades de afiliación');
      return { isValid: false, errors };
    }
  }
}
