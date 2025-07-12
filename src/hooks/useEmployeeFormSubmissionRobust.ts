
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeFormData } from '@/components/employees/form/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataMapper } from '@/services/EmployeeDataMapper';

export const useEmployeeFormSubmissionRobust = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitEmployee = async (data: EmployeeFormData): Promise<{ success: boolean; employeeId?: string; error?: string }> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Iniciando envío de empleado con datos:', data);

      // Obtener company_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // ✅ FIXED: Create a compatible data object with proper estado field
      const compatibleData = {
        ...data,
        // Cast estado to the expected union type for the mapper
        estado: data.estado as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'
      };

      // ✅ KISS: Use EmployeeDataMapper for proper field conversion
      const mappedData = EmployeeDataMapper.mapFormToDatabase(compatibleData, profile.company_id);
      
      console.log('📝 Datos mapeados para base de datos:', mappedData);

      let result;
      let actionText;

      if (data.id) {
        console.log('📝 Actualizando empleado existente:', data.id);
        const { data: updateResult, error } = await supabase
          .from('employees')
          .update(mappedData)
          .eq('id', data.id)
          .select()
          .single();
        
        result = updateResult;
        actionText = 'actualizado';
        
        if (error) throw error;
      } else {
        console.log('➕ Creando nuevo empleado');
        const { data: insertResult, error } = await supabase
          .from('employees')
          .insert(mappedData)
          .select()
          .single();
        
        result = insertResult;
        actionText = 'creado';
        
        if (error) throw error;
      }

      console.log(`✅ Empleado ${actionText} exitosamente:`, result);

      toast({
        title: `Empleado ${actionText} ✅`,
        description: `${data.nombre} ${data.apellido} ha sido ${actionText} exitosamente`,
        className: "border-green-200 bg-green-50"
      });

      return { 
        success: true, 
        employeeId: result?.id 
      };

    } catch (error: any) {
      console.error('💥 Error en submitEmployee:', error);
      
      const errorMessage = error.message || 'Error desconocido al procesar empleado';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      return { 
        success: false, 
        error: errorMessage 
      };

    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEmployee,
    isSubmitting
  };
};
