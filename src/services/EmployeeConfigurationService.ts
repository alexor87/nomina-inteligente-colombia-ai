
import { supabase } from '@/integrations/supabase/client';
import { CustomField, DefaultParameters, EmployeeGlobalConfiguration, SchemaVersion } from '@/types/employee-config';

export class EmployeeConfigurationService {
  
  /**
   * Obtener configuración global de empleados para una empresa
   */
  static async getCompanyConfiguration(companyId: string): Promise<EmployeeGlobalConfiguration | null> {
    try {
      // Obtener campos personalizados activos
      const { data: customFields } = await supabase
        .rpc('get_company_active_field_definitions', { p_company_id: companyId });
      
      // Por ahora, usar parámetros por defecto básicos
      const defaultParameters: DefaultParameters = {
        defaultContractType: 'indefinido',
        standardWorkingHours: 8,
        suggestedPaymentPeriodicity: 'quincenal',
        suggestedCostCenter: 'Administración',
        defaultARLRiskLevel: '1'
      };
      
      return {
        company_id: companyId,
        default_parameters: defaultParameters,
        custom_fields: customFields || [],
        validation_rules: [], // Implementar después
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo configuración de empresa:', error);
      return null;
    }
  }
  
  /**
   * Crear o actualizar un campo personalizado
   */
  static async saveCustomField(companyId: string, field: Omit<CustomField, 'id'>): Promise<CustomField | null> {
    try {
      const { data, error } = await supabase
        .from('company_field_definitions')
        .insert({
          company_id: companyId,
          field_key: field.field_key,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options || null,
          is_required: field.is_required,
          default_value: field.default_value || null,
          sort_order: field.sort_order
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error guardando campo personalizado:', error);
        return null;
      }
      
      return {
        id: data.id,
        field_key: data.field_key,
        field_label: data.field_label,
        field_type: data.field_type,
        field_options: data.field_options,
        is_required: data.is_required,
        default_value: data.default_value,
        sort_order: data.sort_order,
        visibleOnlyToHR: false, // Por defecto
        editableByEmployee: true // Por defecto
      };
    } catch (error) {
      console.error('Error en saveCustomField:', error);
      return null;
    }
  }
  
  /**
   * Actualizar un campo personalizado existente
   */
  static async updateCustomField(fieldId: string, updates: Partial<CustomField>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('company_field_definitions')
        .update({
          field_label: updates.field_label,
          field_type: updates.field_type,
          field_options: updates.field_options,
          is_required: updates.is_required,
          default_value: updates.default_value,
          sort_order: updates.sort_order,
          is_active: updates.visibleOnlyToHR !== undefined ? !updates.visibleOnlyToHR : undefined
        })
        .eq('id', fieldId);
      
      return !error;
    } catch (error) {
      console.error('Error actualizando campo personalizado:', error);
      return false;
    }
  }
  
  /**
   * Eliminar un campo personalizado
   */
  static async deleteCustomField(fieldId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('company_field_definitions')
        .update({ is_active: false })
        .eq('id', fieldId);
      
      return !error;
    } catch (error) {
      console.error('Error eliminando campo personalizado:', error);
      return false;
    }
  }
  
  /**
   * Crear snapshot del esquema actual
   */
  static async createSchemaVersion(
    companyId: string, 
    changesSummary: string, 
    fieldDefinitions: CustomField[]
  ): Promise<boolean> {
    try {
      // Obtener el siguiente número de versión
      const { data: lastVersion } = await supabase
        .from('company_schema_versions')
        .select('version_number')
        .eq('company_id', companyId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextVersion = (lastVersion?.version_number || 0) + 1;
      
      const { error } = await supabase
        .from('company_schema_versions')
        .insert({
          company_id: companyId,
          version_number: nextVersion,
          changes_summary: changesSummary,
          field_definitions: fieldDefinitions
        });
      
      return !error;
    } catch (error) {
      console.error('Error creando versión de esquema:', error);
      return false;
    }
  }
  
  /**
   * Obtener historial de versiones del esquema
   */
  static async getSchemaVersions(companyId: string): Promise<SchemaVersion[]> {
    try {
      const { data, error } = await supabase
        .from('company_schema_versions')
        .select('*')
        .eq('company_id', companyId)
        .order('version_number', { ascending: false });
      
      if (error) {
        console.error('Error obteniendo versiones de esquema:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error en getSchemaVersions:', error);
      return [];
    }
  }
  
  /**
   * Aplicar valores por defecto a registros existentes cuando se agrega un nuevo campo
   */
  static async applyDefaultValueToExistingRecords(
    companyId: string, 
    fieldKey: string, 
    defaultValue: any
  ): Promise<boolean> {
    try {
      // Actualizar todos los empleados de la empresa que no tengan este campo
      const { error } = await supabase.rpc('apply_default_to_custom_fields', {
        p_company_id: companyId,
        p_field_key: fieldKey,
        p_default_value: defaultValue
      });
      
      return !error;
    } catch (error) {
      console.error('Error aplicando valor por defecto:', error);
      return false;
    }
  }
}
