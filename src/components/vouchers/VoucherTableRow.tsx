
import { useState } from 'react';
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
  RefreshCw,
  FileText
} from 'lucide-react';
import { VoucherPreviewModal } from './VoucherPreviewModal';

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
  const [showPreview, setShowPreview] = useState(false);

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
      case 'generado':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleViewPreview = () => {
    setShowPreview(true);
  };

  const handleDownloadPdf = () => {
    if (voucher.voucherStatus === 'generado' || voucher.pdfUrl) {
      onDownload(voucher.id);
    } else {
      // Si no está generado, regenerar primero
      onRegenerate(voucher.id);
    }
  };

  return (
    <>
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
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleViewPreview}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver comprobante</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownloadPdf}
                  className="text-green-600 hover:text-green-800"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar PDF</TooltipContent>
            </Tooltip>
          </div>
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
                    disabled={voucher.voucherStatus !== 'generado'}
                    className="text-purple-600 hover:text-purple-800"
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
                  className="text-orange-600 hover:text-orange-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerar</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      <VoucherPreviewModal
        voucher={voucher}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onDownload={onDownload}
        onSendEmail={onSendEmail}
      />
    </>
  );
};
