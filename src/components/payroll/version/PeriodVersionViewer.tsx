import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EmployeeChangeCard } from './EmployeeChangeCard';
import { BusinessImpactSummary } from './BusinessImpactSummary';
import { ChangeTimelineComponent } from './ChangeTimelineComponent';
import { 
  PeriodVersionComparisonService, 
  VersionComparison 
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
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [repairing, setRepairing] = useState(false);

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

  const repairIdentities = async () => {
    try {
      setRepairing(true);
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await (supabase as any).rpc('backfill_version_employee_identity', {
        p_period_id: periodId,
      });

      if (error) {
        console.error('❌ Error repairing identities:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron reparar las identidades de empleados',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Identidades reparadas',
        description: `Versiones actualizadas: ${data?.versions_updated ?? 0}. Empleados procesados: ${data?.employees_processed ?? 0}.`,
      });

      await loadComparison();
    } finally {
      setRepairing(false);
    }
  };

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="employees">Empleados</TabsTrigger>
                    <TabsTrigger value="timeline">Cronología</TabsTrigger>
                    <TabsTrigger value="audit">Auditoría</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <BusinessImpactSummary 
                      metrics={comparison.summaryMetrics}
                      employeeChanges={comparison.employeeChanges}
                    />
                  </TabsContent>

                  <TabsContent value="employees">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Empleados Afectados ({comparison.employeeChanges.length})
                        </h3>
                      </div>
                      
                      {comparison.employeeChanges.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No se encontraron cambios entre versiones.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {comparison.employeeChanges.map((change) => (
                            <EmployeeChangeCard
                              key={change.employeeId}
                              change={change}
                              isExpanded={expandedEmployees.has(change.employeeId)}
                              onToggleExpanded={() => toggleEmployeeExpansion(change.employeeId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline">
                    <ChangeTimelineComponent
                      initialVersion={comparison.initialVersion}
                      currentVersion={comparison.currentVersion}
                      metrics={comparison.summaryMetrics}
                      periodName={periodName}
                    />
                  </TabsContent>

                  <TabsContent value="audit">
                    <ChangeTimelineComponent
                      initialVersion={comparison.initialVersion}
                      currentVersion={comparison.currentVersion}
                      metrics={comparison.summaryMetrics}
                      periodName={periodName}
                    />
                  </TabsContent>
                </Tabs>
              )
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {comparison && (
            <>
              <Button onClick={repairIdentities} disabled={repairing || loading} variant="secondary">
                {repairing ? 'Reparando…' : 'Reparar identidades'}
              </Button>
              <Button onClick={exportComparison} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Comparación
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};