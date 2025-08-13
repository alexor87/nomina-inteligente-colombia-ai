
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeFormData } from '@/components/employees/form/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataMapper } from '@/services/EmployeeDataMapper';
import { EmployeeUniqueValidationService } from '@/services/EmployeeUniqueValidationService';
import { validateEmployeeDataEnhanced } from '@/schemas/employeeValidationEnhanced';

export const useEmployeeFormSubmissionRobust = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitEmployee = async (data: EmployeeFormData): Promise<{ success: boolean; employeeId?: string; error?: string }> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Iniciando envío de empleado con validación mejorada:', data);

      // First, validate the data with enhanced schema
      const validationResult = validateEmployeeDataEnhanced(data);
      if (!validationResult.success) {
        console.error('❌ Validation failed:', validationResult.errors);
        throw new Error('Datos del formulario inválidos');
      }

      // Obtener company_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Check cedula uniqueness
      const uniqueCheck = await EmployeeUniqueValidationService.isCedulaUnique(
        data.cedula,
        profile.company_id,
        data.id // Exclude current employee if updating
      );

      if (!uniqueCheck.isUnique) {
        const existingEmployee = uniqueCheck.existingEmployee;
        throw new Error(
          `La cédula ${data.cedula} ya está registrada para ${existingEmployee.nombre} ${existingEmployee.apellido}`
        );
      }

      // Validate affiliation entities
      const affiliationValidation = await EmployeeUniqueValidationService.validateAffiliationEntities({
        eps: data.eps,
        afp: data.afp,
        arl: data.arl,
        cajaCompensacion: data.cajaCompensacion,
        tipoCotizanteId: data.tipoCotizanteId,
        subtipoCotizanteId: data.subtipoCotizanteId
      });

      if (!affiliationValidation.isValid) {
        throw new Error(`Errores en afiliaciones: ${affiliationValidation.errors.join(', ')}`);
      }

      // Use EmployeeDataMapper for proper field conversion
      const mappedData = EmployeeDataMapper.mapFormToDatabase(data, profile.company_id);
      
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
        title: "Error de validación",
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
