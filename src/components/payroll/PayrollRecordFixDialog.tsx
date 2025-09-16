import { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PayrollRecordSyncService } from '@/services/payroll/PayrollRecordSyncService';

interface PayrollRecordFixDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  periodId: string;
  onSuccess?: () => void;
}

export function PayrollRecordFixDialog({
  isOpen,
  onOpenChange,
  employeeId,
  employeeName,
  periodId,
  onSuccess
}: PayrollRecordFixDialogProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const handleFixRecord = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      console.log(`🔧 Corrigiendo manualmente empleado ${employeeName} (${employeeId}) en período ${periodId}`);
      
      const success = await PayrollRecordSyncService.forceUpdateEmployee(employeeId, periodId);
      
      if (success) {
        setFixResult('success');
        toast({
          title: "✅ Registro corregido",
          description: `Los valores de ${employeeName} han sido actualizados correctamente`,
          className: "border-green-200 bg-green-50"
        });
        onSuccess?.();
      } else {
        setFixResult('error');
        toast({
          title: "❌ Error en corrección",
          description: `No se pudo corregir el registro de ${employeeName}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error en corrección manual:', error);
      setFixResult('error');
      toast({
        title: "❌ Error en corrección",
        description: "Error inesperado al corregir el registro",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleClose = () => {
    setFixResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Corregir Registro de Nómina
          </DialogTitle>
          <DialogDescription>
            Los valores mostrados en pantalla no coinciden con los del PDF para <strong>{employeeName}</strong>.
            Esto indica que el registro en la base de datos está desactualizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema detectado:</strong> Los valores calculados en tiempo real difieren 
              de los almacenados en la base de datos. Esto puede ocurrir cuando se realizan 
              cambios en novedades o configuraciones sin actualizar los registros.
            </AlertDescription>
          </Alert>

          {fixResult === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>¡Corrección exitosa!</strong> Los valores han sido actualizados. 
                El próximo PDF generado mostrará los valores correctos.
              </AlertDescription>
            </Alert>
          )}

          {fixResult === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error en la corrección.</strong> No se pudo actualizar el registro. 
                Inténtalo nuevamente o contacta al soporte técnico.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p><strong>¿Qué hace esta corrección?</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Recalcula todos los valores de nómina usando la configuración actual</li>
              <li>Actualiza la base de datos con los valores correctos</li>
              <li>Marca el registro como actualizado (is_stale = false)</li>
              <li>Garantiza que futuros PDFs muestren valores consistentes</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isFixing}
          >
            {fixResult === 'success' ? 'Cerrar' : 'Cancelar'}
          </Button>
          
          {fixResult !== 'success' && (
            <Button
              onClick={handleFixRecord}
              disabled={isFixing}
              className="w-full sm:w-auto"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Corrigiendo...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Corregir Registro
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}