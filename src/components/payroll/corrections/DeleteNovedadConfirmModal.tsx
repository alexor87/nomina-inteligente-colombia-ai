import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, DollarSign, Trash2 } from "lucide-react";
import { DisplayNovedad } from '@/types/vacation-integration';
import { PeriodState } from '@/types/pending-adjustments';

interface DeleteNovedadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (createPendingAdjustment: boolean) => void;
  novedad: DisplayNovedad | null;
  periodState: PeriodState;
  employeeName: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Math.abs(value));
};

export const DeleteNovedadConfirmModal: React.FC<DeleteNovedadConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  novedad,
  periodState,
  employeeName
}) => {
  const isPeriodClosed = periodState === 'cerrado' || periodState === 'procesada' || periodState === 'pagada';
  
  if (!novedad) return null;

  const handleImmediateDelete = () => {
    onConfirm(isPeriodClosed);
  };

  const handleScheduleDelete = () => {
    onConfirm(true); // Always create pending adjustment for scheduled deletion
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>
              Eliminar {novedad.badgeLabel}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Employee and Novedad Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-base">{employeeName}</span>
                    <Badge variant="outline" className="ml-2">
                      {novedad.badgeLabel}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{formatCurrency(novedad.valor)}</span>
                  </div>
                  {novedad.fecha_inicio && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{novedad.dias} días</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Impact Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Impacto en Nómina
                </h4>
                <p className="text-sm text-blue-700">
                  {novedad.valor > 0 ? 'Reducirá' : 'Aumentará'} el pago en {formatCurrency(Math.abs(novedad.valor))}
                </p>
              </div>

              {/* Period Status & Options */}
              {isPeriodClosed ? (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">Período Cerrado</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      Este período ya está procesado. La eliminación requiere re-liquidación.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-green-800">Período Abierto</span>
                  </div>
                  <p className="text-sm text-green-700">
                    La eliminación se procesará inmediatamente.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          
          {isPeriodClosed ? (
            <AlertDialogAction
              onClick={handleImmediateDelete}
              className="bg-primary hover:bg-primary/90 sm:w-auto"
            >
              Programar y Re-liquidar
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={handleImmediateDelete}
              className="bg-destructive hover:bg-destructive/90 sm:w-auto"
            >
              Eliminar Ahora
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};