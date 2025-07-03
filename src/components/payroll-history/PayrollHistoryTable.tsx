
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Calendar, Users, DollarSign } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';

interface PayrollHistoryTableProps {
  periods: PayrollHistoryPeriod[];
  onPeriodClick: (period: PayrollHistoryPeriod) => void;
  onViewDetails: (period: PayrollHistoryPeriod) => void;
  onEditPeriod: (period: PayrollHistoryPeriod) => void;
  canUserEditPeriods: boolean;
}

export const PayrollHistoryTable: React.FC<PayrollHistoryTableProps> = ({
  periods,
  onPeriodClick,
  onViewDetails,
  onEditPeriod,
  canUserEditPeriods
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'cerrado':
        return 'default';
      case 'borrador':
        return 'secondary';
      case 'editado':
        return 'outline';
      case 'reabierto':
        return 'destructive';
      case 'con_errores':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cerrado':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'borrador':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      case 'editado':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'reabierto':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'con_errores':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (periods.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay períodos de nómina</h3>
          <p className="text-gray-500">Aún no se han procesado períodos de nómina en tu empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Período</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Empleados</TableHead>
            <TableHead className="text-right">Total Devengado</TableHead>
            <TableHead className="text-right">Total Neto</TableHead>
            <TableHead className="text-center">Fecha Creación</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => (
            <TableRow 
              key={period.id}
              className="cursor-pointer hover:bg-gray-50/80 transition-colors"
              onClick={() => onPeriodClick(period)}
            >
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">
                    {period.period}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(period.startDate).toLocaleDateString('es-CO')} - {new Date(period.endDate).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  className={`${getStatusColor(period.status)} font-medium`}
                >
                  {period.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <Users className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="font-medium">{period.employeesCount}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(period.totalGrossPay)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatCurrency(period.totalNetPay)}
              </TableCell>
              <TableCell className="text-center text-sm text-gray-500">
                {new Date(period.createdAt).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(period);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canUserEditPeriods && period.editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPeriod(period);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
