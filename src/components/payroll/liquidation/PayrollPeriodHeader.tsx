
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertCircle, Edit, Save, X, Users, DollarSign, Lock } from 'lucide-react';
import { PayrollPeriod } from '@/services/PayrollPeriodService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { Input } from '@/components/ui/input';

interface PayrollPeriodHeaderProps {
  period: PayrollPeriod | null;
  isLoading: boolean;
  isValid: boolean;
  canEdit: boolean;
  isEditingPeriod: boolean;
  setIsEditingPeriod: (editing: boolean) => void;
  onApprove: () => void;
  onUpdatePeriod: (startDate: string, endDate: string) => void;
  employeeCount?: number;
  validEmployeeCount?: number;
  totalPayroll?: number;
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
};

export const PayrollPeriodHeader = ({ 
  period, 
  isLoading, 
  isValid, 
  canEdit,
  isEditingPeriod,
  setIsEditingPeriod,
  onApprove,
  onUpdatePeriod,
  employeeCount = 0,
  validEmployeeCount = 0,
  totalPayroll = 0
}: PayrollPeriodHeaderProps) => {
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

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
  const isApproved = period.estado === 'aprobado';

  const formatPeriod = () => {
    if (!period.fecha_inicio || !period.fecha_fin) return 'Período no definido';
    return PayrollPeriodService.formatPeriodText(period.fecha_inicio, period.fecha_fin);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditClick = () => {
    setTempStartDate(period.fecha_inicio);
    setTempEndDate(period.fecha_fin);
    setIsEditingPeriod(true);
  };

  const handleSaveClick = () => {
    if (tempStartDate && tempEndDate) {
      onUpdatePeriod(tempStartDate, tempEndDate);
    }
    setIsEditingPeriod(false);
  };

  const handleCancelClick = () => {
    setTempStartDate('');
    setTempEndDate('');
    setIsEditingPeriod(false);
  };

  return (
    <div className="px-6 py-6">
      {/* Title and status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Liquidación de Nómina</h1>
          <Badge className={`${config.color} flex items-center space-x-1 px-3 py-1 border`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-sm font-medium">{config.label}</span>
          </Badge>
          {isApproved && (
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-md border">
              Período cerrado para edición
            </div>
          )}
        </div>

        {/* Action button - only show if can edit and is valid */}
        {isValid && canEdit && !isApproved && (
          <Button
            onClick={onApprove}
            className="bg-green-600 hover:bg-green-700 text-white font-medium"
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar período
          </Button>
        )}
      </div>

      {/* Period display/edit and stats in one clean line */}
      <div className="flex items-center justify-between">
        {/* Period section */}
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          {isEditingPeriod && canEdit ? (
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-auto h-8"
              />
              <span className="text-gray-400">—</span>
              <Input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-auto h-8"
              />
              <Button size="sm" onClick={handleSaveClick}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelClick}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-gray-900">{formatPeriod()}</span>
              {canEdit && !isApproved && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleEditClick}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {isApproved && (
                <Lock className="h-4 w-4 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Clean stats */}
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{validEmployeeCount}/{employeeCount} empleados</span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">{formatCurrency(totalPayroll)}</span>
          </div>
          {isApproved && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              Comprobantes generados
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
