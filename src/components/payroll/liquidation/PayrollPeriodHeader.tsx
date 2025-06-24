
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle, Edit, Save, X } from 'lucide-react';
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
}

const statusConfig = {
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Clock },
  en_proceso: { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock },
  cerrado: { label: 'Cerrado', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  aprobado: { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export const PayrollPeriodHeader = ({ 
  period, 
  isLoading, 
  isValid, 
  canEdit,
  isEditingPeriod,
  setIsEditingPeriod,
  onApprove,
  onUpdatePeriod
}: PayrollPeriodHeaderProps) => {
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  if (!period) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liquidar Nómina</h1>
            <p className="text-sm text-gray-600">Cargando período...</p>
          </div>
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
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidar Nómina</h1>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            
            {/* Período editable inline */}
            {isEditingPeriod ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Del</span>
                <Input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-auto h-8 text-sm"
                />
                <span className="text-sm text-gray-600">al</span>
                <Input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-auto h-8 text-sm"
                />
                <Button size="sm" onClick={handleSaveClick} disabled={!validation.isValid}>
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelClick}>
                  <X className="h-3 w-3" />
                </Button>
                {hasWarnings && (
                  <Badge variant="destructive" className="text-xs">
                    {validation.warnings[0]}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{formatPeriod()}</span>
                {canEdit && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleEditClick}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            
            <Badge className={`${config.color} flex items-center space-x-1`}>
              <StatusIcon className="h-3 w-3" />
              <span>{config.label}</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isValid && canEdit && (
          <Button
            onClick={onApprove}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar y cerrar período
          </Button>
        )}
        
        {canEdit && !isEditingPeriod && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditClick}
            disabled={isLoading}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Cambiar período
          </Button>
        )}

        {!canEdit && (
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            Período {period.estado}
          </div>
        )}
      </div>
    </div>
  );
};
