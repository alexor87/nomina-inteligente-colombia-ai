
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { VacationDuplicateCleanupService, DuplicateReport, CleanupResult } from '@/services/VacationDuplicateCleanupService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { AlertTriangle, Trash2, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const VacationDuplicatesMonitor: React.FC = () => {
  const { companyId, isLoading: isLoadingCompany } = useCurrentCompany();
  const { toast } = useToast();
  const [duplicateReport, setDuplicateReport] = useState<DuplicateReport | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  // Auto-detectar al cargar si tenemos company_id
  useEffect(() => {
    if (companyId && !isLoadingCompany) {
      detectDuplicates();
    }
  }, [companyId, isLoadingCompany]);

  const detectDuplicates = async () => {
    if (!companyId) return;
    
    setIsDetecting(true);
    try {
      const report = await VacationDuplicateCleanupService.detectDuplicates(companyId);
      setDuplicateReport(report);
      
      if (report.totalDuplicates > 0) {
        toast({
          title: "⚠️ Duplicados Detectados",
          description: `Se encontraron ${report.totalDuplicates} registros duplicados`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Sistema Limpio",
          description: "No se encontraron registros duplicados",
          className: "border-green-200 bg-green-50"
        });
      }
    } catch (error: any) {
      console.error('Error detecting duplicates:', error);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!companyId || !duplicateReport) return;
    
    if (!confirm(`¿Está seguro de eliminar ${duplicateReport.totalDuplicates} registros duplicados? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    setIsCleaning(true);
    try {
      const result = await VacationDuplicateCleanupService.safeCleanupDuplicates(companyId);
      setCleanupResult(result);
      
      if (result.success) {
        toast({
          title: "✅ Limpieza Completada",
          description: `Se eliminaron ${result.removedCount} registros duplicados`,
          className: "border-green-200 bg-green-50"
        });
        
        // Detectar nuevamente para actualizar el estado
        setTimeout(() => {
          detectDuplicates();
        }, 1000);
      } else {
        toast({
          title: "⚠️ Limpieza Parcial",
          description: `Se eliminaron ${result.removedCount} registros, pero hubo ${result.errors.length} errores`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error cleaning duplicates:', error);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Cargando información de empresa...
      </div>
    );
  }

  if (!companyId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No se pudo obtener la información de la empresa. Por favor, inicie sesión nuevamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Duplicados</h2>
          <p className="text-muted-foreground">
            Detecta y limpia registros duplicados en vacaciones y ausencias
          </p>
        </div>
        <Button 
          onClick={detectDuplicates} 
          disabled={isDetecting}
          variant="outline"
        >
          {isDetecting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Detectando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Detectar Duplicados
            </>
          )}
        </Button>
      </div>

      {/* Estado del Sistema */}
      {duplicateReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {duplicateReport.totalDuplicates > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Duplicados Detectados</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Sistema Limpio</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {duplicateReport.totalDuplicates}
                </div>
                <div className="text-sm text-gray-600">Registros Duplicados</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {duplicateReport.duplicateGroups.length}
                </div>
                <div className="text-sm text-gray-600">Grupos Afectados</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {duplicateReport.affectedEmployees}
                </div>
                <div className="text-sm text-gray-600">Empleados Afectados</div>
              </div>
            </div>

            {duplicateReport.totalDuplicates > 0 && (
              <div className="space-y-4">
                <Button 
                  onClick={cleanupDuplicates}
                  disabled={isCleaning}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isCleaning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Limpiando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar Todos los Duplicados
                    </>
                  )}
                </Button>

                {isCleaning && (
                  <div className="space-y-2">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      Procesando duplicados...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado de Limpieza */}
      {cleanupResult && (
        <Alert className={cleanupResult.success ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Limpieza Completada:</strong> Se eliminaron {cleanupResult.removedCount} registros duplicados 
            en {cleanupResult.cleanedGroups} grupos.
            {cleanupResult.errors.length > 0 && (
              <div className="mt-2">
                <strong>Errores:</strong>
                <ul className="list-disc list-inside mt-1">
                  {cleanupResult.errors.slice(0, 3).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                  {cleanupResult.errors.length > 3 && (
                    <li className="text-sm">... y {cleanupResult.errors.length - 3} errores más</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Detalle de Grupos Duplicados */}
      {duplicateReport && duplicateReport.duplicateGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Duplicados</CardTitle>
            <p className="text-sm text-muted-foreground">
              Grupos de registros duplicados detectados
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {duplicateReport.duplicateGroups.slice(0, 10).map((group, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{group.employeeName}</div>
                    <div className="text-sm text-muted-foreground">
                      {group.type} • {group.startDate} - {group.endDate}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">
                      <Copy className="h-3 w-3 mr-1" />
                      {group.duplicateCount} duplicados
                    </Badge>
                  </div>
                </div>
              ))}
              {duplicateReport.duplicateGroups.length > 10 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  ... y {duplicateReport.duplicateGroups.length - 10} grupos más
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
