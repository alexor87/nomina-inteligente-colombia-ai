
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmployeeProfile } from './EmployeeProfile';
import { EmployeeWithStatus } from '@/types/employee-extended';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeWithStatus | null;
}

export const EmployeeDetailsModal = ({ isOpen, onClose, employee }: EmployeeDetailsModalProps) => {
  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0 gap-0">
        <EmployeeProfile employee={employee} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};
