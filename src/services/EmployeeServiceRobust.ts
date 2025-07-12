
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';
import { mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';
import { EmployeeDataMapper } from './EmployeeDataMapper';

interface EmployeeServiceResponse {
  success: boolean;
  employee?: EmployeeUnified;
  message?: string;
  error?: any;
}

export class EmployeeServiceRobust {
  
  /**
   * Helper to clean data before database operations - KISS approach
   */
  private static cleanEmployeeData(employeeData: Partial<EmployeeUnified>): any {
    // Use EmployeeDataMapper for proper cleaning
    if (employeeData.empresaId || employeeData.company_id) {
      return EmployeeDataMapper.mapFormToDatabase(employeeData as any, employeeData.empresaId || employeeData.company_id!);
    }
    
    // Fallback for direct mapping
    return mapUnifiedToDatabase(employeeData as EmployeeUnified);
  }

  /**
   * Crear un nuevo empleado con campos personalizados
   */
  static async createEmployee(employeeData: Partial<EmployeeUnified>): Promise<EmployeeServiceResponse> {
    try {
      console.log('🏢 EmployeeServiceRobust: Creating employee with data:', employeeData);

      // Separar custom_fields del resto de datos
      const { custom_fields, ...standardFields } = employeeData;

      // KISS: Limpiar datos usando el mapper mejorado
      const cleanedData = this.cleanEmployeeData({
        ...standardFields,
        custom_fields: custom_fields || {}
      });

      // Asegurar que campos requeridos estén presentes
      const dataToInsert = {
        ...cleanedData,
        company_id: employeeData.empresaId || employeeData.company_id,
        cedula: employeeData.cedula || '',
        nombre: employeeData.nombre || '',
        apellido: employeeData.apellido || '',
        custom_fields: custom_fields || {}
      };

      console.log('📤 Inserting employee data:', dataToInsert);

      const { data, error } = await supabase
        .from('employees')
        .insert(dataToInsert)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      console.log('✅ Employee created successfully:', data.id);

      // Mapear datos de vuelta al formato esperado
      const createdEmployee = mapDatabaseToUnified(data);

      return {
        success: true,
        employee: createdEmployee,
        message: 'Empleado creado exitosamente'
      };

    } catch (error: any) {
      console.error('❌ Error creating employee:', error);
      return {
        success: false,
        message: error.message || 'Error creating employee',
        error
      };
    }
  }

  /**
   * Actualizar un empleado existente con campos personalizados
   */
  static async updateEmployee(employeeId: string, employeeData: Partial<EmployeeUnified>): Promise<EmployeeServiceResponse> {
    try {
      console.log('🔄 EmployeeServiceRobust: Updating employee:', employeeId);
      console.log('📝 Update data:', employeeData);

      // Separar custom_fields del resto de datos
      const { custom_fields, ...standardFields } = employeeData;

      // KISS: Limpiar datos usando el mapper mejorado
      const cleanedData = this.cleanEmployeeData({
        ...standardFields,
        custom_fields: custom_fields || {}
      });

      // Preparar datos para actualización
      const dataToUpdate = {
        ...cleanedData,
        company_id: employeeData.empresaId || employeeData.company_id,
        custom_fields: custom_fields || {},
        updated_at: new Date().toISOString()
      };

      // Remover campos que no deben actualizarse
      delete dataToUpdate.id;
      delete dataToUpdate.created_at;

      console.log('📤 Updating employee data:', dataToUpdate);

      const { data, error } = await supabase
        .from('employees')
        .update(dataToUpdate)
        .eq('id', employeeId)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      console.log('✅ Employee updated successfully:', data.id);

      // Mapear datos de vuelta al formato esperado
      const updatedEmployee = mapDatabaseToUnified(data);

      return {
        success: true,
        employee: updatedEmployee,
        message: 'Empleado actualizado exitosamente'
      };

    } catch (error: any) {
      console.error('❌ Error updating employee:', error);
      return {
        success: false,
        message: error.message || 'Error updating employee',
        error
      };
    }
  }

  /**
   * Obtener un empleado por ID
   */
  static async getEmployeeById(employeeId: string): Promise<EmployeeUnified | null> {
    try {
      console.log('🔍 EmployeeServiceRobust: Getting employee by ID:', employeeId);

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Mapear datos al formato esperado
      const employee = mapDatabaseToUnified(data);

      console.log('✅ Employee found:', employee.id);
      return employee;

    } catch (error: any) {
      console.error('❌ Error getting employee:', error);
      return null;
    }
  }

  /**
   * Helper function to safely get custom fields as object
   */
  private static getCustomFieldsAsObject(customFields: any): Record<string, any> {
    if (!customFields) return {};
    if (typeof customFields === 'object' && !Array.isArray(customFields) && customFields !== null) {
      return customFields as Record<string, any>;
    }
    return {};
  }

  static async applyDefaultValuesToExistingEmployees(
    companyId: string, 
    fieldKey: string, 
    defaultValue: any
  ): Promise<boolean> {
    try {
      console.log(`🔄 Applying default value for field ${fieldKey} to existing employees`);

      // Obtener empleados que no tienen este campo personalizado
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, custom_fields')
        .eq('company_id', companyId);

      if (fetchError) {
        console.error('❌ Error fetching employees:', fetchError);
        return false;
      }

      // Filtrar empleados que no tienen el campo o tienen valor null/undefined
      const employeesToUpdate = employees?.filter(emp => {
        const customFields = this.getCustomFieldsAsObject(emp.custom_fields);
        return customFields[fieldKey] === null || 
               customFields[fieldKey] === undefined || 
               !(fieldKey in customFields);
      }) || [];

      console.log(`📊 Found ${employeesToUpdate.length} employees to update`);

      // Actualizar cada empleado con el valor por defecto
      for (const employee of employeesToUpdate) {
        const currentCustomFields = this.getCustomFieldsAsObject(employee.custom_fields);
        const updatedCustomFields = {
          ...currentCustomFields,
          [fieldKey]: defaultValue
        };

        const { error: updateError } = await supabase
          .from('employees')
          .update({ custom_fields: updatedCustomFields })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`❌ Error updating employee ${employee.id}:`, updateError);
        }
      }

      console.log('✅ Default values applied successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Error applying default values:', error);
      return false;
    }
  }
}
