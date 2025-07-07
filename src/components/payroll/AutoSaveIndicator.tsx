
import React from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaveTime?: Date | null;
  hasUnsavedChanges?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaveTime,
  hasUnsavedChanges = false
}) => {
  if (isSaving) {
    return (
      <Badge variant="secondary" className="flex items-center space-x-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Guardando...</span>
      </Badge>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="flex items-center space-x-1 border-orange-200 text-orange-700">
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">Cambios pendientes</span>
      </Badge>
    );
  }

  if (lastSaveTime) {
    return (
      <Badge variant="outline" className="flex items-center space-x-1 border-green-200 text-green-700">
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">
          Guardado {lastSaveTime.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </Badge>
    );
  }

  return null;
};
