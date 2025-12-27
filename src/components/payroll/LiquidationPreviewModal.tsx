import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Users, DollarSign, Calendar, Loader2 } from 'lucide-react';
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

export const LiquidationPreviewModal: React.FC<LiquidationPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  preview,
  benefitLabel,
  benefitIcon,
  isProcessing,
}) => {
  const [skipOpenPeriods, setSkipOpenPeriods] = useState(false);

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
