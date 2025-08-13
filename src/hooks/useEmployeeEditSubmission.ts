
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeEditSubmission = (
  employee: EmployeeUnified | null,
  onSuccess: () => void
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (formData: any) => {
    console.log('🔥 EMPLOYEE EDIT SUBMISSION - STARTING');
    console.log('🔥 Employee:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'null');
    console.log('🔥 Form data keys:', Object.keys(formData || {}));
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

    console.log('🚀 Starting employee edit submission for:', employee.id);
    setIsSubmitting(true);
    
    try {
      // Clean the form data before sending
      const cleanedData = {
        ...formData,
        id: employee.id,
        company_id: employee.company_id || employee.empresaId
      };

      console.log('📤 Sending cleaned data to service:', cleanedData);
      
      const result = await EmployeeUnifiedService.update(employee.id, cleanedData);
      console.log('📥 Service response:', result);
      
      if (result.success && result.data) {
        console.log('✅ Employee updated successfully:', result.data);
        
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
    } catch (error) {
      console.error('❌ Unexpected error during employee update:', error);
      
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al actualizar el empleado",
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
