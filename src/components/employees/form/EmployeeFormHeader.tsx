
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { Employee } from '@/types';

interface EmployeeFormHeaderProps {
  employee?: Employee;
  onCancel: () => void;
  onDuplicate: () => void;
}

export const EmployeeFormHeader = ({ employee, onCancel, onDuplicate }: EmployeeFormHeaderProps) => {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h1>
          <p className="text-gray-600 mt-1">
            {employee ? `Actualiza la información de ${employee.nombre} ${employee.apellido}` : 'Completa la información para crear un nuevo empleado'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {employee && (
            <Button variant="outline" onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
