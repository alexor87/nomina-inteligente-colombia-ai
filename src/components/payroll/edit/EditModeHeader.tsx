import React from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayrollEdit } from '@/contexts/PayrollEditContext';

interface EditModeHeaderProps {
  onApplyChanges: () => void;
  onDiscardChanges: () => void;
}

export const EditModeHeader: React.FC<EditModeHeaderProps> = ({
  onApplyChanges,
  onDiscardChanges
}) => {
  const { editMode } = usePayrollEdit();

  if (!editMode.isActive) return null;

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-medium text-amber-800">Modo de Edición Activo</p>
          <p className="text-sm text-amber-700">
            Estás editando un período liquidado. Los cambios no se aplicarán hasta que confirmes.
            {editMode.compositionChanges.length > 0 && (
              <span className="ml-2 font-medium">
                ({editMode.compositionChanges.length} cambio{editMode.compositionChanges.length !== 1 ? 's' : ''} pendiente{editMode.compositionChanges.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscardChanges}
            disabled={editMode.isLoading}
            className="border-gray-300 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-1" />
            Descartar
          </Button>
          <Button
            size="sm"
            onClick={onApplyChanges}
            disabled={editMode.isLoading || !editMode.hasUnsavedChanges}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            Aplicar Cambios
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};