import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, ArrowRight, Users, DollarSign } from "lucide-react";
import type { RollbackImpact } from '@/services/PayrollRollbackService';

interface RollbackConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  isLoading: boolean;
  versionNumber: number;
  rollbackImpact: RollbackImpact | null;
  hasVouchers: boolean;
}

export const RollbackConfirmationModal: React.FC<RollbackConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  versionNumber,
  rollbackImpact,
  hasVouchers
}) => {
  const [justification, setJustification] = useState('');

  const handleConfirm = () => {
    if (justification.trim().length < 10) {
      return;
    }
    onConfirm(justification);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Confirmar Rollback a Versión {versionNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Warning Alerts */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>¡Acción irreversible!</strong> Esta operación restaurará toda la nómina 
                a los valores que tenía en la versión {versionNumber}. Los cambios actuales se perderán.
              </AlertDescription>
            </Alert>

            {hasVouchers && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>¡Advertencia!</strong> Este período tiene comprobantes generados. 
                  El rollback podría crear inconsistencias con los comprobantes ya emitidos.
                </AlertDescription>
              </Alert>
            )}

            {/* Impact Summary */}
            {rollbackImpact && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Resumen del Impacto</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">Empleados Afectados</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {rollbackImpact.totalImpact.affectedCount}
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-medium">Diferencia Bruta</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(rollbackImpact.totalImpact.grossPayDifference)}
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-medium">Diferencia Neta</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(rollbackImpact.totalImpact.netPayDifference)}
                    </div>
                  </div>
                </div>

                {/* Employee Changes Detail */}
                {rollbackImpact.employeeChanges.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Cambios por Empleado</h4>
                    <div className="border rounded-lg">
                      <div className="grid grid-cols-4 gap-4 p-3 bg-muted font-medium text-sm">
                        <div>Empleado</div>
                        <div className="text-center">Valor Actual</div>
                        <div className="text-center">Nuevo Valor</div>
                        <div className="text-center">Diferencia</div>
                      </div>
                      <Separator />
                      <ScrollArea className="max-h-64">
                        {rollbackImpact.employeeChanges.map((change, index) => (
                          <div key={change.employeeId}>
                            <div className="grid grid-cols-4 gap-4 p-3 text-sm">
                              <div className="font-medium">{change.employeeName}</div>
                              <div className="text-center">
                                {formatCurrency(change.currentValue)}
                              </div>
                              <div className="text-center">
                                {formatCurrency(change.newValue)}
                              </div>
                              <div className="text-center">
                                <Badge 
                                  variant={change.difference >= 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {change.difference >= 0 ? '+' : ''}
                                  {formatCurrency(change.difference)}
                                </Badge>
                              </div>
                            </div>
                            {index < rollbackImpact.employeeChanges.length - 1 && (
                              <Separator />
                            )}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flow Visualization */}
            <div className="space-y-3">
              <h4 className="font-medium">Proceso de Rollback</h4>
              <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm font-medium">
                    Estado Actual
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Versión más reciente
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium">
                    Versión {versionNumber}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Estado objetivo
                  </div>
                </div>
              </div>
            </div>

            {/* Justification */}
            <div className="space-y-3">
              <h4 className="font-medium">
                Justificación <span className="text-destructive">*</span>
              </h4>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explique el motivo del rollback. Mínimo 10 caracteres."
                rows={4}
                className="resize-none"
              />
              {justification.length > 0 && justification.length < 10 && (
                <p className="text-sm text-destructive">
                  La justificación debe tener al menos 10 caracteres.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || justification.trim().length < 10}
          >
            {isLoading ? (
              "Ejecutando Rollback..."
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Confirmar Rollback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};