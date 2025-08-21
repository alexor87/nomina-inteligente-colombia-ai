
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployeeList } from '@/hooks/useEmployeeList';

interface EmployeeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployees: (employeeIds: string[]) => void;
}

export const EmployeeSelectionModal = ({ 
  isOpen, 
  onClose, 
  onAddEmployees 
}: EmployeeSelectionModalProps) => {
  const { employees } = useEmployeeList();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleAddSelected = () => {
    onAddEmployees(selectedEmployees);
    setSelectedEmployees([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Empleados</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-3">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedEmployees.includes(employee.id)}
                  onCheckedChange={() => handleEmployeeToggle(employee.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{employee.nombre} {employee.apellido}</p>
                  <p className="text-sm text-gray-500">{employee.cargo}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSelected}
              disabled={selectedEmployees.length === 0}
            >
              Agregar {selectedEmployees.length} empleados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
