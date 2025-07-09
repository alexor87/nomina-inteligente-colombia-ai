
import { useToast } from '@/hooks/use-toast';

interface TimeOffFormData {
  type: string;
  start_date: string;
  end_date: string;
  observations: string;
}

export const useTimeOffValidation = () => {
  const { toast } = useToast();

  const validateForm = (formData: TimeOffFormData): boolean => {
    if (!formData.type || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Debes completar todos los campos obligatorios",
        variant: "destructive"
      });
      return false;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast({
        title: "Error",
        description: "La fecha de inicio debe ser anterior a la fecha de fin",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const isFormValid = (formData: TimeOffFormData): boolean => {
    return !!(formData.type && formData.start_date && formData.end_date);
  };

  return { validateForm, isFormValid };
};
