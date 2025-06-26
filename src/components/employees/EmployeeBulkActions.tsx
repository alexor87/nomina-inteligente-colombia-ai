
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX } from 'lucide-react';

interface EmployeeBulkActionsProps {
  selectedCount: number;
  onBulkUpdateStatus: (status: string) => void;
}

export const EmployeeBulkActions = ({ selectedCount, onBulkUpdateStatus }: EmployeeBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-blue-800">
            {selectedCount} empleado{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </p>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onBulkUpdateStatus('activo')}>
              <UserCheck className="h-4 w-4 mr-1" />
              Activar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onBulkUpdateStatus('inactivo')}>
              <UserX className="h-4 w-4 mr-1" />
              Desactivar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
