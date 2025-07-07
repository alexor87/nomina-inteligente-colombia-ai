
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, RefreshCw, Search, CheckCircle, Calendar, Users } from 'lucide-react';
import { usePeriodCleanup } from '@/hooks/usePeriodCleanup';
import { DiagnosticResult } from '@/services/PayrollPeriodCleanupService';

interface PeriodCleanupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCleanupComplete?: () => void;
}

export const PeriodCleanupDialog: React.FC<PeriodCleanupDialogProps> = ({
  isOpen,
  onClose,
  onCleanupComplete
}) => {
  const [step, setStep] = useState<'diagnostic' | 'review' | 'cleanup' | 'results'>('diagnostic');
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  
  const { 
    isCleaningUp, 
    isDiagnosing, 
    cleanupResult, 
    diagnosticResult,
    runDiagnostic,
    executeCleanup,
    fixSpecificPeriod
  } = usePeriodCleanup();

  useEffect(() => {
    if (isOpen && step === 'diagnostic') {
      runDiagnostic();
    }
  }, [isOpen, step]);

  const handleCleanup = async () => {
    if (!confirmCleanup) return;
    
    setStep('cleanup');
    try {
      await executeCleanup();
      setStep('results');
      if (onCleanupComplete) {
        onCleanupComplete();
      }
    } catch (error) {
      setStep('review');
    }
  };

  const handleClose = () => {
    setStep('diagnostic');
    setConfirmCleanup(false);
    onClose();
  };

  const totalIssues = diagnosticResult ? 
    diagnosticResult.duplicatePeriods.length + 
    diagnosticResult.ghostPeriods.length + 
    diagnosticResult.invalidPeriods.length : 0;

  const renderDiagnosticStep = () => (
    <div className="space-y-4">
      {isDiagnosing ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Analizando períodos de nómina...</h3>
          <p className="text-sm text-gray-600">
            Buscando duplicados, períodos fantasma y fechas incorrectas
          </p>
        </div>
      ) : totalIssues === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✨ ¡Períodos en perfecto estado! ✨
          </h3>
          <p className="text-sm text-green-600">
            No se encontraron duplicados, períodos fantasma ni fechas incorrectas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Se encontraron {totalIssues} problemas</strong> que están causando conflictos 
              en la detección de períodos.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={() => setStep('review')} 
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            Ver Detalles y Proceder
          </Button>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Tabs defaultValue="duplicates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="duplicates">
            Duplicados ({diagnosticResult?.duplicatePeriods.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ghost">
            Fantasma ({diagnosticResult?.ghostPeriods.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invalid">
            Inválidos ({diagnosticResult?.invalidPeriods.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates" className="space-y-3">
          {diagnosticResult?.duplicatePeriods.map((duplicate, index) => (
            <div key={index} className="border rounded-lg p-4 bg-red-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-red-800">{duplicate.periodo}</h4>
                <Badge variant="destructive">{duplicate.count} copias</Badge>
              </div>
              <div className="space-y-2">
                {duplicate.periods.map((period, pIndex) => (
                  <div key={pIndex} className="text-sm bg-white p-2 rounded border">
                    <div className="flex justify-between">
                      <span>📅 {period.fecha_inicio} - {period.fecha_fin}</span>
                      <Badge variant={period.estado === 'cerrado' ? 'default' : 'secondary'}>
                        {period.estado}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="ghost" className="space-y-3">
          {diagnosticResult?.ghostPeriods.map((ghost, index) => (
            <div key={index} className="border rounded-lg p-4 bg-yellow-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-yellow-800">{ghost.periodo}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {ghost.empleados_count} empleados
                  </Badge>
                  <Badge variant="secondary">{ghost.estado}</Badge>
                </div>
              </div>
              <p className="text-sm text-yellow-700">
                Sin actividad desde: {new Date(ghost.last_activity_at).toLocaleString()}
              </p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="invalid" className="space-y-3">
          {diagnosticResult?.invalidPeriods.map((invalid, index) => (
            <div key={index} className="border rounded-lg p-4 bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-orange-800">{invalid.periodo}</h4>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Fechas incorrectas
                </Badge>
              </div>
              <div className="text-sm text-orange-700 space-y-1">
                <p>📅 {invalid.fecha_inicio} - {invalid.fecha_fin}</p>
                <p className="font-medium">⚠️ {invalid.issue}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Alert className="border-red-200 bg-red-50">
        <Trash2 className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>⚠️ ACCIÓN DESTRUCTIVA ⚠️</strong><br />
          La limpieza eliminará o corregirá estos períodos automáticamente.
          Esta acción no se puede deshacer.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="confirmCleanup"
          checked={confirmCleanup}
          onChange={(e) => setConfirmCleanup(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="confirmCleanup" className="text-sm font-medium">
          Entiendo que esta acción es irreversible y quiero proceder con la limpieza
        </label>
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
          onClick={handleCleanup}
          variant="destructive" 
          className="flex-1"
          disabled={!confirmCleanup}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Ejecutar Limpieza
        </Button>
      </div>
    </div>
  );

  const renderCleanupStep = () => (
    <div className="text-center py-8">
      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
      <h3 className="text-lg font-semibold mb-2">Limpiando períodos problemáticos...</h3>
      <p className="text-sm text-gray-600 mb-2">
        Eliminando duplicados, períodos fantasma y corrigiendo fechas
      </p>
      <p className="text-xs text-gray-500">
        Este proceso puede tomar unos momentos
      </p>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        {cleanupResult?.success ? (
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
        ) : (
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-2" />
        )}
        <h3 className="text-lg font-semibold">
          {cleanupResult?.success ? '✅ ¡Limpieza Completada!' : '⚠️ Limpieza Parcial'}
        </h3>
        <p className="text-sm text-gray-600">
          {cleanupResult?.summary}
        </p>
      </div>

      {cleanupResult && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{cleanupResult.duplicatesRemoved}</div>
            <div className="text-xs text-red-700">Duplicados eliminados</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{cleanupResult.ghostPeriodsRemoved}</div>
            <div className="text-xs text-yellow-700">Fantasma eliminados</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{cleanupResult.invalidPeriodsFixed}</div>
            <div className="text-xs text-blue-700">Fechas corregidas</div>
          </div>
        </div>
      )}

      {cleanupResult?.errors && cleanupResult.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Errores encontrados:</strong>
            <ul className="list-disc list-inside mt-1 text-xs">
              {cleanupResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleClose} className="w-full">
        Cerrar
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Limpieza de Períodos de Nómina
          </DialogTitle>
          <DialogDescription>
            Esta herramienta identifica y corrige períodos duplicados, fantasma o con fechas incorrectas 
            que están causando conflictos en la detección automática.
          </DialogDescription>
        </DialogHeader>

        {step === 'diagnostic' && renderDiagnosticStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'cleanup' && renderCleanupStep()}
        {step === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};
