import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExecutableAction } from '../types/ExecutableAction';
import { Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Period {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

interface PeriodConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: ExecutableAction | null;
  onConfirm: (periodId: string) => void;
}

export const PeriodConfirmationDialog: React.FC<PeriodConfirmationDialogProps> = ({
  isOpen,
  onClose,
  action,
  onConfirm
}) => {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternativePeriods, setAlternativePeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const detectedPeriod = action?.parameters?.periodName;
  const detectedPeriodId = action?.parameters?.periodId;
  const employeeName = action?.parameters?.employeeName;

  const handleConfirm = () => {
    if (detectedPeriodId) {
      onConfirm(detectedPeriodId);
      onClose();
    }
  };

  const handleShowAlternatives = async () => {
    setLoading(true);
    try {
      // Get recent closed periods (excluding the already detected one)
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, estado')
        .eq('estado', 'cerrado')
        .neq('id', detectedPeriodId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setAlternativePeriods(periods || []);
      setShowAlternatives(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar períodos alternativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (periodId: string) => {
    onConfirm(periodId);
    onClose();
  };

  const handleCancel = () => {
    setShowAlternatives(false);
    onClose();
  };

  if (!action) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Calendar className="h-5 w-5 text-primary" />
            Confirmar Período
          </DialogTitle>
          <DialogDescription>
            Confirma el período para el envío del comprobante
          </DialogDescription>
        </DialogHeader>

        {!showAlternatives ? (
          <>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.parameters?.email || 'Email registrado del empleado'}
                  </p>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Período detectado:</p>
                <Badge variant="default" className="text-sm px-3 py-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {detectedPeriod || 'Período más reciente'}
                </Badge>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleConfirm}
                className="w-full"
                disabled={!detectedPeriodId}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Sí, enviar comprobante
              </Button>
              <Button
                onClick={handleShowAlternatives}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {loading ? 'Cargando...' : 'No, ver otros períodos'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="w-full text-xs"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-sm font-medium">Selecciona un período alternativo:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Para {employeeName}
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alternativePeriods.length > 0 ? (
                  alternativePeriods.map((period) => (
                    <Button
                      key={period.id}
                      onClick={() => handleSelectAlternative(period.id)}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <div className="font-medium text-sm">{period.periodo}</div>
                        <div className="text-xs text-muted-foreground">
                          {period.fecha_inicio} - {period.fecha_fin}
                        </div>
                      </div>
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No hay períodos alternativos disponibles
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowAlternatives(false)}
                variant="outline"
                className="w-full"
              >
                Volver
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};