
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { VoucherFiltersComponent } from './VoucherFilters';
import { VoucherSummaryCards } from './VoucherSummaryCards';
import { useVouchers } from '@/hooks/useVouchers';
import { 
  FileText, 
  Download, 
  Mail, 
  RefreshCw, 
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send
} from 'lucide-react';

export const VouchersPage = () => {
  const {
    vouchers,
    isLoading,
    filters,
    selectedVouchers,
    summary,
    updateFilters,
    clearFilters,
    toggleVoucherSelection,
    toggleAllVouchers,
    downloadVoucher,
    downloadSelectedVouchers,
    sendVoucherByEmail,
    sendSelectedVouchersByEmail,
    regenerateVoucher
  } = useVouchers();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando comprobantes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comprobantes de Nómina</h1>
          <p className="text-gray-600 mt-1">
            Gestiona, descarga y envía comprobantes de nómina de forma eficiente
          </p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <VoucherSummaryCards summary={summary} />

      {/* Filtros */}
      <VoucherFiltersComponent
        filters={filters}
        onUpdateFilters={updateFilters}
        onClearFilters={clearFilters}
        totalCount={summary.totalVouchers}
        filteredCount={vouchers.length}
      />

      {/* Acciones masivas */}
      {selectedVouchers.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-blue-900">
                {selectedVouchers.length} comprobante{selectedVouchers.length !== 1 ? 's' : ''} seleccionado{selectedVouchers.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={downloadSelectedVouchers}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar ZIP
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={sendSelectedVouchersByEmail}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar por correo
                </Button>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => toggleAllVouchers()}
            >
              Deseleccionar todo
            </Button>
          </div>
        </Card>
      )}

      {/* Tabla de comprobantes */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedVouchers.length === vouchers.length && vouchers.length > 0}
                    onCheckedChange={toggleAllVouchers}
                  />
                </TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedVouchers.includes(voucher.id)}
                      onCheckedChange={() => toggleVoucherSelection(voucher.id)}
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
                              onClick={() => downloadVoucher(voucher.id)}
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
                              onClick={() => sendVoucherByEmail(voucher.id)}
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
                            onClick={() => regenerateVoucher(voucher.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerar</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {vouchers.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-4">
              No se encontraron comprobantes que coincidan con los filtros aplicados.
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
