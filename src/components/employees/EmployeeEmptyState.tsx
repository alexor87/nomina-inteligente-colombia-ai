
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface EmployeeEmptyStateProps {
  hasFilters: boolean;
  onCreateEmployee: () => void;
}

export const EmployeeEmptyState = ({ hasFilters, onCreateEmployee }: EmployeeEmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados</h3>
      <p className="text-gray-600 mb-4">
        {hasFilters
          ? 'No se encontraron empleados con los filtros aplicados'
          : 'Comienza agregando tu primer empleado'}
      </p>
      <Button onClick={onCreateEmployee}>
        <Plus className="h-4 w-4 mr-2" />
        Agregar Empleado
      </Button>
    </div>
  );
};
