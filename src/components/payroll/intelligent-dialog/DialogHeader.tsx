
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
import { PeriodStatus } from '@/services/payroll-intelligent/PayrollPeriodDetectionService';

interface DialogHeaderProps {
  periodStatus: PeriodStatus;
}

export const IntelligentDialogHeader: React.FC<DialogHeaderProps> = ({
  periodStatus
}) => {
  const getIcon = () => {
    switch (periodStatus.action) {
      case 'resume':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'create':
        return <Play className="h-5 w-5 text-green-600" />;
      case 'configure':
        return <Settings className="h-5 w-5 text-orange-600" />;
      case 'view_last':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (periodStatus.action) {
      case 'resume':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs font-medium px-2 py-0.5">
            En curso
          </Badge>
        );
      case 'create':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-xs font-medium px-2 py-0.5">
            Nuevo período
          </Badge>
        );
      case 'configure':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 text-xs font-medium px-2 py-0.5">
            Configuración
          </Badge>
        );
      case 'view_last':
        return (
          <Badge variant="destructive" className="text-xs font-medium px-2 py-0.5">
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <DialogHeader className="text-center space-y-3">
      {/* Icon - Smaller */}
      <div className="flex justify-center">
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          {getIcon()}
        </div>
      </div>
      
      {/* Title and Badge - Reduced spacing */}
      <div className="space-y-2">
        <DialogTitle className="text-lg font-semibold text-gray-900 leading-tight">
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
