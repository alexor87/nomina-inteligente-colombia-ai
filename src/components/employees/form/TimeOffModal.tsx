
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimeOffService } from '@/services/TimeOffService';
import { useToast } from '@/hooks/use-toast';
import { TimeOffForm } from './timeoff/TimeOffForm';
import { TimeOffActions } from './timeoff/TimeOffActions';
import { useTimeOffValidation } from './timeoff/TimeOffValidation';

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeId: string;
}

interface TimeOffFormData {
  type: string;
  start_date: string;
  end_date: string;
  observations: string;
}

export const TimeOffModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  employeeId
}: TimeOffModalProps) => {
  const [formData, setFormData] = useState<TimeOffFormData>({
    type: '',
    start_date: '',
    end_date: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { validateForm, isFormValid } = useTimeOffValidation();

  const validateAndSave = async () => {
    if (!validateForm(formData)) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await TimeOffService.createTimeOff({
        employee_id: employeeId,
        type: formData.type as any,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observations: formData.observations || undefined
      });

      if (result.success) {
        const calculatedDays = TimeOffService.calculateBusinessDays(formData.start_date, formData.end_date);
        toast({
          title: "Registro creado ✅",
          description: `${TimeOffService.getTypeLabel(formData.type)} registrado por ${calculatedDays} días`,
          className: "border-green-200 bg-green-50"
        });
        
        setTimeout(() => {
          onSave();
          handleClose();
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el registro",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error inesperado al crear el registro",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ type: '', start_date: '', end_date: '', observations: '' });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={() => {}}
      modal={true}
    >
      <DialogContent 
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registrar Tiempo Libre</DialogTitle>
        </DialogHeader>
        
        <TimeOffForm
          formData={formData}
          onFormDataChange={setFormData}
          disabled={isSaving}
        />

        <TimeOffActions
          onCancel={handleClose}
          onSave={validateAndSave}
          isSaving={isSaving}
          isFormValid={isFormValid(formData)}
        />
      </DialogContent>
    </Dialog>
  );
};
