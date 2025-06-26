
import React from 'react';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { 
  Play, 
  Eye, 
  Settings, 
  CheckCircle
} from "lucide-react";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface DialogActionsProps {
  periodStatus: PeriodStatus;
  onResumePeriod: () => void;
  onCreateNewPeriod: () => void;
  onViewLastPeriod: () => void;
  onGoToSettings: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export const DialogActions: React.FC<DialogActionsProps> = ({
  periodStatus,
  onResumePeriod,
  onCreateNewPeriod,
  onViewLastPeriod,
  onGoToSettings,
  onClose,
  isLoading
}) => {
  switch (periodStatus.action) {
    case 'resume':
      return (
        <DialogFooter className="gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={onResumePeriod}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Continuar nómina
          </Button>
        </DialogFooter>
      );

    case 'create_new':
      return (
        <DialogFooter className="gap-3 sm:gap-2">
          {periodStatus.currentPeriod && (
            <Button 
              variant="outline" 
              onClick={onViewLastPeriod}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver último periodo
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={onCreateNewPeriod}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Iniciar siguiente periodo
          </Button>
        </DialogFooter>
      );

    case 'configure':
      return (
        <DialogFooter className="gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={onGoToSettings}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Ir a Configuración
          </Button>
        </DialogFooter>
      );

    case 'error':
      return (
        <DialogFooter>
          <Button 
            onClick={onClose}
            disabled={isLoading}
          >
            Cerrar
          </Button>
        </DialogFooter>
      );

    default:
      return null;
  }
};
