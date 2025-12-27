import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, FileText, CheckCircle, XCircle, Calendar, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaymentHistoryItem } from '@/services/SocialBenefitsLiquidationService';

interface LiquidationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentHistoryItem;
  onExport: (payment: PaymentHistoryItem, format: 'excel' | 'pdf') => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const BENEFIT_LABELS: Record<string, { label: string; icon: string }> = {
  prima: { label: 'Prima de Servicios', icon: '🎁' },
  cesantias: { label: 'Cesantías', icon: '📦' },
  intereses_cesantias: { label: 'Intereses de Cesantías', icon: '💰' },
  vacaciones: { label: 'Vacaciones', icon: '🏖️' },
};

export const LiquidationDetailModal: React.FC<LiquidationDetailModalProps> = ({
  isOpen,
  onClose,
  payment,
  onExport,
}) => {
  const benefitInfo = BENEFIT_LABELS[payment.benefit_type] || { label: payment.benefit_type, icon: '📋' };
  const employees = payment.payment_details?.employees || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{benefitInfo.icon}</span>
            {benefitInfo.label}
          </DialogTitle>
          <DialogDescription>
            Detalle de la liquidación - {payment.period_label}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Estado y fecha */}
          <div className="flex items-center justify-between">
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
            <span className="text-sm text-muted-foreground">
              {format(new Date(payment.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </span>
          </div>

          {/* Información de anulación */}
          {payment.anulado && payment.anulacion_motivo && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-destructive mb-1">Motivo de anulación:</h4>
              <p className="text-sm text-muted-foreground">{payment.anulacion_motivo}</p>
              {payment.anulado_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Anulado el {format(new Date(payment.anulado_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Empleados</p>
                <p className="text-2xl font-bold">{payment.employees_count}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="text-lg font-bold">{payment.period_label}</p>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(payment.total_amount)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tabla de empleados */}
          {employees.length > 0 ? (
            <div className="border rounded-lg">
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-center">Quincenas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: any, index: number) => (
                      <TableRow key={emp.id || index}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-center">{emp.periodsCount || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(emp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay detalle de empleados disponible
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={() => onExport(payment, 'excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => onExport(payment, 'pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
