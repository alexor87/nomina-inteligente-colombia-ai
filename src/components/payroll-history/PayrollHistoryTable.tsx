
import React from 'react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
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
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      cerrado: { 
        variant: 'default' as const, 
        className: 'bg-green-100 text-green-800 border-green-200',
        label: 'Cerrado' 
      },
      con_errores: { 
        variant: 'destructive' as const, 
        className: 'bg-red-100 text-red-800 border-red-200',
        label: 'Con Errores' 
      },
      revision: { 
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'En Revisión' 
      },
      editado: { 
        variant: 'outline' as const, 
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Editado' 
      },
      reabierto: { 
        variant: 'outline' as const, 
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Reabierto' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.revision;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeLabels = {
      semanal: 'Semanal',
      quincenal: 'Quincenal', 
      mensual: 'Mensual',
      personalizado: 'Personalizado'
    };
    
    return (
      <Badge variant="outline" className="text-xs">
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  if (periods.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay períodos de nómina</h3>
        <p className="text-gray-500">Aún no se han procesado períodos de nómina para mostrar en el historial.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empleados
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Devengado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Neto Pagado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Archivo PILA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado Pagos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onPeriodClick(period)}
                    className="text-left"
                  >
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                      {period.period}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(period.startDate).toLocaleDateString('es-ES')} - {new Date(period.endDate).toLocaleDateString('es-ES')}
                    </div>
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {period.employeesCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(period.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(period.totalGrossPay)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(period.totalNetPay)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {period.pilaFileUrl ? (
                    <span className="text-green-600">Generado</span>
                  ) : (
                    <span className="text-gray-400">Pendiente</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={period.paymentStatus === 'pagado' ? 'default' : 'secondary'}>
                    {period.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(period)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {canUserEditPeriods && period.editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditPeriod(period)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
