
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';

interface EmployeeBulkDeleteActionsProps {
  selectedCount: number;
  onBulkDelete: (ids: string[]) => Promise<void>;
  selectedEmployeeIds: string[];
  isDeleting?: boolean;
  onClearSelection: () => void;
}

export const EmployeeBulkDeleteActions = ({ 
  selectedCount, 
  onBulkDelete, 
  selectedEmployeeIds,
  isDeleting = false,
  onClearSelection
}: EmployeeBulkDeleteActionsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleConfirmDelete = async () => {
    await onBulkDelete(selectedEmployeeIds);
    setIsConfirmOpen(false);
  };

  return (
    <Card className="bg-red-50 border-red-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-red-800">
            {selectedCount} empleado{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearSelection}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Eliminar {selectedCount > 1 ? 'Todos' : ''}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres eliminar {selectedCount} empleado{selectedCount !== 1 ? 's' : ''}? 
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
