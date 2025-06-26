
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
import { PeriodStatus } from '@/services/payroll-intelligent/PayrollPeriodDetectionService';

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
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 font-medium border-gray-200 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onResumePeriod}
            disabled={isLoading}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 font-medium"
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

    case 'create':
      return (
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <div className="flex gap-2">
            {periodStatus.lastLiquidatedPeriodId && (
              <Button 
                variant="outline" 
                onClick={onViewLastPeriod}
                disabled={isLoading}
                className="h-10 px-3 font-medium border-gray-200 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver último
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 font-medium border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </Button>
          </div>
          <Button 
            onClick={onCreateNewPeriod}
            disabled={isLoading}
            className="h-10 px-4 bg-green-600 hover:bg-green-700 font-medium"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Iniciar período
          </Button>
        </DialogFooter>
      );

    case 'configure':
      return (
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 font-medium border-gray-200 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onGoToSettings}
            disabled={isLoading}
            className="h-10 px-4 bg-orange-600 hover:bg-orange-700 font-medium"
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

    case 'view_last':
      return (
        <DialogFooter className="pt-4">
          <Button 
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 font-medium w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      );

    default:
      return null;
  }
};
