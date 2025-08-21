
import React from 'react';
import { Calendar, CheckCircle, AlertCircle, Clock, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PeriodStatus, PeriodStatusInfo } from '@/types/payroll';

interface DialogHeaderProps {
  periodStatus: PeriodStatus | null;
}

const isPeriodStatusInfo = (status: PeriodStatus): status is PeriodStatusInfo => {
  return typeof status === 'object' && status !== null && 'status' in status;
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({ periodStatus }) => {
  const statusInfo = periodStatus && isPeriodStatusInfo(periodStatus) ? periodStatus : null;

  const getStatusIcon = () => {
    if (!statusInfo) return <Clock className="h-5 w-5 text-gray-500" />;
    
    switch (statusInfo.action) {
      case 'resume':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'create':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'wait':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Wrench className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    if (!statusInfo) return null;
    
    const badgeConfig = {
      resume: { text: 'Continuar', className: 'bg-green-100 text-green-800' },
      create: { text: 'Crear', className: 'bg-blue-100 text-blue-800' },
      wait: { text: 'Revisar', className: 'bg-orange-100 text-orange-800' }
    };
    
    const config = badgeConfig[statusInfo.action as keyof typeof badgeConfig];
    if (!config) return null;
    
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  return (
    <div className="flex items-center space-x-3 mb-4">
      {getStatusIcon()}
      <div className="flex-1">
        <h3 className="text-lg font-semibold">
          {statusInfo?.message || 'Cargando estado del período...'}
        </h3>
      </div>
      {getStatusBadge()}
    </div>
  );
};
