
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
    if (!employee) return;

    setIsSubmitting(true);
    
    try {
      console.log('🚀 Submitting employee update:', formData);
      
      const result = await EmployeeUnifiedService.update(employee.id, formData);
      
      if (result.success && result.data) {
        console.log('✅ Employee updated successfully:', result.data);
        
        toast({
          title: "Empleado actualizado",
          description: `${result.data.nombre} ${result.data.apellido} ha sido actualizado correctamente.`,
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
