
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Trash2, Loader2 } from 'lucide-react';

interface EmployeeBulkActionsProps {
  selectedCount: number;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  isUpdating?: boolean;
}

export const EmployeeBulkActions = ({ 
  selectedCount, 
  onBulkUpdateStatus, 
  onBulkDelete,
  isUpdating = false 
}: EmployeeBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-blue-800">
            {selectedCount} empleado{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </p>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onBulkUpdateStatus('activo')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-1" />
              )}
              Activar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onBulkUpdateStatus('inactivo')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UserX className="h-4 w-4 mr-1" />
              )}
              Desactivar
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={onBulkDelete}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
