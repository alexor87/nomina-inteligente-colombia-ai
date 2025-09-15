import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Clock,
  User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VersionDiffViewer } from './VersionDiffViewer';
import { 
  PeriodVersionComparisonService, 
  VersionComparison, 
  VersionSummaryMetrics 
} from '@/services/PeriodVersionComparisonService';

interface PeriodVersionViewerProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  periodName: string;
}

export const PeriodVersionViewer: React.FC<PeriodVersionViewerProps> = ({
  isOpen,
  onClose,
  periodId,
  periodName
}) => {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && periodId) {
      loadComparison();
    }
  }, [isOpen, periodId]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading period version comparison...');
      const comparisonData = await PeriodVersionComparisonService.generatePeriodComparison(
        periodId,
        periodName
      );
      setComparison(comparisonData);
    } catch (error) {
      console.error('❌ Error loading comparison:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la comparación de versiones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportComparison = async () => {
    try {
      if (!comparison) return;

      // Create CSV content
      const csvRows = [
        ['Empleado', 'Cédula', 'Tipo de Cambio', 'Impacto Económico', 'Estado Inicial', 'Estado Actual'].join(',')
      ];

      comparison.employeeChanges.forEach(change => {
        const initialPay = change.initialData?.neto_pagado || 0;
        const currentPay = change.currentData?.neto_pagado || 0;
        
        csvRows.push([
          `"${change.employeeName}"`,
          change.cedula,
          `"${PeriodVersionComparisonService.getChangeTypeLabel(change.changeType)}"`,
          change.impactAmount.toString(),
          initialPay.toString(),
          currentPay.toString()
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `comparacion_${periodName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Exportación completada",
        description: "El reporte de comparación se ha descargado exitosamente",
      });
    } catch (error) {
      console.error('Error exporting comparison:', error);
      toast({
        title: "Error en exportación",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSummaryMetrics = (metrics: VersionSummaryMetrics) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empleados Afectados</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.employeesWithChanges}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {metrics.totalImpactAmount >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Impacto Total</p>
              <p className={`text-2xl font-bold ${metrics.totalImpactAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PeriodVersionComparisonService.formatCurrency(metrics.totalImpactAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Novedades Agregadas</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.novedadesAdded}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Novedades Eliminadas</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.novedadesRemoved}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVersionInfo = () => {
    if (!comparison) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Initial Version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Liquidación Inicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.initialVersion ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Versión {comparison.initialVersion.version_number}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {comparison.initialVersion.version_type}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDateTime(comparison.initialVersion.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.initialVersion.created_by}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.initialVersion.changes_summary}</span>
                  </div>
                </div>
                
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Esta es la liquidación <strong>original</strong> del período antes de cualquier modificación.
                    Se utiliza como referencia para auditorías y comparaciones.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  No se encontró liquidación inicial registrada para este período.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Current Version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.currentVersion ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Versión {comparison.currentVersion.version_number}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {comparison.currentVersion.version_type}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDateTime(comparison.currentVersion.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.currentVersion.created_by}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.currentVersion.changes_summary || 'Cambios aplicados'}</span>
                  </div>
                </div>
                
                <Alert className="bg-green-50 border-green-200">
                  <Eye className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Este es el estado <strong>actual</strong> del período después de aplicar todas las modificaciones.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert className="bg-gray-50 border-gray-200">
                <AlertDescription className="text-gray-800">
                  No se encontraron versiones para este período.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Comparación de Versiones - {periodName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Generando comparación...</span>
              </div>
            ) : (
              comparison && (
                <>
                  {/* Summary Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Resumen de Cambios</h3>
                    {renderSummaryMetrics(comparison.summaryMetrics)}
                  </div>

                  <Separator />

                  {/* Tabs for detailed views */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Información General</TabsTrigger>
                      <TabsTrigger value="comparison">Comparación Detallada</TabsTrigger>
                      <TabsTrigger value="versions">Versiones</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                      {renderVersionInfo()}
                    </TabsContent>

                    <TabsContent value="comparison">
                      <VersionDiffViewer 
                        employeeChanges={comparison.employeeChanges}
                        showOnlyChanges={true}
                      />
                    </TabsContent>

                    <TabsContent value="versions">
                      <Card>
                        <CardHeader>
                          <CardTitle>Certificación para Auditoría</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Alert className="bg-blue-50 border-blue-200">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              <strong>Certificación de Inmutabilidad:</strong> La liquidación inicial se registró el {' '}
                              {comparison.initialVersion && formatDateTime(comparison.initialVersion.created_at)} y no ha sido modificada.
                              Todos los cambios posteriores están auditados y trazables.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium">Información de Trazabilidad:</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• ID del Período: {comparison.periodId}</li>
                              <li>• Versión Inicial: {comparison.initialVersion?.id}</li>
                              <li>• Versión Actual: {comparison.currentVersion?.id}</li>
                              <li>• Fecha de Comparación: {formatDateTime(comparison.summaryMetrics.calculationDate)}</li>
                              <li>• Total de Empleados con Cambios: {comparison.summaryMetrics.employeesWithChanges}</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              )
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {comparison && (
            <Button onClick={exportComparison} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Comparación
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};