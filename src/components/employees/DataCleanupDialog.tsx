
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useDataCleanup } from '@/hooks/useDataCleanup';
import { CleanupReport } from '@/services/payroll-intelligent/DataCleanupService';

interface DataCleanupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCleanupComplete?: () => void;
}

export const DataCleanupDialog: React.FC<DataCleanupDialogProps> = ({
  isOpen,
  onClose,
  onCleanupComplete
}) => {
  const [companyIdentifier, setCompanyIdentifier] = useState('TechSolutions');
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'executing' | 'results'>('input');
  
  const { isCleaningUp, cleanupReport, executeCleanup, verifyCleanup } = useDataCleanup();

  const handleExecuteCleanup = async () => {
    if (confirmText !== 'ELIMINAR TODO') {
      return;
    }

    setStep('executing');
    
    try {
      const report = await executeCleanup(companyIdentifier);
      setStep('results');
      
      if (onCleanupComplete) {
        onCleanupComplete();
      }
    } catch (error) {
      setStep('input');
    }
  };

  const handleClose = () => {
    setStep('input');
    setConfirmText('');
    setCompanyIdentifier('TechSolutions');
    onClose();
  };

  const renderResults = (report: CleanupReport) => (
    <div className="space-y-4">
      <div className="text-center">
        {report.success ? (
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
        ) : (
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-2" />
        )}
        <h3 className="text-lg font-semibold">
          {report.success ? 'Limpieza Completada' : 'Limpieza Fallida'}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Empresa:</strong> {report.companyName}
        </div>
        <div>
          <strong>ID:</strong> {report.companyId}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Resultados de eliminación:</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="font-semibold text-red-600">{report.results.employees.deleted}</div>
            <div>Empleados</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{report.results.payrolls.deleted}</div>
            <div>Nóminas</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{report.results.periods.deleted}</div>
            <div>Períodos</div>
          </div>
        </div>
      </div>

      {report.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Errores:</strong>
            <ul className="list-disc list-inside mt-1">
              {report.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Limpieza Completa de Datos
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará TODOS los empleados, nóminas, períodos y datos relacionados de la empresa especificada.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="company">Identificador de Empresa</Label>
              <Input
                id="company"
                value={companyIdentifier}
                onChange={(e) => setCompanyIdentifier(e.target.value)}
                placeholder="TechSolutions o NIT de la empresa"
              />
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>¡ADVERTENCIA!</strong> Esta acción es irreversible y eliminará todos los datos de empleados y nóminas.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setStep('confirm')} 
              variant="destructive" 
              className="w-full"
              disabled={!companyIdentifier.trim()}
            >
              Continuar con la limpieza
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Para confirmar, escribe <strong>ELIMINAR TODO</strong> en el campo de abajo:
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="confirm">Confirmación</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR TODO"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setStep('input')} 
                variant="outline" 
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleExecuteCleanup}
                variant="destructive" 
                className="flex-1"
                disabled={confirmText !== 'ELIMINAR TODO'}
              >
                Ejecutar Limpieza
              </Button>
            </div>
          </div>
        )}

        {step === 'executing' && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Ejecutando limpieza completa...</p>
            <p className="text-sm text-gray-600 mt-2">Este proceso puede tomar varios segundos</p>
          </div>
        )}

        {step === 'results' && cleanupReport && (
          <>
            {renderResults(cleanupReport)}
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
