
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { PayrollVoucher } from '@/types/vouchers';
import { 
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  Mail,
  RefreshCw
} from 'lucide-react';

interface VoucherTableRowProps {
  voucher: PayrollVoucher;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onDownload: (id: string) => void;
  onSendEmail: (id: string) => void;
  onRegenerate: (id: string) => void;
}

export const VoucherTableRow = ({
  voucher,
  isSelected,
  onToggleSelection,
  onDownload,
  onSendEmail,
  onRegenerate
}: VoucherTableRowProps) => {
  const getStatusColor = (status: string) => {
    const colors = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'generado': 'bg-blue-100 text-blue-800',
      'enviado': 'bg-green-100 text-green-800',
      'error': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enviado':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendiente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(voucher.id)}
        />
      </TableCell>
      
      <TableCell>
        <div>
          <div className="font-medium text-gray-900">
            {voucher.employeeName}
          </div>
          <div className="text-sm text-gray-500">
            CC: {voucher.employeeCedula}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="text-sm font-medium text-gray-900">
          {voucher.periodo}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(voucher.startDate).toLocaleDateString('es-CO')} - {new Date(voucher.endDate).toLocaleDateString('es-CO')}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium text-gray-900">
          ${voucher.netPay.toLocaleString('es-CO')}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          {getStatusIcon(voucher.voucherStatus)}
          <Badge className={getStatusColor(voucher.voucherStatus)}>
            {voucher.voucherStatus}
          </Badge>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          {voucher.sentToEmployee ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Sí</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">No</span>
            </>
          )}
        </div>
        {voucher.sentDate && (
          <div className="text-xs text-gray-500">
            {new Date(voucher.sentDate).toLocaleDateString('es-CO')}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {voucher.pdfUrl ? (
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(voucher.pdfUrl, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDownload(voucher.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar PDF</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No disponible</span>
        )}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-1">
          {!voucher.sentToEmployee && voucher.employeeEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSendEmail(voucher.id)}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar por correo</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRegenerate(voucher.id)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerar</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};
