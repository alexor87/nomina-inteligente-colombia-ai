
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmployeeForm } from './EmployeeForm';
import { Employee } from '@/types';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSuccess?: () => void;
}

export const EmployeeFormModal = ({ isOpen, onClose, employee, onSuccess }: EmployeeFormModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
          <DialogDescription>
            {employee 
              ? 'Modifica la información del empleado seleccionado.'
              : 'Completa todos los campos para registrar un nuevo empleado en el sistema.'
            }
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          employee={employee}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
