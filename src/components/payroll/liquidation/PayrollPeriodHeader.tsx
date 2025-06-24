
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, CheckCircle, AlertCircle, Edit, Save, X, Info, Users, DollarSign } from 'lucide-react';
import { PayrollPeriod } from '@/services/PayrollPeriodService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    description: 'Período en edición - Se pueden hacer cambios'
  },
  en_proceso: { 
    label: 'Procesando', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Clock,
    description: 'Procesando liquidación'  
  },
  cerrado: { 
    label: 'Cerrado', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: AlertCircle,
    description: 'Período cerrado - No se pueden hacer cambios'
  },
  aprobado: { 
    label: 'Aprobado', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    description: 'Período aprobado y finalizado'
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  const config = statusConfig[period.estado];
  const StatusIcon = config.icon;
  const progressPercentage = employeeCount > 0 ? (validEmployeeCount / employeeCount) * 100 : 0;

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

  const validation = PayrollPeriodService.validatePeriod(tempStartDate, tempEndDate);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 sticky top-0 z-40">
      <div className="px-6 py-6">
        {/* Main Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">Liquidación de Nómina</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className={`${config.color} flex items-center space-x-2 px-4 py-2 text-sm font-medium border`}>
                      <StatusIcon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Period Display/Edit */}
            <div className="flex items-center space-x-4">
              <Calendar className="h-5 w-5 text-gray-600" />
              {isEditingPeriod ? (
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Del</span>
                  <Input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-auto h-9 text-sm"
                  />
                  <span className="text-sm font-medium text-gray-700">al</span>
                  <Input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-auto h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveClick} disabled={!validation.isValid}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelClick}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-semibold text-gray-800">{formatPeriod()}</span>
                  {canEdit && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleEditClick}
                      className="h-8 w-8 p-0 hover:bg-white/50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            {canEdit && (
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleEditClick}
                disabled={isLoading || isEditingPeriod}
                className="bg-white hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Cambiar período
              </Button>
            )}
            
            {isValid && canEdit && (
              <Button
                onClick={onApprove}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={isLoading}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Aprobar y cerrar período
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white/70 backdrop-blur-sm border-white/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{employeeCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/70 backdrop-blur-sm border-white/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Válidos</p>
                <p className="text-2xl font-bold text-gray-900">{validEmployeeCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/70 backdrop-blur-sm border-white/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total nómina</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPayroll)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/70 backdrop-blur-sm border-white/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Progreso</p>
                <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-gray-500">
                {validEmployeeCount} de {employeeCount} empleados validados
              </p>
            </div>
          </Card>
        </div>

        {/* Validation Warnings */}
        {isEditingPeriod && validation.warnings.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Advertencias:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {canEdit && !isValid && employeeCount > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Para aprobar el período:</p>
                <p>Corrije los errores en los empleados marcados y asegúrate de que todos estén validados.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
