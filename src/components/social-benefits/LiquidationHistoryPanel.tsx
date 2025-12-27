import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  History, 
  Loader2, 
  Ban, 
  FileDown, 
  Eye, 
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { 
  SocialBenefitsLiquidationService, 
  PaymentHistoryItem 
} from '@/services/SocialBenefitsLiquidationService';
import { AnulacionDialog } from './AnulacionDialog';
import { LiquidationDetailModal } from './LiquidationDetailModal';
import { SocialBenefitsExportService } from '@/services/SocialBenefitsExportService';
import { useToast } from '@/hooks/use-toast';
import type { BenefitType } from '@/types/social-benefits';

const BENEFIT_LABELS: Record<string, { label: string; icon: string }> = {
  prima: { label: 'Prima de Servicios', icon: '🎁' },
  cesantias: { label: 'Cesantías', icon: '📦' },
  intereses_cesantias: { label: 'Intereses Cesantías', icon: '💰' },
  vacaciones: { label: 'Vacaciones', icon: '🏖️' },
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const LiquidationHistoryPanel: React.FC = () => {
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [showAnulacionDialog, setShowAnulacionDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const benefitType = filterType !== 'all' ? filterType as BenefitType : undefined;
      const result = await SocialBenefitsLiquidationService.getPaymentHistory(
        companyId,
        benefitType
      );

      if (result.success && result.payments) {
        setPayments(result.payments);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo cargar el historial',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [companyId, filterType]);

  const handleAnular = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setShowAnulacionDialog(true);
  };

  const handleAnulacionSuccess = () => {
    setShowAnulacionDialog(false);
    setSelectedPayment(null);
    loadHistory();
  };

  const handleViewDetail = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleExport = async (payment: PaymentHistoryItem, format: 'excel' | 'pdf') => {
    setIsExporting(payment.id);
    try {
      if (format === 'excel') {
        SocialBenefitsExportService.exportToExcel(payment);
      } else {
        SocialBenefitsExportService.exportToPDF(payment);
      }
      toast({
        title: 'Exportación completada',
        description: `Archivo ${format.toUpperCase()} descargado exitosamente`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar el archivo',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Liquidaciones
            </CardTitle>
            <CardDescription>
              Consulta todas las liquidaciones de prestaciones sociales realizadas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prestaciones</SelectItem>
                <SelectItem value="prima">Prima de Servicios</SelectItem>
                <SelectItem value="cesantias">Cesantías</SelectItem>
                <SelectItem value="intereses_cesantias">Intereses Cesantías</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadHistory} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sin liquidaciones</h3>
            <p className="text-muted-foreground">
              No se encontraron liquidaciones de prestaciones sociales
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Empleados</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const benefitInfo = BENEFIT_LABELS[payment.benefit_type] || { label: payment.benefit_type, icon: '📋' };
                  return (
                    <TableRow key={payment.id} className={payment.anulado ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{benefitInfo.icon}</span>
                          <span className="font-medium">{benefitInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>{payment.period_label}</TableCell>
                      <TableCell className="text-center">{payment.employees_count}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {payment.anulado ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Anulado
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Pagado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(payment)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExport(payment, 'excel')}
                            disabled={isExporting === payment.id}
                            title="Descargar Excel"
                          >
                            {isExporting === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                          </Button>
                          {!payment.anulado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAnular(payment)}
                              className="text-destructive hover:text-destructive"
                              title="Anular liquidación"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {selectedPayment && (
        <>
          <AnulacionDialog
            isOpen={showAnulacionDialog}
            onClose={() => setShowAnulacionDialog(false)}
            payment={selectedPayment}
            onSuccess={handleAnulacionSuccess}
          />
          <LiquidationDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            payment={selectedPayment}
            onExport={handleExport}
          />
        </>
      )}
    </Card>
  );
};
