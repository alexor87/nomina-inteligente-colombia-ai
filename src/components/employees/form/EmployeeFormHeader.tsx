
import { Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Menu } from 'lucide-react';

interface EmployeeFormHeaderProps {
  employee?: Employee;
  onCancel: () => void;
  onDuplicate: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export const EmployeeFormHeader = ({ 
  employee, 
  onCancel, 
  onDuplicate,
  onToggleSidebar,
  sidebarCollapsed
}: EmployeeFormHeaderProps) => {
  const isEditing = !!employee;
  const title = isEditing ? 'Editar Empleado' : 'Crear Empleado';
  const subtitle = isEditing 
    ? `${employee.nombre} ${employee.apellido}` 
    : 'Complete la información del nuevo empleado';

  return (
    <div className="border-b border-gray-100 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Toggle sidebar button - only show when sidebar is collapsed */}
          {sidebarCollapsed && onToggleSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Duplicar</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
