
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { Employee } from '@/types';

export const useEmployeeEditSubmission = (
  employee: Employee | null,
  onSuccess: () => void
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (formData: any) => {
    if (!employee) {
      console.error('❌ No employee provided for edit submission');
      return;
    }

    console.log('🚀 Starting employee edit submission for:', employee.id);
    console.log('📝 Form data received:', formData);

    setIsSubmitting(true);
    
    try {
      // Clean the form data before sending
      const cleanedData = {
        ...formData,
        id: employee.id, // Ensure we have the employee ID
        company_id: employee.company_id || formData.empresaId || formData.company_id
      };

      console.log('📤 Sending cleaned data:', cleanedData);
      
      const result = await EmployeeUnifiedService.update(employee.id, cleanedData);
      
      if (result.success && result.data) {
        console.log('✅ Employee updated successfully:', result.data);
        
        toast({
          title: "Empleado actualizado",
          description: `${result.data.nombre} ${result.data.apellido} ha sido actualizado correctamente.`,
          className: "border-green-200 bg-green-50"
        });
        
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
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting
  };
};
