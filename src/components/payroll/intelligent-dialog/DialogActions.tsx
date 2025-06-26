
import React from 'react';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { 
  Play, 
  Eye, 
  Settings, 
  CheckCircle,
  Loader2
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
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="order-2 sm:order-1 h-11 px-6 font-medium"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onResumePeriod}
            disabled={isLoading}
            className="order-1 sm:order-2 h-11 px-6 bg-blue-600 hover:bg-blue-700 font-medium shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Continuar nómina
          </Button>
        </DialogFooter>
      );

    case 'create_new':
      return (
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-6">
          <div className="flex gap-3 order-2 sm:order-1">
            {periodStatus.currentPeriod && (
              <Button 
                variant="outline" 
                onClick={onViewLastPeriod}
                disabled={isLoading}
                className="h-11 px-4 font-medium"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver último período
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="h-11 px-6 font-medium"
            >
              Cancelar
            </Button>
          </div>
          <Button 
            onClick={onCreateNewPeriod}
            disabled={isLoading}
            className="order-1 sm:order-2 h-11 px-6 bg-green-600 hover:bg-green-700 font-medium shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Iniciar siguiente período
          </Button>
        </DialogFooter>
      );

    case 'configure':
      return (
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="order-2 sm:order-1 h-11 px-6 font-medium"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onGoToSettings}
            disabled={isLoading}
            className="order-1 sm:order-2 h-11 px-6 bg-orange-600 hover:bg-orange-700 font-medium shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Ir a Configuración
          </Button>
        </DialogFooter>
      );

    case 'error':
      return (
        <DialogFooter className="pt-6">
          <Button 
            onClick={onClose}
            disabled={isLoading}
            className="h-11 px-6 font-medium"
          >
            Cerrar
          </Button>
        </DialogFooter>
      );

    default:
      return null;
  }
};
