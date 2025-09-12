import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Users, FileEdit, Save, X, RefreshCw } from 'lucide-react';
import { usePayrollEdit } from '@/contexts/PayrollEditContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PayrollActionsPanelProps {
  // Pending Adjustments Props
  totalPendingCount: number;
  isApplying: boolean;
  onApplyPendingAdjustments: () => void;
  onDiscardPendingAdjustments: () => void;
  
  // Composition Edit Props  
  onApplyCompositionChanges: () => void;
  onDiscardCompositionChanges: () => void;
  
  // General Props
  canEdit: boolean;
  periodStatus: string;
}

export const PayrollActionsPanel: React.FC<PayrollActionsPanelProps> = ({
  totalPendingCount,
  isApplying,
  onApplyPendingAdjustments,
  onDiscardPendingAdjustments,
  onApplyCompositionChanges,
  onDiscardCompositionChanges,
  canEdit,
  periodStatus
}) => {
  const { editMode } = usePayrollEdit();
  
  const hasPendingAdjustments = totalPendingCount > 0;
  const hasCompositionChanges = editMode.isActive && editMode.hasUnsavedChanges;
  const isInEditMode = editMode.isActive;
  
  // Don't show if no actions are available
  if (!hasPendingAdjustments && !isInEditMode) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pending Adjustments Section */}
      {hasPendingAdjustments && (
        <Alert className="border-warning/50 bg-warning/5">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              <span className="font-medium">Ajustes Pendientes</span>
              <Badge variant="secondary" className="animate-pulse">
                {totalPendingCount} novedades
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={onDiscardPendingAdjustments}
                disabled={isApplying}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Descartar
              </Button>
              <Button 
                size="sm"
                onClick={onApplyPendingAdjustments}
                disabled={isApplying}
                className="h-8 bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Aplicar Ajustes
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Composition Edit Mode Section */}
      {isInEditMode && (
        <Alert className="border-blue-500/50 bg-blue-50/50">
          <Users className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">Modo de Edición: Composición de Empleados</span>
              {hasCompositionChanges && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {editMode.sessionId ? 'Cambios pendientes' : 'Sin cambios'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={onDiscardCompositionChanges}
                disabled={editMode.isLoading}
                className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={onApplyCompositionChanges}
                disabled={editMode.isLoading || !hasCompositionChanges}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editMode.isLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Aplicar Cambios
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning when both systems are active */}
      {hasPendingAdjustments && isInEditMode && (
        <Alert className="border-orange-500/50 bg-orange-50/50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Importante:</strong> Tienes tanto ajustes pendientes como cambios de composición. 
            Te recomendamos aplicar primero los ajustes pendientes antes de finalizar los cambios de composición.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};