
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';
import { mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';

interface EmployeeServiceResponse {
  success: boolean;
  employee?: EmployeeUnified;
  message?: string;
  error?: any;
}

export class EmployeeServiceRobust {
  
  /**
   * Crear un nuevo empleado con campos personalizados
   */
  static async createEmployee(employeeData: Partial<EmployeeUnified>): Promise<EmployeeServiceResponse> {
    try {
      console.log('🏢 EmployeeServiceRobust: Creating employee with data:', employeeData);

      // Separar custom_fields del resto de datos
      const { custom_fields, ...standardFields } = employeeData;

      // Preparar datos para inserción usando el mapper
      const dbData = mapUnifiedToDatabase({
        ...standardFields,
        custom_fields: custom_fields || {}
      } as EmployeeUnified);

      // Asegurar que campos requeridos estén presentes
      const dataToInsert = {
        ...dbData,
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

      // Preparar datos para actualización usando el mapper
      const dbData = mapUnifiedToDatabase({
        ...standardFields,
        custom_fields: custom_fields || {}
      } as EmployeeUnified);

      // Preparar datos para actualización
      const dataToUpdate = {
        ...dbData,
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
   * Aplicar valores por defecto a empleados existentes cuando se agrega un nuevo campo
   */
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
      const employeesToUpdate = employees?.filter(emp => 
        !emp.custom_fields || 
        emp.custom_fields[fieldKey] === null || 
        emp.custom_fields[fieldKey] === undefined
      ) || [];

      console.log(`📊 Found ${employeesToUpdate.length} employees to update`);

      // Actualizar cada empleado con el valor por defecto
      for (const employee of employeesToUpdate) {
        const updatedCustomFields = {
          ...(employee.custom_fields || {}),
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
