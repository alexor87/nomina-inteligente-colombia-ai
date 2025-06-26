
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Download, 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { PayrollVoucher } from '@/types/vouchers';

interface VoucherTableRowProps {
  voucher: PayrollVoucher;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onDownload: (id: string) => void;
  onSendEmail: (id: string) => void;
  onRegenerate: (id: string) => void;
}

const statusConfig = {
  generado: { 
    label: 'Generado', 
    color: 'bg-green-50 text-green-700 border-green-200', 
    icon: CheckCircle 
  },
  pendiente: { 
    label: 'Pendiente', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
    icon: Clock 
  },
  enviado: { 
    label: 'Enviado', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: Mail 
  },
  error: { 
    label: 'Error', 
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: XCircle 
  }
};

export const VoucherTableRow = ({
  voucher,
  isSelected,
  onToggleSelection,
  onDownload,
  onSendEmail,
  onRegenerate
}: VoucherTableRowProps) => {
  const config = statusConfig[voucher.voucherStatus];
  const StatusIcon = config.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
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
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {voucher.employeeName || 'Sin nombre'}
          </div>
          <div className="text-sm text-gray-500">
            {voucher.employeeCedula && `CC: ${voucher.employeeCedula}`}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">{voucher.periodo}</div>
          <div className="text-gray-500">
            {formatDate(voucher.startDate)} - {formatDate(voucher.endDate)}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="font-medium">
        {formatCurrency(voucher.netPay)}
      </TableCell>
      
      <TableCell>
        <Badge className={`${config.color} flex items-center space-x-1 px-2 py-1 border w-fit`}>
          <StatusIcon className="h-3 w-3" />
          <span className="text-xs">{config.label}</span>
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-1">
          {voucher.sentToEmployee ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">Enviado</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-500">
              <XCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">No enviado</span>
            </div>
          )}
          {voucher.sentDate && (
            <div className="text-xs text-gray-400">
              {formatDate(voucher.sentDate)}
            </div>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        {voucher.pdfUrl ? (
          <div className="flex items-center text-green-600">
            <FileText className="h-4 w-4 mr-1" />
            <span className="text-sm">Disponible</span>
          </div>
        ) : (
          <div className="flex items-center text-gray-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">No generado</span>
          </div>
        )}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(voucher.id)}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Descargar PDF</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSendEmail(voucher.id)}
                disabled={!voucher.employeeEmail}
                className="h-8 w-8 p-0"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {voucher.employeeEmail 
                  ? 'Enviar por correo' 
                  : 'Sin correo registrado'
                }
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerate(voucher.id)}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerar comprobante</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};
