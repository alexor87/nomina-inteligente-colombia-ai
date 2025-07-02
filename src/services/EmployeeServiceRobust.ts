import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { EmployeeDataMapper } from './EmployeeDataMapper';
import { validateEmployeeData, ValidatedEmployeeData } from '@/schemas/employeeValidation';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export class EmployeeServiceRobust {
  /**
   * Creates a new employee with comprehensive validation and error handling
   */
  static async createEmployee(formData: any): Promise<ServiceResponse<Employee>> {
    console.log('🚀 EmployeeServiceRobust: Starting employee creation process');
    console.log('📝 Form data received:', formData);

    try {
      // Step 1: Get company ID
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          success: false,
          error: 'No se pudo obtener la empresa del usuario. Asegúrate de estar autenticado.'
        };
      }
      console.log('🏢 Company ID obtained:', companyId);

      // Step 2: Validate form data using Zod schema
      const validationResult = validateEmployeeData(formData);
      if (!validationResult.success) {
        console.error('❌ Form validation failed:', validationResult.errors);
        return {
          success: false,
          error: 'Datos del formulario inválidos',
          details: validationResult.errors
        };
      }

      const validatedData = validationResult.data!;
      console.log('✅ Form data validated successfully');

      // Step 3: Check for duplicate cedula
      const duplicateCheck = await this.checkDuplicateCedula(validatedData.cedula, companyId);
      if (!duplicateCheck.success) {
        return {
          success: false,
          error: duplicateCheck.error,
          details: duplicateCheck.details
        };
      }

      // Step 4: Map form data to database format
      const dbData = EmployeeDataMapper.mapFormToDatabase(validatedData, companyId);
      
      // Step 5: Final validation of mapped data
      const finalValidation = EmployeeDataMapper.validateRequiredFields(dbData);
      if (!finalValidation.isValid) {
        return {
          success: false,
          error: 'Validación final falló',
          details: finalValidation.errors
        };
      }

      // Step 6: Insert into database
      console.log('💾 Attempting to insert employee into database');
      const { data: insertedData, error: insertError } = await supabase
        .from('employees')
        .insert([dbData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Database insertion failed:', insertError);
        return this.handleDatabaseError(insertError);
      }

      if (!insertedData) {
        return {
          success: false,
          error: 'No se pudo crear el empleado - no se recibieron datos de respuesta'
        };
      }

      // Step 7: Map database response back to Employee format
      const createdEmployee = EmployeeDataMapper.mapDatabaseToEmployee(insertedData);
      
      console.log('✅ Employee created successfully:', createdEmployee.id);
      return {
        success: true,
        data: createdEmployee
      };

    } catch (error: any) {
      console.error('❌ Unexpected error during employee creation:', error);
      return {
        success: false,
        error: 'Error inesperado al crear el empleado',
        details: error.message
      };
    }
  }

  /**
   * Updates an existing employee
   */
  static async updateEmployee(employeeId: string, formData: any): Promise<ServiceResponse<Employee>> {
    console.log('🔄 EmployeeServiceRobust: Starting employee update process');
    console.log('📝 Employee ID:', employeeId);
    console.log('📝 Update data:', formData);

    try {
      // Step 1: Validate employee exists
      const existingEmployee = await this.getEmployeeById(employeeId);
      if (!existingEmployee.success || !existingEmployee.data) {
        return {
          success: false,
          error: 'Empleado no encontrado'
        };
      }

      // Step 2: Validate partial form data
      const validationResult = validateEmployeeData(formData);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Datos del formulario inválidos',
          details: validationResult.errors
        };
      }

      // Step 3: Get company ID
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          success: false,
          error: 'No se pudo obtener la empresa del usuario'
        };
      }

      // Step 4: Map update data
      const dbData = EmployeeDataMapper.mapFormToDatabase(validationResult.data!, companyId);
      
      // Step 5: Update in database
      const { data: updatedData, error: updateError } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', employeeId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Database update failed:', updateError);
        return this.handleDatabaseError(updateError);
      }

      if (!updatedData) {
        return {
          success: false,
          error: 'No se pudo actualizar el empleado'
        };
      }

      const updatedEmployee = EmployeeDataMapper.mapDatabaseToEmployee(updatedData);
      
      console.log('✅ Employee updated successfully:', updatedEmployee.id);
      return {
        success: true,
        data: updatedEmployee
      };

    } catch (error: any) {
      console.error('❌ Unexpected error during employee update:', error);
      return {
        success: false,
        error: 'Error inesperado al actualizar el empleado',
        details: error.message
      };
    }
  }

  /**
   * Gets an employee by ID
   */
  static async getEmployeeById(employeeId: string): Promise<ServiceResponse<Employee>> {
    try {
      console.log('🔍 EmployeeServiceRobust: Fetching employee by ID:', employeeId);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Empleado no encontrado'
          };
        }
        console.error('❌ Error fetching employee:', error);
        return this.handleDatabaseError(error);
      }

      if (!data) {
        return {
          success: false,
          error: 'Empleado no encontrado'
        };
      }

      const employee = EmployeeDataMapper.mapDatabaseToEmployee(data);
      console.log('✅ Employee fetched successfully:', employee.id);
      
      return {
        success: true,
        data: employee
      };

    } catch (error: any) {
      console.error('❌ Unexpected error fetching employee:', error);
      return {
        success: false,
        error: 'Error inesperado al obtener el empleado',
        details: error.message
      };
    }
  }

  /**
   * Check for duplicate cedula in the same company
   */
  private static async checkDuplicateCedula(cedula: string, companyId: string): Promise<ServiceResponse<boolean>> {
    console.log('🔍 Checking for duplicate cedula:', cedula);
    
    const { data: existingEmployee, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido')
      .eq('company_id', companyId)
      .eq('cedula', cedula)
      .maybeSingle();

    if (error) {
      console.error('❌ Error checking duplicate cedula:', error);
      return {
        success: false,
        error: 'Error verificando documento duplicado'
      };
    }

    if (existingEmployee) {
      return {
        success: false,
        error: `Ya existe un empleado con la cédula ${cedula}: ${existingEmployee.nombre} ${existingEmployee.apellido}`
      };
    }

    console.log('✅ No duplicate cedula found');
    return { success: true, data: true };
  }

  /**
   * Get current user's company ID
   */
  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_current_user_company_id');
      
      if (error) {
        console.error('❌ Error getting company ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Unexpected error getting company ID:', error);
      return null;
    }
  }

  /**
   * Handle database errors with user-friendly messages
   */
  private static handleDatabaseError(error: any): ServiceResponse<never> {
    console.error('🔍 Analyzing database error:', error);

    // Handle specific PostgreSQL error codes
    if (error.code === '23505') { // Unique constraint violation
      if (error.message.includes('employees_company_id_cedula_key')) {
        return {
          success: false,
          error: 'Ya existe un empleado con este número de documento en la empresa'
        };
      }
      return {
        success: false,
        error: 'Ya existe un registro con estos datos'
      };
    }

    if (error.code === '23503') { // Foreign key constraint violation
      return {
        success: false,
        error: 'Error de referencia en los datos. Verifica que todos los datos relacionados sean válidos.'
      };
    }

    if (error.code === '23514') { // Check constraint violation
      return {
        success: false,
        error: 'Los datos no cumplen con las restricciones de validación'
      };
    }

    // Handle Supabase-specific errors
    if (error.message?.includes('JWT')) {
      return {
        success: false,
        error: 'Sesión expirada. Por favor inicia sesión nuevamente.'
      };
    }

    if (error.message?.includes('permission')) {
      return {
        success: false,
        error: 'No tienes permisos para realizar esta operación'
      };
    }

    // Generic error
    return {
      success: false,
      error: `Error de base de datos: ${error.message || 'Error desconocido'}`,
      details: error
    };
  }
}
