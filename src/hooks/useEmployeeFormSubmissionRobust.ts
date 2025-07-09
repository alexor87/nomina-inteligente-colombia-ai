
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeFormData } from '@/components/employees/form/types';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeFormSubmissionRobust = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitEmployee = async (data: EmployeeFormData): Promise<{ success: boolean; employeeId?: string; error?: string }> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Iniciando envío de empleado con datos:', data);

      const { custom_fields, empresaId, ...employeeData } = data;
      
      // Obtener company_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const finalEmployeeData = {
        ...employeeData,
        company_id: profile.company_id,
        custom_fields: custom_fields || {},
        salario_base: Number(employeeData.salarioBase) || 0
      };

      let result;
      let actionText;

      if (data.id) {
        console.log('📝 Actualizando empleado existente:', data.id);
        const { data: updateResult, error } = await supabase
          .from('employees')
          .update(finalEmployeeData)
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
          .insert(finalEmployeeData)
          .select()
          .single();
        
        result = insertResult;
        actionText = 'creado';
        
        if (error) throw error;
      }

      console.log(`✅ Empleado ${actionText} exitosamente:`, result);

      toast({
        title: `Empleado ${actionText} ✅`,
        description: `${finalEmployeeData.nombre} ${finalEmployeeData.apellido} ha sido ${actionText} exitosamente`,
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
