
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';

export class EmployeeServiceRobust {
  static async createEmployee(employeeData: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🚀 EmployeeServiceRobust: Creating employee', employeeData);

      // ✅ FIXED: Ensure required fields are present
      const requiredData = {
        ...employeeData,
        company_id: employeeData.company_id || '', // Use company_id instead of empresaId
        nombre: employeeData.nombre || '',
        apellido: employeeData.apellido || '',
        cedula: employeeData.cedula || '',
        salario_base: Number(employeeData.salarioBase) || 0,
        fecha_ingreso: employeeData.fechaIngreso || new Date().toISOString().split('T')[0],
        estado: employeeData.estado || 'activo'
      };

      // Clean up the data object - ensure we're not sending undefined values
      const cleanData = Object.keys(requiredData).reduce((acc, key) => {
        const value = requiredData[key as keyof typeof requiredData];
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Handle custom fields properly
      if (employeeData.customFields) {
        cleanData.custom_fields = employeeData.customFields; // ✅ FIXED: Use correct database field name
      }

      const { data, error } = await supabase
        .from('employees')
        .insert(cleanData)
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeServiceRobust: Database error:', error);
        throw error;
      }

      console.log('✅ EmployeeServiceRobust: Employee created successfully:', data);
      
      // Map the response back to EmployeeUnified format
      const unifiedEmployee: EmployeeUnified = {
        id: data.id,
        company_id: data.company_id,
        empresaId: data.company_id, // For backward compatibility
        nombre: data.nombre,
        apellido: data.apellido,
        cedula: data.cedula,
        salarioBase: Number(data.salario_base),
        fechaIngreso: data.fecha_ingreso,
        estado: data.estado as any,
        // Add other mapped fields as needed
        tipoDocumento: data.tipo_documento || 'CC',
        email: data.email,
        telefono: data.telefono,
        tipoContrato: data.tipo_contrato || 'indefinido',
        periodicidadPago: data.periodicidad_pago || 'mensual',
        customFields: (data.custom_fields && typeof data.custom_fields === 'object') ? data.custom_fields as Record<string, any> : {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return { success: true, data: unifiedEmployee };
    } catch (error: any) {
      console.error('❌ EmployeeServiceRobust: Error creating employee:', error);
      return { 
        success: false, 
        error: error.message || 'Error desconocido al crear empleado' 
      };
    }
  }

  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🚀 EmployeeServiceRobust: Updating employee', id, updates);

      // Clean up the updates object
      const cleanUpdates = Object.keys(updates).reduce((acc, key) => {
        const value = updates[key as keyof typeof updates];
        if (value !== undefined && value !== null) {
          // Map EmployeeUnified fields to database fields
          if (key === 'salarioBase') {
            acc.salario_base = Number(value);
          } else if (key === 'fechaIngreso') {
            acc.fecha_ingreso = value;
          } else if (key === 'tipoDocumento') {
            acc.tipo_documento = value;
          } else if (key === 'customFields') {
            acc.custom_fields = value; // ✅ FIXED: Use correct database field name
          } else if (key !== 'empresaId') { // Skip empresaId as it's for compatibility only
            acc[key] = value;
          }
        }
        return acc;
      }, {} as any);

      const { data, error } = await supabase
        .from('employees')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeServiceRobust: Database error:', error);
        throw error;
      }

      console.log('✅ EmployeeServiceRobust: Employee updated successfully:', data);
      
      // Map the response back to EmployeeUnified format
      const unifiedEmployee: EmployeeUnified = {
        id: data.id,
        company_id: data.company_id,
        empresaId: data.company_id, // For backward compatibility
        nombre: data.nombre,
        apellido: data.apellido,
        cedula: data.cedula,
        salarioBase: Number(data.salario_base),
        fechaIngreso: data.fecha_ingreso,
        estado: data.estado as any,
        // Add other mapped fields as needed
        tipoDocumento: data.tipo_documento || 'CC',
        email: data.email,
        telefono: data.telefono,
        tipoContrato: data.tipo_contrato || 'indefinido',
        periodicidadPago: data.periodicidad_pago || 'mensual',
        customFields: (data.custom_fields && typeof data.custom_fields === 'object') ? data.custom_fields as Record<string, any> : {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return { success: true, data: unifiedEmployee };
    } catch (error: any) {
      console.error('❌ EmployeeServiceRobust: Error updating employee:', error);
      return { 
        success: false, 
        error: error.message || 'Error desconocido al actualizar empleado' 
      };
    }
  }
}
