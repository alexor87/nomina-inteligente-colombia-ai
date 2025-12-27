import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Users, DollarSign, Calendar, Loader2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  LiquidationPreview,
  OpenPeriod,
  EmployeeLiquidationPreview,
} from '@/services/SocialBenefitsLiquidationService';

interface LiquidationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (skipOpenPeriods: boolean) => Promise<void>;
  preview: LiquidationPreview | null;
  benefitLabel: string;
  benefitIcon: string;
  benefitType?: string;
  isProcessing: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Función para calcular alertas de fechas de corte legal
const getLegalDeadlineAlert = (benefitType?: string): { message: string; urgency: 'info' | 'warning' | 'urgent' } | null => {
  if (!benefitType) return null;
  
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  if (benefitType === 'prima') {
    // Prima 1er semestre: límite 30 junio
    if (month === 5) { // Junio
      if (day >= 25) return { message: 'La prima de primer semestre vence el 30 de junio', urgency: 'urgent' };
      if (day >= 15) return { message: 'Quedan pocos días para el límite del 30 de junio', urgency: 'warning' };
    }
    // Prima 2do semestre: límite 20 diciembre
    if (month === 11) { // Diciembre
      if (day >= 15) return { message: 'La prima de segundo semestre vence el 20 de diciembre', urgency: 'urgent' };
      if (day >= 5) return { message: 'El límite para prima de segundo semestre es el 20 de diciembre', urgency: 'warning' };
    }
  }

  if (benefitType === 'cesantias') {
    // Cesantías: consignar antes del 14 de febrero
    if (month === 0) { // Enero
      if (day >= 25) return { message: 'Las cesantías deben consignarse antes del 14 de febrero', urgency: 'urgent' };
      return { message: 'Recuerde: el límite de consignación de cesantías es el 14 de febrero', urgency: 'info' };
    }
    if (month === 1 && day <= 14) { // Febrero
      if (day >= 10) return { message: '¡Última semana! Las cesantías deben consignarse antes del 14 de febrero', urgency: 'urgent' };
      return { message: 'Las cesantías deben consignarse antes del 14 de febrero', urgency: 'warning' };
    }
  }

  if (benefitType === 'intereses_cesantias') {
    // Intereses de cesantías: pago antes del 31 de enero
    if (month === 0) { // Enero
      if (day >= 25) return { message: '¡Última semana! Los intereses de cesantías vencen el 31 de enero', urgency: 'urgent' };
      if (day >= 15) return { message: 'El pago de intereses de cesantías vence el 31 de enero', urgency: 'warning' };
      return { message: 'Recuerde: el límite para pago de intereses es el 31 de enero', urgency: 'info' };
    }
    if (month === 11 && day >= 15) { // Diciembre
      return { message: 'Próximamente vence el plazo para intereses de cesantías (31 de enero)', urgency: 'info' };
    }
  }

  return null;
};

export const LiquidationPreviewModal: React.FC<LiquidationPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  preview,
  benefitLabel,
  benefitIcon,
  benefitType,
  isProcessing,
}) => {
  const [skipOpenPeriods, setSkipOpenPeriods] = useState(false);

  // Calcular alerta de fecha legal
  const legalAlert = useMemo(() => getLegalDeadlineAlert(benefitType), [benefitType]);

  if (!preview) return null;

  const { hasOpenPeriods, openPeriods, employees, summary } = preview;
  const hasEmployees = employees.length > 0;

  const handleConfirm = async () => {
    await onConfirm(skipOpenPeriods);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{benefitIcon}</span>
            Liquidar {benefitLabel}
          </DialogTitle>
          <DialogDescription>
            Revise el desglose antes de confirmar la liquidación
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Alerta de fecha de corte legal */}
          {legalAlert && (
            <Alert 
              variant={legalAlert.urgency === 'urgent' ? 'destructive' : 'default'}
              className={
                legalAlert.urgency === 'urgent' 
                  ? 'border-red-500 bg-red-50 dark:bg-red-950' 
                  : legalAlert.urgency === 'warning'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              }
            >
              <Clock className={`h-4 w-4 ${
                legalAlert.urgency === 'urgent' 
                  ? 'text-red-600' 
                  : legalAlert.urgency === 'warning'
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`} />
              <AlertTitle className={
                legalAlert.urgency === 'urgent' 
                  ? 'text-red-800 dark:text-red-200' 
                  : legalAlert.urgency === 'warning'
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-blue-800 dark:text-blue-200'
              }>
                {legalAlert.urgency === 'urgent' ? '⚠️ Fecha límite próxima' : 'Recordatorio de fecha legal'}
              </AlertTitle>
              <AlertDescription className={
                legalAlert.urgency === 'urgent' 
                  ? 'text-red-700 dark:text-red-300' 
                  : legalAlert.urgency === 'warning'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-blue-700 dark:text-blue-300'
              }>
                {legalAlert.message}
              </AlertDescription>
            </Alert>
          )}
          {/* Alerta de períodos abiertos */}
          {hasOpenPeriods && (
            <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Períodos pendientes de cerrar</AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-2">
                  Los siguientes períodos aún no están cerrados y sus provisiones no serán incluidas:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {openPeriods.map((period: OpenPeriod) => (
                    <li key={period.id}>
                      {period.periodo} ({period.estado})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Resumen de totales */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Empleados</p>
                <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Provisiones</p>
                <p className="text-2xl font-bold">{summary.periodsIncluded}</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total a Liquidar</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(summary.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de empleados */}
          {hasEmployees ? (
            <div className="border rounded-lg">
              <ScrollArea className="h-[250px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-center">Quincenas</TableHead>
                      <TableHead className="text-right">Monto Acumulado</TableHead>
                      <TableHead className="text-center w-20">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: EmployeeLiquidationPreview) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-center">{emp.periodsCount}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(emp.accumulatedAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sin provisiones</AlertTitle>
              <AlertDescription>
                No se encontraron provisiones calculadas para este período.
                Asegúrese de que los períodos de nómina estén cerrados y provisionados.
              </AlertDescription>
            </Alert>
          )}

          {/* Checkbox para continuar sin períodos abiertos */}
          {hasOpenPeriods && hasEmployees && (
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
              <Checkbox
                id="skipOpenPeriods"
                checked={skipOpenPeriods}
                onCheckedChange={(checked) => setSkipOpenPeriods(checked as boolean)}
              />
              <label
                htmlFor="skipOpenPeriods"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Continuar sin los períodos pendientes de cerrar
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !hasEmployees || (hasOpenPeriods && !skipOpenPeriods)}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Liquidando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Liquidar {formatCurrency(summary.totalAmount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
