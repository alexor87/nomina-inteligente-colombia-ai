import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Users, FileEdit, Save, X, RefreshCw, History } from 'lucide-react';
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
  
  // Version Viewer Props
  onViewInitialLiquidation?: () => void;
  
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
  onViewInitialLiquidation,
  canEdit,
  periodStatus
}) => {
  const { editMode } = usePayrollEdit();
  
  const hasPendingAdjustments = totalPendingCount > 0;
  const hasCompositionChanges = editMode.isActive && editMode.hasUnsavedChanges;
  const isInEditMode = editMode.isActive;
  const hasAnyChanges = hasPendingAdjustments || hasCompositionChanges;
  
  // Show if any actions are available or if period is closed (for version viewer)
  const shouldShow = hasPendingAdjustments || isInEditMode || (periodStatus === 'cerrado' && onViewInitialLiquidation);
  
  // Unified apply changes handler
  const handleApplyAllChanges = async () => {
    // Apply pending adjustments first if they exist
    if (hasPendingAdjustments) {
      await onApplyPendingAdjustments();
    }
    
    // Then apply composition changes if they exist
    if (hasCompositionChanges) {
      await onApplyCompositionChanges();
    }
  };
  
  // Unified discard handler
  const handleDiscardAllChanges = () => {
    if (hasPendingAdjustments) {
      onDiscardPendingAdjustments();
    }
    if (isInEditMode) {
      onDiscardCompositionChanges();
    }
  };
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Unified Changes Panel */}
      {hasAnyChanges && (
        <Alert className="border-primary/50 bg-primary/5">
          <Save className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Cambios Pendientes de Aplicar</span>
              <div className="flex gap-2">
                {hasPendingAdjustments && (
                  <Badge variant="secondary" className="animate-pulse">
                    {totalPendingCount} novedades
                  </Badge>
                )}
                {hasCompositionChanges && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Composición modificada
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleDiscardAllChanges}
                disabled={isApplying || editMode.isLoading}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Descartar Cambios
              </Button>
              <Button 
                size="sm"
                onClick={handleApplyAllChanges}
                disabled={isApplying || editMode.isLoading || !hasAnyChanges}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {(isApplying || editMode.isLoading) ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Aplicando...
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

      {/* Edit Mode Info - Show when in edit mode but no specific changes */}
      {isInEditMode && !hasAnyChanges && (
        <Alert className="border-blue-500/50 bg-blue-50/50">
          <Users className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">Modo de Edición: Composición de Empleados</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Sin cambios
              </Badge>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={onDiscardCompositionChanges}
              disabled={editMode.isLoading}
              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <X className="h-3 w-3 mr-1" />
              Salir del Modo Edición
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Version Viewer Section - Show for closed periods */}
      {periodStatus === 'cerrado' && onViewInitialLiquidation && (
        <Alert className="border-primary/50 bg-primary/5">
          <History className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Auditoría y Trazabilidad</span>
              <span className="text-muted-foreground text-sm">Ver liquidación inicial vs. estado actual</span>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={onViewInitialLiquidation}
              className="h-8 hover:bg-primary/10"
            >
              <History className="h-3 w-3 mr-1" />
              Ver Liquidación Inicial
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};