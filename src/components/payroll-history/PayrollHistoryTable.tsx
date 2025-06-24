
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Download, Edit, FileText } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface PayrollHistoryTableProps {
  periods: PayrollHistoryPeriod[];
  onViewDetails: (period: PayrollHistoryPeriod) => void;
  onReopenPeriod: (period: PayrollHistoryPeriod) => void;
  onDownloadFile?: (fileUrl: string, fileName: string) => void;
}

export const PayrollHistoryTable = ({ 
  periods, 
  onViewDetails, 
  onReopenPeriod, 
  onDownloadFile 
}: PayrollHistoryTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: PayrollHistoryPeriod['status']) => {
    const statusConfig = {
      cerrado: { color: 'bg-green-100 text-green-800', text: 'Cerrado', icon: '✓' },
      con_errores: { color: 'bg-red-100 text-red-800', text: 'Con errores', icon: '✗' },
      revision: { color: 'bg-yellow-100 text-yellow-800', text: 'En revisión', icon: '⚠' },
      editado: { color: 'bg-blue-100 text-blue-800', text: 'Editado', icon: '✏' }
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

  const canReopen = (period: PayrollHistoryPeriod) => {
    // Lógica para determinar si se puede reabrir
    return period.status === 'cerrado' || period.status === 'con_errores';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Período</TableHead>
            <TableHead className="font-semibold text-center">Empleados</TableHead>
            <TableHead className="font-semibold">Estado</TableHead>
            <TableHead className="font-semibold">Total Devengado</TableHead>
            <TableHead className="font-semibold">Neto Pagado</TableHead>
            <TableHead className="font-semibold">Archivo PILA</TableHead>
            <TableHead className="font-semibold">Estado Pagos</TableHead>
            <TableHead className="font-semibold text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => (
            <TableRow key={period.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                <div>
                  <div className="text-sm font-medium text-gray-900">{period.period}</div>
                  <div className="text-xs text-gray-500 capitalize">{period.type}</div>
                  {period.version > 1 && (
                    <div className="text-xs text-blue-600 font-medium">v{period.version}</div>
                  )}
                  {period.editedBy && (
                    <div className="text-xs text-gray-400">
                      Editado por {period.editedBy.split('@')[0]}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-center">
                  <span className="text-lg font-semibold text-gray-900">{period.employeesCount}</span>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(period.status)}
              </TableCell>
              <TableCell className="font-medium text-green-600">
                {formatCurrency(period.totalGrossPay)}
              </TableCell>
              <TableCell className="font-medium text-blue-600">
                {formatCurrency(period.totalNetPay)}
              </TableCell>
              <TableCell>
                {period.pilaFileUrl ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => handleDownloadPila(period)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Descargar
                  </Button>
                ) : (
                  <span className="text-gray-400 text-sm">No disponible</span>
                )}
              </TableCell>
              <TableCell>
                {getPaymentStatusBadge(period.paymentStatus)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewDetails(period)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onReopenPeriod(period)}
                    className="text-orange-600 hover:text-orange-800"
                    disabled={!canReopen(period)}
                    title={canReopen(period) ? "Reabrir período" : "No se puede reabrir"}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-green-600 hover:text-green-800"
                    onClick={() => handleDownloadPila(period)}
                    title="Descargar archivos"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {periods.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron períodos que coincidan con los filtros</p>
        </div>
      )}
    </div>
  );
};
