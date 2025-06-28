
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Download, FileText, Edit2 } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface PayrollHistoryTableProps {
  periods: PayrollHistoryPeriod[];
  onViewDetails: (period: PayrollHistoryPeriod) => void;
  onEditPeriod?: (period: PayrollHistoryPeriod) => void;
  onDownloadFile?: (fileUrl: string, fileName: string) => void;
  canUserEditPeriods?: boolean;
}

export const PayrollHistoryTable = ({ 
  periods, 
  onViewDetails,
  onEditPeriod,
  onDownloadFile,
  canUserEditPeriods = false
}: PayrollHistoryTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPeriodDate = (startDate: string, endDate: string) => {
    return formatPeriodDateRange(startDate, endDate);
  };

  const getStatusBadge = (status: PayrollHistoryPeriod['status']) => {
    const statusConfig = {
      cerrado: { color: 'bg-green-100 text-green-800', text: 'Cerrado', icon: '✓' },
      con_errores: { color: 'bg-red-100 text-red-800', text: 'Con errores', icon: '✗' },
      revision: { color: 'bg-yellow-100 text-yellow-800', text: 'En revisión', icon: '⚠' },
      editado: { color: 'bg-blue-100 text-blue-800', text: 'Editado', icon: '✏' },
      reabierto: { color: 'bg-amber-100 text-amber-800', text: 'Reabierto', icon: '🔓' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: PayrollHistoryPeriod['paymentStatus']) => {
    const statusConfig = {
      pagado: { color: 'bg-green-100 text-green-800', text: 'Pagado', icon: '✓' },
      parcial: { color: 'bg-yellow-100 text-yellow-800', text: 'Parcial', icon: '⚠' },
      pendiente: { color: 'bg-red-100 text-red-800', text: 'Pendiente', icon: '⏳' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const handleDownloadPila = (period: PayrollHistoryPeriod) => {
    if (period.pilaFileUrl && onDownloadFile) {
      onDownloadFile(period.pilaFileUrl, `pila-${period.id}.txt`);
    }
  };

  const handleEditPeriod = (period: PayrollHistoryPeriod) => {
    if (onEditPeriod) {
      onEditPeriod(period);
    }
  };

  // Check if period has vouchers (simplified check based on status)
  const hasVouchers = (period: PayrollHistoryPeriod) => {
    return period.status === 'cerrado' || period.pilaFileUrl;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold min-w-[180px] w-[180px]">Período</TableHead>
              <TableHead className="font-semibold text-center min-w-[100px]">Empleados</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Estado</TableHead>
              <TableHead className="font-semibold min-w-[140px]">Total Devengado</TableHead>
              <TableHead className="font-semibold min-w-[140px]">Neto Pagado</TableHead>
              <TableHead className="font-semibold min-w-[130px]">Archivo PILA</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Estado Pagos</TableHead>
              <TableHead className="font-semibold text-center min-w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id} className="hover:bg-gray-50">
                <TableCell className="font-medium min-w-[180px] w-[180px]">
                  <div className="min-w-0">
                    <button
                      onClick={() => onViewDetails(period)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block truncate"
                      title={formatPeriodDate(period.startDate, period.endDate)}
                    >
                      <span className="whitespace-nowrap">
                        {formatPeriodDate(period.startDate, period.endDate)}
                      </span>
                    </button>
                    <div className="text-xs text-gray-500 capitalize">{period.type}</div>
                    {period.version > 1 && (
                      <div className="text-xs text-blue-600 font-medium">v{period.version}</div>
                    )}
                    {period.editedBy && (
                      <div className="text-xs text-gray-400 truncate">
                        Editado por {period.editedBy.split('@')[0]}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="min-w-[100px]">
                  <div className="text-center">
                    <span className="text-lg font-semibold text-gray-900">{period.employeesCount}</span>
                  </div>
                </TableCell>
                <TableCell className="min-w-[120px]">
                  {getStatusBadge(period.status)}
                </TableCell>
                <TableCell className="font-medium text-green-600 min-w-[140px]">
                  <span className="whitespace-nowrap">
                    {formatCurrency(period.totalGrossPay)}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-blue-600 min-w-[140px]">
                  <span className="whitespace-nowrap">
                    {formatCurrency(period.totalNetPay)}
                  </span>
                </TableCell>
                <TableCell className="min-w-[130px]">
                  {period.pilaFileUrl ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                      onClick={() => handleDownloadPila(period)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-sm">No disponible</span>
                  )}
                </TableCell>
                <TableCell className="min-w-[120px]">
                  {getPaymentStatusBadge(period.paymentStatus)}
                </TableCell>
                <TableCell className="min-w-[140px]">
                  <div className="flex items-center justify-center space-x-1">
                    {/* View Details Button */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewDetails(period)}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Edit Period Button - Only show if user can edit and period is closed */}
                    {canUserEditPeriods && period.status === 'cerrado' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditPeriod(period)}
                        className="text-amber-600 hover:text-amber-800 flex-shrink-0"
                        title="Editar período"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Download Button - Only show if has vouchers */}
                    {hasVouchers(period) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-600 hover:text-green-800 flex-shrink-0"
                        onClick={() => handleDownloadPila(period)}
                        title="Descargar archivos"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {periods.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron períodos que coincidan con los filtros</p>
        </div>
      )}
    </div>
  );
};
