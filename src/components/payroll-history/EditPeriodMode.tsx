import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit3, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import { PeriodEditState } from '@/types/period-editing';

interface EditPeriodModeProps {
  editState: PeriodEditState;
  hasChanges: boolean;
  totalChangesCount: number;
  isValid: boolean;
  validationErrors: string[];
  onStartEditing: () => void;
  onApplyChanges: () => void;
  onDiscardChanges: () => void;
  children: React.ReactNode;
}

export const EditPeriodMode = ({
  editState,
  hasChanges,
  totalChangesCount,
  isValid,
  validationErrors,
  onStartEditing,
  onApplyChanges,
  onDiscardChanges,
  children
}: EditPeriodModeProps) => {
  
  // Render edit button when period is closed
  if (editState === 'closed') {
    return (
      <div className="space-y-6">
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">Período Cerrado</h3>
                  <p className="text-sm text-blue-700">
                    Para realizar cambios en este período, active el modo edición
                  </p>
                </div>
              </div>
              <Button 
                onClick={onStartEditing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Editar Período
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {children}
      </div>
    );
  }

  // Render editing mode UI
  return (
    <div className="space-y-6">
      {/* Edit Mode Banner */}
      <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                  Modo Edición Activo
                  {hasChanges && (
                    <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                      {totalChangesCount} {totalChangesCount === 1 ? 'cambio' : 'cambios'}
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-orange-700">
                  {editState === 'saving' && 'Aplicando cambios...'}
                  {editState === 'discarding' && 'Descartando cambios...'}
                  {editState === 'editing' && hasChanges && 'Tiene cambios pendientes por aplicar'}
                  {editState === 'editing' && !hasChanges && 'No hay cambios pendientes'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Validation Errors */}
              {!isValid && validationErrors.length > 0 && (
                <div className="flex items-center gap-1 text-red-600 mr-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">{validationErrors.length} errores</span>
                </div>
              )}
              
              {/* Discard Changes Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={editState === 'saving' || editState === 'discarding' || !hasChanges}
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    {editState === 'discarding' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Descartando...
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Descartar
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se perderán todos los cambios pendientes ({totalChangesCount} {totalChangesCount === 1 ? 'cambio' : 'cambios'}). 
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDiscardChanges}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Descartar Cambios
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Apply Changes Button */}
              <Button 
                onClick={onApplyChanges}
                disabled={editState === 'saving' || editState === 'discarding' || !hasChanges || !isValid}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {editState === 'saving' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Aplicar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Validation Errors Display */}
          {!isValid && validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Errores de validación:
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content with editing overlay effect */}
      <div className={`relative ${editState === 'editing' ? 'ring-2 ring-orange-200 ring-offset-2 rounded-lg' : ''}`}>
        {children}
      </div>
    </div>
  );
};