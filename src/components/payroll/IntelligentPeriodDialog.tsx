
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Play, 
  Eye, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface IntelligentPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  periodStatus: PeriodStatus;
  onResumePeriod: () => void;
  onCreateNewPeriod: () => void;
  onViewLastPeriod: () => void;
  onGoToSettings: () => void;
  isLoading: boolean;
}

export const IntelligentPeriodDialog: React.FC<IntelligentPeriodDialogProps> = ({
  isOpen,
  onClose,
  periodStatus,
  onResumePeriod,
  onCreateNewPeriod,
  onViewLastPeriod,
  onGoToSettings,
  isLoading
}) => {
  const getIcon = () => {
    switch (periodStatus.action) {
      case 'resume':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'create_new':
        return <Play className="h-6 w-6 text-green-600" />;
      case 'configure':
        return <Settings className="h-6 w-6 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Calendar className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (periodStatus.action) {
      case 'resume':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">En curso</Badge>;
      case 'create_new':
        return <Badge variant="default" className="bg-green-100 text-green-800">Nuevo periodo</Badge>;
      case 'configure':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Configuración</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const renderActions = () => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-3 rounded-full bg-gray-50">
            {getIcon()}
          </div>
          
          <div className="space-y-2">
            <DialogTitle className="text-xl font-semibold text-center">
              {periodStatus.title}
            </DialogTitle>
            
            {getStatusBadge() && (
              <div className="flex justify-center">
                {getStatusBadge()}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          <DialogDescription className="text-center text-base leading-relaxed">
            {periodStatus.message}
          </DialogDescription>

          {periodStatus.nextPeriod && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Próximo periodo</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tipo:</span> {periodStatus.nextPeriod.type}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Fechas:</span>{' '}
                {new Date(periodStatus.nextPeriod.startDate).toLocaleDateString('es-CO')} -{' '}
                {new Date(periodStatus.nextPeriod.endDate).toLocaleDateString('es-CO')}
              </div>
            </div>
          )}
        </div>

        {renderActions()}
      </DialogContent>
    </Dialog>
  );
};
