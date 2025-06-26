
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
        return <Clock className="h-8 w-8 text-blue-600" />;
      case 'create_new':
        return <Play className="h-8 w-8 text-green-600" />;
      case 'configure':
        return <Settings className="h-8 w-8 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Calendar className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (periodStatus.action) {
      case 'resume':
        return <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm font-medium">En curso</Badge>;
      case 'create_new':
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm font-medium">Nuevo período</Badge>;
      case 'configure':
        return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1 text-sm font-medium">Configuración</Badge>;
      case 'error':
        return <Badge variant="destructive" className="px-3 py-1 text-sm font-medium">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <DialogHeader className="text-center space-y-6 pb-2">
      <div className="mx-auto p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
        {getIcon()}
      </div>
      
      <div className="space-y-3">
        <DialogTitle className="text-2xl font-semibold text-gray-900 leading-tight">
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
