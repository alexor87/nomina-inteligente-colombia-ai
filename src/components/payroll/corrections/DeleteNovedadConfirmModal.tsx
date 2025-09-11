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
import { AlertTriangle, Calendar, DollarSign } from "lucide-react";
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

  const handleConfirm = () => {
    onConfirm(isPeriodClosed);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>
              {isPeriodClosed ? 'Eliminar Novedad - Período Cerrado' : 'Confirmar Eliminación'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-muted-foreground">
                    {employeeName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {novedad.badgeLabel}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Valor: {formatCurrency(novedad.valor)}</span>
                  </div>
                  {novedad.fecha_inicio && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{novedad.dias} días</span>
                    </div>
                  )}
                </div>
              </div>

              {isPeriodClosed ? (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Período Cerrado</span>
                    </div>
                    <p className="text-sm text-orange-700">
                      Este período está cerrado. La eliminación se procesará como un ajuste pendiente que requerirá re-liquidación.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-1">Impacto Estimado:</h4>
                    <p className="text-sm text-blue-700">
                      {novedad.valor > 0 ? '• Reducción' : '• Aumento'} de {formatCurrency(novedad.valor)} en nómina
                    </p>
                    <p className="text-sm text-blue-700">
                      • Requiere aplicar ajustes y re-liquidar período
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm">
                  ¿Estás seguro de que deseas eliminar esta novedad? Esta acción no se puede deshacer.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={isPeriodClosed ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {isPeriodClosed ? 'Crear Ajuste Pendiente' : 'Eliminar Novedad'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};