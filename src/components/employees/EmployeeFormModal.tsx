
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmployeeFormWizard } from './EmployeeFormWizard';
import { Employee } from '@/types';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSuccess: () => void;
}

export const EmployeeFormModal = ({ isOpen, onClose, employee, onSuccess }: EmployeeFormModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
          <DialogDescription>
            {employee 
              ? 'Actualiza la información del empleado seleccionado.' 
              : 'Completa el formulario para crear un nuevo empleado en el sistema.'
            }
          </DialogDescription>
        </DialogHeader>
        <EmployeeFormWizard
          employee={employee}
          onSuccess={onSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
