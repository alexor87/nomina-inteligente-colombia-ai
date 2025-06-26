
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
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs font-medium px-2 py-1">
            En curso
          </Badge>
        );
      case 'create_new':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-xs font-medium px-2 py-1">
            Nuevo período
          </Badge>
        );
      case 'configure':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 text-xs font-medium px-2 py-1">
            Configuración
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs font-medium px-2 py-1">
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <DialogHeader className="text-center space-y-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          {getIcon()}
        </div>
      </div>
      
      {/* Title and Badge */}
      <div className="space-y-3">
        <DialogTitle className="text-xl font-semibold text-gray-900 leading-tight">
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
