
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmployeeFormWizard } from './EmployeeFormWizard';
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <EmployeeFormWizard
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
