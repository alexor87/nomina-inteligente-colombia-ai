import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';

export class EmployeeUnifiedService {
  static async getAll(): Promise<{ data: EmployeeUnified[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Error fetching employees:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Unexpected error fetching employees:', error);
      return { data: null, error: { message: error.message } };
    }
  }

  static async getEmployeeById(id: string): Promise<{ success: boolean; data: EmployeeUnified | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching employee with ID ${id}:`, error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error: any) {
      console.error(`Unexpected error fetching employee with ID ${id}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(employee: EmployeeUnified): Promise<{ success: boolean; data: EmployeeUnified | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error: any) {
      console.error('Unexpected error creating employee:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data: EmployeeUnified | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating employee with ID ${id}:`, error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error: any) {
      console.error(`Unexpected error updating employee with ID ${id}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting employee with ID ${id}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error(`Unexpected error deleting employee with ID ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  static mapEmployeeStatus(employee: EmployeeUnified): { status: 'valid' | 'error' | 'incomplete'; errors: string[] } {
    const errors: string[] = [];

    if (!employee.nombre || !employee.apellido) {
      errors.push('Nombre y apellido son obligatorios.');
    }

    if (!employee.tipo_documento || !employee.numero_documento) {
      errors.push('Tipo y número de documento son obligatorios.');
    }

    if (!employee.fecha_nacimiento) {
      errors.push('Fecha de nacimiento es obligatoria.');
    }

    if (!employee.email) {
      errors.push('Email es obligatorio.');
    }

    if (!employee.telefono) {
      errors.push('Teléfono es obligatorio.');
    }

    if (!employee.direccion) {
      errors.push('Dirección es obligatoria.');
    }

    if (!employee.ciudad) {
      errors.push('Ciudad es obligatoria.');
    }

    if (!employee.departamento) {
      errors.push('Departamento es obligatorio.');
    }

    if (!employee.salarioBase) {
      errors.push('Salario base es obligatorio.');
    }

    if (!employee.tipo_contrato) {
      errors.push('Tipo de contrato es obligatorio.');
    }

    if (!employee.fecha_ingreso) {
      errors.push('Fecha de ingreso es obligatoria.');
    }

    // Fix the comparison - change 'incomplete' to appropriate status
    const hasErrors = employee.status === 'error';

    return {
      status: hasErrors ? 'error' : errors.length > 0 ? 'incomplete' : 'valid',
      errors: hasErrors ? ['Error en los datos del empleado'] : errors,
    };
  }
}
