
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { EmployeeDataService } from './EmployeeDataService';
import { EmployeeValidationService } from './EmployeeValidationService';

interface EmployeeDataWithBanking extends Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  segundoNombre?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
}

export class EmployeeCRUDService {
  static async create(employeeData: EmployeeDataWithBanking) {
    console.log('🚀 EmployeeCRUDService.create called with:', employeeData);
    
    // Obtener la empresa del usuario autenticado
    const companyId = await EmployeeDataService.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se encontró la empresa del usuario. Asegúrate de estar autenticado.');
    }

    // Verificar si ya existe un empleado con la misma cédula en la empresa
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, cedula, nombre, apellido')
      .eq('company_id', companyId)
      .eq('cedula', String(employeeData.cedula || '').trim())
      .single();

    if (existingEmployee) {
      throw new Error(`Ya existe un empleado con la cédula ${employeeData.cedula} en esta empresa: ${existingEmployee.nombre} ${existingEmployee.apellido}`);
    }

    const cleanedData = EmployeeValidationService.validateAndCleanEmployeeData(employeeData, companyId);
    EmployeeValidationService.validateBasicFields(cleanedData);

    console.log('📊 Creando empleado para empresa:', companyId);
    console.log('📋 Datos limpiados a insertar:', cleanedData);

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert(cleanedData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error detallado de Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('📋 Datos que causaron el error:', cleanedData);
        
        // Manejar errores específicos de duplicación
        if (error.code === '23505' && error.message.includes('employees_company_id_cedula_key')) {
          throw new Error(`Ya existe un empleado con la cédula ${cleanedData.cedula} en esta empresa`);
        }
        
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      console.log('✅ Empleado creado exitosamente:', data);
      return data;
    } catch (err: any) {
      console.error('❌ Error durante la inserción:', err);
      throw err;
    }
  }

  static async update(id: string, updates: Partial<Employee & { segundoNombre?: string; tipoCotizanteId?: string; subtipoCotizanteId?: string }>) {
    const supabaseData = EmployeeValidationService.prepareUpdateData(updates);

    const { error } = await supabase
      .from('employees')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
  }

  static async delete(id: string) {
    // Verificar si el empleado tiene nóminas asociadas
    const hasPayrolls = await this.checkEmployeeHasPayrolls(id);
    
    if (hasPayrolls) {
      throw new Error('No se puede eliminar el empleado porque tiene nóminas asociadas. Primero debe eliminar o transferir las nóminas.');
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async checkEmployeeHasPayrolls(employeeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('id')
      .eq('employee_id', employeeId)
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  }
}
