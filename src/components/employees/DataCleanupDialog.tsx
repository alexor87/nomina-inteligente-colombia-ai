
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, AlertTriangle, RefreshCw, CheckCircle, Zap, Search, Shield } from 'lucide-react';
import { useDataCleanup } from '@/hooks/useDataCleanup';
import { DataDiagnosticPanel } from './DataDiagnosticPanel';
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
  const [step, setStep] = useState<'diagnostic' | 'confirm' | 'executing' | 'results'>('diagnostic');
  const [activeTab, setActiveTab] = useState('aggressive');
  
  const { 
    isCleaningUp, 
    cleanupReport, 
    executeAggressiveCleanup, 
    executeEmergencyCleanup, 
    verifyCleanup 
  } = useDataCleanup();

  const handleAggressiveCleanup = async () => {
    if (confirmText !== 'ELIMINAR TODO DEFINITIVAMENTE') {
      return;
    }

    setStep('executing');
    
    try {
      const report = await executeAggressiveCleanup(companyIdentifier);
      setStep('results');
      
      if (onCleanupComplete) {
        onCleanupComplete();
      }
    } catch (error) {
      setStep('diagnostic');
    }
  };

  const handleEmergencyCleanup = async () => {
    if (confirmText !== 'ELIMINAR TODO DEFINITIVAMENTE') {
      return;
    }

    setStep('executing');
    
    try {
      await executeEmergencyCleanup(companyIdentifier);
      // Ejecutar diagnóstico después para actualizar el estado
      setTimeout(() => {
        setStep('diagnostic');
        if (onCleanupComplete) {
          onCleanupComplete();
        }
      }, 1000);
    } catch (error) {
      setStep('diagnostic');
    }
  };

  const handleVerifyCleanup = async () => {
    try {
      await verifyCleanup(companyIdentifier);
    } catch (error) {
      console.error('Error en verificación:', error);
    }
  };

  const handleClose = () => {
    setStep('diagnostic');
    setConfirmText('');
    setCompanyIdentifier('TechSolutions');
    setActiveTab('aggressive');
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
          {report.success ? '✨ ¡Limpieza Definitiva Completada! ✨' : 'Limpieza Parcial'}
        </h3>
        <p className="text-sm text-gray-600">
          {report.success 
            ? 'La cuenta está ahora completamente limpia, como nueva' 
            : 'Algunos datos no pudieron ser eliminados'
          }
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Empresa:</strong> {report.companyName}
        </div>
        <div>
          <strong>ID:</strong> {report.companyId.slice(0, 8)}...
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">Resumen de eliminación:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {Object.entries(report.results).map(([key, result]) => (
            <div key={key} className="text-center p-2 bg-gray-50 rounded">
              <div className="font-semibold text-red-600">{result.deleted}</div>
              <div className="capitalize text-xs">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {report.stepResults && report.stepResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Pasos ejecutados:</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {report.stepResults.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {step.success ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                )}
                <span>{step.step}</span>
                {step.error && <span className="text-red-600">({step.error})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Errores encontrados:</strong>
            <ul className="list-disc list-inside mt-1 text-xs">
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Limpieza DEFINITIVA de Cuenta
          </DialogTitle>
          <DialogDescription>
            Esta herramienta eliminará TODOS los datos de empleados, nóminas, períodos, comprobantes, 
            novedades y registros relacionados, dejando la cuenta completamente limpia como nueva.
          </DialogDescription>
        </DialogHeader>

        {step === 'diagnostic' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="company">Identificador de Empresa</Label>
              <Input
                id="company"
                value={companyIdentifier}
                onChange={(e) => setCompanyIdentifier(e.target.value)}
                placeholder="TechSolutions o NIT de la empresa"
              />
            </div>

            <DataDiagnosticPanel 
              companyIdentifier={companyIdentifier}
              onDataChange={() => {
                // Refresh del panel cuando cambian los datos
              }}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="aggressive" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Limpieza Agresiva
                </TabsTrigger>
                <TabsTrigger value="emergency" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Emergencia
                </TabsTrigger>
              </TabsList>

              <TabsContent value="aggressive" className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <Zap className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Limpieza Agresiva por Lotes</strong><br />
                    Elimina todos los datos de forma eficiente usando lotes grandes.
                    Recomendado para la mayoría de casos.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => setStep('confirm')} 
                  variant="destructive" 
                  className="w-full"
                  disabled={!companyIdentifier.trim()}
                >
                  Proceder con Limpieza Agresiva
                </Button>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limpieza de Emergencia</strong><br />
                    Elimina empleados uno por uno como último recurso.
                    Usar solo si la limpieza agresiva falla.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => setStep('confirm')} 
                  variant="destructive" 
                  className="w-full"
                  disabled={!companyIdentifier.trim()}
                >
                  Proceder con Limpieza de Emergencia
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleVerifyCleanup}
                className="flex-1"
                disabled={!companyIdentifier.trim()}
              >
                <Search className="h-4 w-4 mr-2" />
                Verificar Limpieza
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ CONFIRMACIÓN REQUERIDA ⚠️</strong><br />
                Esta acción es IRREVERSIBLE y eliminará TODOS los datos.<br />
                Para confirmar, escribe exactamente: <strong>ELIMINAR TODO DEFINITIVAMENTE</strong>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="confirm">Confirmación de Eliminación Definitiva</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR TODO DEFINITIVAMENTE"
                className="text-center font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setStep('diagnostic')} 
                variant="outline" 
                className="flex-1"
              >
                ← Volver
              </Button>
              <Button 
                onClick={activeTab === 'aggressive' ? handleAggressiveCleanup : handleEmergencyCleanup}
                variant="destructive" 
                className="flex-1"
                disabled={confirmText !== 'ELIMINAR TODO DEFINITIVAMENTE'}
              >
                {activeTab === 'aggressive' ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Ejecutar Limpieza Agresiva
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Ejecutar Limpieza de Emergencia
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'executing' && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'aggressive' ? 'Ejecutando limpieza agresiva...' : 'Ejecutando limpieza de emergencia...'}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Eliminando todos los datos de la cuenta
            </p>
            <p className="text-xs text-gray-500">
              Este proceso puede tomar varios minutos dependiendo de la cantidad de datos
            </p>
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
