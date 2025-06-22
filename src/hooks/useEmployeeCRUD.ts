
import { useState } from 'react';
import { Employee } from '@/types';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useEmployeeCRUD = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      // Transformar los datos al formato de Supabase
      const supabaseData = {
        company_id: employeeData.empresaId,
        cedula: employeeData.cedula,
        nombre: employeeData.nombre,
        apellido: employeeData.apellido,
        email: employeeData.email,
        telefono: employeeData.telefono,
        salario_base: employeeData.salarioBase,
        tipo_contrato: employeeData.tipoContrato,
        fecha_ingreso: employeeData.fechaIngreso,
        estado: employeeData.estado,
        eps: employeeData.eps,
        afp: employeeData.afp,
        arl: employeeData.arl,
        caja_compensacion: employeeData.cajaCompensacion,
        cargo: employeeData.cargo,
        estado_afiliacion: employeeData.estadoAfiliacion
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([supabaseData])
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        toast({
          title: "Error al crear empleado",
          description: error.message || "No se pudo crear el empleado. Intenta nuevamente.",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      toast({
        title: "Empleado creado",
        description: `${employeeData.nombre} ${employeeData.apellido} ha sido agregado exitosamente.`,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error creating employee:', error);
      toast({
        title: "Error al crear empleado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive"
      });
      return { success: false, error: "Error inesperado" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setIsLoading(true);
    try {
      // Transformar los datos al formato de Supabase
      const supabaseData: any = {};
      
      if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
      if (updates.nombre !== undefined) supabaseData.nombre = updates.nombre;
      if (updates.apellido !== undefined) supabaseData.apellido = updates.apellido;
      if (updates.email !== undefined) supabaseData.email = updates.email;
      if (updates.telefono !== undefined) supabaseData.telefono = updates.telefono;
      if (updates.salarioBase !== undefined) supabaseData.salario_base = updates.salarioBase;
      if (updates.tipoContrato !== undefined) supabaseData.tipo_contrato = updates.tipoContrato;
      if (updates.fechaIngreso !== undefined) supabaseData.fecha_ingreso = updates.fechaIngreso;
      if (updates.estado !== undefined) supabaseData.estado = updates.estado;
      if (updates.eps !== undefined) supabaseData.eps = updates.eps;
      if (updates.afp !== undefined) supabaseData.afp = updates.afp;
      if (updates.arl !== undefined) supabaseData.arl = updates.arl;
      if (updates.cajaCompensacion !== undefined) supabase.caja_compensacion = updates.cajaCompensacion;
      if (updates.cargo !== undefined) supabaseData.cargo = updates.cargo;
      if (updates.estadoAfiliacion !== undefined) supabaseData.estado_afiliacion = updates.estadoAfiliacion;

      const { error } = await supabase
        .from('employees')
        .update(supabaseData)
        .eq('id', id);

      if (error) {
        console.error('Error updating employee:', error);
        toast({
          title: "Error al actualizar",
          description: error.message || "No se pudo actualizar el empleado.",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados correctamente.",
      });

      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating employee:', error);
      toast({
        title: "Error al actualizar",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
      return { success: false, error: "Error inesperado" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting employee:', error);
        toast({
          title: "Error al eliminar",
          description: error.message || "No se pudo eliminar el empleado.",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema.",
      });

      return { success: true };
    } catch (error) {
      console.error('Unexpected error deleting employee:', error);
      toast({
        title: "Error al eliminar",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
      return { success: false, error: "Error inesperado" };
    } finally {
      setIsLoading(false);
    }
  };

  const changeEmployeeStatus = async (id: string, newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error changing employee status:', error);
        toast({
          title: "Error al cambiar estado",
          description: error.message || "No se pudo actualizar el estado del empleado.",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Estado actualizado",
        description: `El estado del empleado ha sido cambiado a ${newStatus}.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Unexpected error changing employee status:', error);
      toast({
        title: "Error al cambiar estado",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
      return { success: false, error: "Error inesperado" };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changeEmployeeStatus,
    isLoading
  };
};
