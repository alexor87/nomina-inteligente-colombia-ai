
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeUniqueValidationService } from '@/services/EmployeeUniqueValidationService';
import { validateEmployeeDataEnhanced } from '@/schemas/employeeValidationEnhanced';

export const useEmployeeEditSubmission = (
  employee: EmployeeUnified | null,
  onSuccess: () => void
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (formData: any) => {
    console.log('🔥 EMPLOYEE EDIT SUBMISSION - Enhanced validation');
    console.log('🔥 Employee:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'null');
    console.log('🔥 Form data:', formData);

    if (!employee) {
      console.error('❌ CRITICAL: No employee provided for edit submission');
      toast({
        title: "Error crítico",
        description: "No se encontró información del empleado",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 Starting employee edit submission with enhanced validation');
    setIsSubmitting(true);
    
    try {
      // Enhanced validation
      const validationResult = validateEmployeeDataEnhanced(formData);
      if (!validationResult.success) {
        console.error('❌ Enhanced validation failed:', validationResult.errors);
        toast({
          title: "Error de validación",
          description: "Por favor revisa los errores en el formulario",
          variant: "destructive"
        });
        return;
      }

      // Check cedula uniqueness (excluding current employee)
      const uniqueCheck = await EmployeeUniqueValidationService.isCedulaUnique(
        formData.cedula,
        employee.company_id || employee.empresaId,
        employee.id
      );

      if (!uniqueCheck.isUnique) {
        const existingEmployee = uniqueCheck.existingEmployee;
        toast({
          title: "Cédula duplicada",
          description: `La cédula ${formData.cedula} ya está registrada para ${existingEmployee.nombre} ${existingEmployee.apellido}`,
          variant: "destructive"
        });
        return;
      }

      // Validate affiliation entities
      const affiliationValidation = await EmployeeUniqueValidationService.validateAffiliationEntities({
        eps: formData.eps,
        afp: formData.afp,
        arl: formData.arl,
        cajaCompensacion: formData.cajaCompensacion,
        tipoCotizanteId: formData.tipoCotizanteId,
        subtipoCotizanteId: formData.subtipoCotizanteId
      });

      if (!affiliationValidation.isValid) {
        toast({
          title: "Error en afiliaciones",
          description: affiliationValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // Clean the form data before sending
      const cleanedData = {
        ...formData,
        id: employee.id,
        company_id: employee.company_id || employee.empresaId
      };

      console.log('📤 Sending validated and cleaned data to service:', cleanedData);
      
      const result = await EmployeeUnifiedService.update(employee.id, cleanedData);
      console.log('📥 Service response:', result);
      
      if (result.success && result.data) {
        console.log('✅ Employee updated successfully with enhanced validation');
        
        toast({
          title: "Empleado actualizado",
          description: `${result.data.nombre} ${result.data.apellido} ha sido actualizado correctamente.`,
          className: "border-green-200 bg-green-50"
        });
        
        console.log('🎉 Calling onSuccess callback');
        onSuccess();
      } else {
        console.error('❌ Error updating employee:', result.error);
        
        toast({
          title: "Error al actualizar empleado",
          description: result.error || "No se pudo actualizar el empleado",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Unexpected error during employee update:', error);
      
      const errorMessage = error.message || "Ocurrió un error al actualizar el empleado";
      
      toast({
        title: "Error inesperado",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      console.log('🏁 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting
  };
};
