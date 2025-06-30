
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Edit, Save, X, Lock, CheckCircle } from 'lucide-react';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

interface PayrollPeriodCardProps {
  period: PayrollPeriod | null;
  isValid: boolean;
  canEdit: boolean;
  onApprove: () => void;
  onUpdatePeriod: (startDate: string, endDate: string) => void;
  employeeCount: number;
  validEmployeeCount: number;
  totalPayroll: number;
}

const statusConfig = {
  borrador: { 
    label: 'Borrador', 
    color: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  aprobado: { 
    label: 'Aprobado', 
    color: 'bg-green-50 text-green-700 border-green-200'
  }
};

export const PayrollPeriodCard = ({ 
  period, 
  isValid, 
  canEdit,
  onApprove,
  onUpdatePeriod,
  employeeCount,
  validEmployeeCount,
  totalPayroll
}: PayrollPeriodCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  if (!period) {
    return (
      <Card className="p-6 border-gray-200 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-48"></div>
          <div className="h-4 bg-gray-100 rounded w-32"></div>
        </div>
      </Card>
    );
  }

  const config = statusConfig[period.estado];
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
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    if (tempStartDate && tempEndDate) {
      onUpdatePeriod(tempStartDate, tempEndDate);
    }
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setTempStartDate('');
    setTempEndDate('');
    setIsEditing(false);
  };

  return (
    <Card className="p-6 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Período de Nómina</h3>
            <Badge className={`${config.color} flex items-center space-x-1 px-2 py-1 border mt-1`}>
              {isApproved ? <CheckCircle className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
              <span className="text-sm">{config.label}</span>
            </Badge>
          </div>
        </div>

        {isValid && canEdit && !isApproved && (
          <Button
            onClick={onApprove}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar período
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isEditing && canEdit ? (
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-gray-400">—</span>
              <Input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-auto"
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
              <span className="text-xl font-medium text-gray-900">{formatPeriod()}</span>
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
              {isApproved && <Lock className="h-4 w-4 text-gray-400" />}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span>{validEmployeeCount}/{employeeCount} empleados</span>
          <span className="font-medium">{formatCurrency(totalPayroll)}</span>
        </div>
      </div>
    </Card>
  );
};
