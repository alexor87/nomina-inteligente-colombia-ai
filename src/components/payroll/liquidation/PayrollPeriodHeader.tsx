
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertCircle, Edit, Save, X, Users, DollarSign, Lock, Plus, RefreshCw } from 'lucide-react';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { Input } from '@/components/ui/input';
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';

interface PayrollPeriodHeaderProps {
  period: PayrollPeriod | null;
  periodStatus: PeriodStatus | null;
  onCreateNewPeriod: () => Promise<void>;
  onRefreshPeriod: (retryCount?: number) => Promise<void>;
}

const statusConfig = {
  borrador: { 
    label: 'Borrador', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: Edit
  },
  en_proceso: { 
    label: 'Procesando', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: AlertCircle
  },
  cerrado: { 
    label: 'Cerrado', 
    color: 'bg-gray-50 text-gray-700 border-gray-200', 
    icon: Lock
  },
  aprobado: { 
    label: 'Aprobado', 
    color: 'bg-green-50 text-green-700 border-green-200', 
    icon: CheckCircle
  }
} as const;

export const PayrollPeriodHeader = ({ 
  period, 
  periodStatus,
  onCreateNewPeriod,
  onRefreshPeriod
}: PayrollPeriodHeaderProps) => {
  if (!period && periodStatus?.action === 'suggest_next') {
    return (
      <div className="px-6 py-6 bg-blue-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Liquidación de Nómina</h1>
            <p className="text-blue-700 mt-2">{periodStatus.message}</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={onCreateNewPeriod}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Período
            </Button>
            <Button
              onClick={() => onRefreshPeriod()}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-100 rounded w-48"></div>
        </div>
      </div>
    );
  }

  const config = statusConfig[period.estado];
  const StatusIcon = config.icon;

  const formatPeriod = () => {
    if (!period.fecha_inicio || !period.fecha_fin) return 'Período no definido';
    return PayrollPeriodService.formatPeriodText(period.fecha_inicio, period.fecha_fin);
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Liquidación de Nómina</h1>
          <Badge className={`${config.color} flex items-center space-x-1 px-3 py-1 border`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-sm font-medium">{config.label}</span>
          </Badge>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Calendar className="h-5 w-5 text-gray-400" />
        <span className="text-lg font-medium text-gray-900">{formatPeriod()}</span>
      </div>
    </div>
  );
};
