
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Detalles del Empleado: {employee.nombre} {employee.apellido}
          </DialogTitle>
          <DialogDescription>
            Información completa y perfil del empleado incluyendo datos personales, laborales y de afiliaciones.
          </DialogDescription>
        </DialogHeader>
        <EmployeeProfile employee={employee} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};
