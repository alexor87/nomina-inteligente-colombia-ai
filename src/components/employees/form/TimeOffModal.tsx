
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
    console.log('🎯 Starting save process...');
    
    if (!validateForm(formData)) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSaving(true);
    console.log('⏳ Setting saving state to true');
    
    try {
      console.log('📤 Calling TimeOffService.createTimeOff with:', {
        employee_id: employeeId,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observations: formData.observations
      });

      const result = await TimeOffService.createTimeOff({
        employee_id: employeeId,
        type: formData.type as any,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observations: formData.observations || undefined
      });

      console.log('📥 TimeOffService response:', result);

      if (result.success) {
        const calculatedDays = TimeOffService.calculateBusinessDays(formData.start_date, formData.end_date);
        console.log('✅ Save successful, showing success toast');
        
        toast({
          title: "Registro creado ✅",
          description: `${TimeOffService.getTypeLabel(formData.type)} registrado por ${calculatedDays} días`,
          className: "border-green-200 bg-green-50"
        });
        
        console.log('🔄 Calling onSave to refresh data');
        onSave(); // Refresca los datos
        
        console.log('🚪 Calling handleClose to close modal');
        handleClose(); // Cierra el modal
      } else {
        console.error('❌ Save failed:', result.error);
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el registro",
          variant: "destructive"
        });
        
        console.log('⚠️ Error occurred, keeping modal open');
      }

    } catch (error: any) {
      console.error('❌ Unexpected error during save:', error);
      toast({
        title: "Error",
        description: error.message || "Error inesperado al crear el registro",
        variant: "destructive"
      });
      
      console.log('⚠️ Exception occurred, keeping modal open');
    } finally {
      console.log('🏁 Setting saving state to false');
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 HandleClose called - resetting form and closing');
    setFormData({ type: '', start_date: '', end_date: '', observations: '' });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('🔄 Modal openChange event:', open, 'isSaving:', isSaving);
        if (!open && !isSaving) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Tiempo Libre</DialogTitle>
          <DialogDescription>
            Completa el formulario para registrar vacaciones, licencias u otros tipos de tiempo libre para el empleado.
          </DialogDescription>
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
