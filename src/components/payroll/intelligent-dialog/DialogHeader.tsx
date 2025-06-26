
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar, 
  Play, 
  Settings, 
  AlertCircle,
  Clock
} from "lucide-react";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface DialogHeaderProps {
  periodStatus: PeriodStatus;
}

export const IntelligentDialogHeader: React.FC<DialogHeaderProps> = ({
  periodStatus
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

  return (
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
  );
};
