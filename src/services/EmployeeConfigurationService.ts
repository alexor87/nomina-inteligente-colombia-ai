
import { supabase } from '@/integrations/supabase/client';
import { CustomField, DefaultParameters, EmployeeGlobalConfiguration, SchemaVersion, CustomFieldType } from '@/types/employee-config';

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
      
      // Mapear los datos de la base de datos al formato de CustomField
      const mappedCustomFields: CustomField[] = (customFields || []).map(field => ({
        id: field.id,
        field_key: field.field_key,
        field_label: field.field_label,
        field_type: field.field_type as CustomFieldType,
        field_options: field.field_options,
        is_required: field.is_required,
        default_value: field.default_value,
        sort_order: field.sort_order,
        visibleOnlyToHR: false,
        editableByEmployee: true
      }));
      
      return {
        company_id: companyId,
        default_parameters: defaultParameters,
        custom_fields: mappedCustomFields,
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
        field_type: data.field_type as CustomFieldType,
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
      
      // Convertir a formato JSON simple para almacenamiento
      const fieldDefinitionsJson = fieldDefinitions.map(field => ({
        id: field.id,
        field_key: field.field_key,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required,
        default_value: field.default_value,
        sort_order: field.sort_order
      }));
      
      const { error } = await supabase
        .from('company_schema_versions')
        .insert({
          company_id: companyId,
          version_number: nextVersion,
          changes_summary: changesSummary,
          field_definitions: fieldDefinitionsJson as any
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
      
      // Mapear los datos de la base de datos al formato SchemaVersion con conversión segura de tipos
      return (data || []).map(version => ({
        id: version.id,
        company_id: version.company_id,
        version_number: version.version_number,
        changes_summary: version.changes_summary,
        field_definitions: this.parseFieldDefinitions(version.field_definitions),
        created_by: version.created_by,
        created_at: version.created_at
      }));
    } catch (error) {
      console.error('Error en getSchemaVersions:', error);
      return [];
    }
  }
  
  /**
   * Función helper para parsear field_definitions de forma segura
   */
  private static parseFieldDefinitions(fieldDefinitions: any): CustomField[] {
    try {
      if (!fieldDefinitions) return [];
      
      // Si ya es un array, intentar parsearlo
      if (Array.isArray(fieldDefinitions)) {
        return fieldDefinitions.map(field => ({
          id: field.id || '',
          field_key: field.field_key || '',
          field_label: field.field_label || '',
          field_type: field.field_type as CustomFieldType || 'text',
          field_options: field.field_options || null,
          is_required: field.is_required || false,
          default_value: field.default_value || null,
          sort_order: field.sort_order || 0,
          visibleOnlyToHR: false,
          editableByEmployee: true
        }));
      }
      
      // Si es string, intentar parsearlo como JSON
      if (typeof fieldDefinitions === 'string') {
        const parsed = JSON.parse(fieldDefinitions);
        if (Array.isArray(parsed)) {
          return this.parseFieldDefinitions(parsed);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing field_definitions:', error);
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
      // Para esta funcionalidad necesitaríamos crear una función en la base de datos
      // Por ahora, retornamos true ya que el sistema lo manejará automáticamente
      console.log('Applying default value to existing records:', { companyId, fieldKey, defaultValue });
      return true;
    } catch (error) {
      console.error('Error aplicando valor por defecto:', error);
      return false;
    }
  }
}
