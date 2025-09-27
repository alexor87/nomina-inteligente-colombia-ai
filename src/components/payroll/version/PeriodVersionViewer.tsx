import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PeriodVersionComparisonService } from '@/services/PeriodVersionComparisonService';
import type { VersionComparison } from '@/services/PeriodVersionComparisonService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessImpactSummary } from './BusinessImpactSummary';
import { EmployeeChangeCard } from './EmployeeChangeCard';
import { ChangeTimelineComponent } from './ChangeTimelineComponent';
import { RollbackConfirmationModal } from './RollbackConfirmationModal';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PayrollRollbackService, type RollbackImpact } from '@/services/PayrollRollbackService';
import { 
  Clock, 
  Download, 
  FileText, 
  RefreshCw, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  FileX,
  RotateCcw
} from 'lucide-react';

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
  const [backfilling, setBackfilling] = useState(false);
  const [rollbackModal, setRollbackModal] = useState<{
    isOpen: boolean;
    versionId: string | null;
    versionNumber: number | null;
    impact: RollbackImpact | null;
    hasVouchers: boolean;
  }>({
    isOpen: false,
    versionId: null,
    versionNumber: null,
    impact: null,
    hasVouchers: false
  });
  const [isRollbackLoading, setIsRollbackLoading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && periodId) {
      loadComparison();
    }
  }, [isOpen, periodId]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const data = await PeriodVersionComparisonService.generatePeriodComparison(
        periodId,
        periodName
      );
      setComparison(data);
    } catch (error) {
      console.error('Error loading period comparison:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de versiones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const backfillEmployeeNames = async () => {
    if (!comparison || !comparison.employeeChanges) return;
    
    setBackfilling(true);
    try {
      const employeeIds = Object.keys(comparison.employeeChanges);
      
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido')
        .in('id', employeeIds);

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      if (employees && employees.length > 0) {
        const updatedComparison = { ...comparison };
        employees.forEach(emp => {
          if (updatedComparison.employeeChanges[emp.id]) {
            updatedComparison.employeeChanges[emp.id].employeeName = `${emp.nombre} ${emp.apellido}`;
          }
        });
        
        setComparison(updatedComparison);
        toast({
          title: "Nombres actualizados",
          description: `Se actualizaron los nombres de ${employees.length} empleados`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error backfilling employee names:', error);
      toast({
        title: "Error",
        description: "Error actualizando los nombres de empleados",
        variant: "destructive"
      });
    } finally {
      setBackfilling(false);
    }
  };

  const exportComparison = () => {
    if (!comparison || !comparison.employeeChanges) return;

    const csvData = [
      ['Empleado ID', 'Nombre', 'Valor Anterior', 'Valor Nuevo', 'Diferencia', 'Tipo de Cambio']
    ];

    Object.entries(comparison.employeeChanges).forEach(([employeeId, change]) => {
      csvData.push([
        employeeId,
        change.employeeName || 'Desconocido',
        change.oldValue?.toString() || '0',
        change.newValue?.toString() || '0',
        change.difference?.toString() || '0',
        change.changeType || 'unknown'
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacion-versiones-${periodName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportación exitosa",
      description: "El archivo CSV se ha descargado correctamente",
      variant: "default"
    });
  };

  const repairIdentities = async () => {
    setRepairing(true);
    try {
      await loadComparison();
      toast({
        title: "Identidades reparadas",
        description: "Se ha recargado la comparación con las identidades actualizadas",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error reparando las identidades",
        variant: "destructive"
      });
    } finally {
      setRepairing(false);
    }
  };

  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleRollbackClick = async (versionId: string, versionNumber: number) => {
    try {
      console.log('🔍 Preparing rollback to version:', versionId);
      
      // Validate rollback possibility
      const validation = await PayrollRollbackService.canRollbackToVersion(versionId, periodId);
      
      if (!validation.canRollback) {
        toast({
          title: "Rollback no disponible",
          description: validation.reason || "No se puede ejecutar el rollback en este momento",
          variant: "destructive"
        });
        return;
      }

      // Get detailed impact
      const impact = await PayrollRollbackService.getRollbackImpact(versionId, periodId);
      
      setRollbackModal({
        isOpen: true,
        versionId,
        versionNumber,
        impact,
        hasVouchers: validation.impactSummary.hasVouchers
      });

    } catch (error) {
      console.error('❌ Error preparing rollback:', error);
      toast({
        title: "Error",
        description: "No se pudo preparar el rollback. Intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const handleRollbackConfirm = async (justification: string) => {
    if (!rollbackModal.versionId) return;
    
    setIsRollbackLoading(true);
    
    try {
      const result = await PayrollRollbackService.rollbackToVersion(
        rollbackModal.versionId,
        periodId,
        justification
      );

      if (result.success) {
        toast({
          title: "Rollback Exitoso",
          description: "La nómina ha sido restaurada exitosamente",
          variant: "default"
        });
        
        // Close modal and refresh
        setRollbackModal({
          isOpen: false,
          versionId: null,
          versionNumber: null,
          impact: null,
          hasVouchers: false
        });
        
        // Reload comparison data
        await loadComparison();
        
        // Optionally close the main dialog or refresh parent
        onClose();
        
      } else {
        toast({
          title: "Error en Rollback",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      toast({
        title: "Error",
        description: "Error ejecutando el rollback. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsRollbackLoading(false);
    }
  };

  const handleRollbackCancel = () => {
    setRollbackModal({
      isOpen: false,
      versionId: null,
      versionNumber: null,
      impact: null,
      hasVouchers: false
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              Historial de Versiones - {periodName}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg">Cargando historial...</span>
              </div>
            ) : !comparison ? (
              <div className="flex items-center justify-center p-8">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                <span className="ml-3 text-lg text-muted-foreground">
                  No se pudo cargar el historial de versiones
                </span>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Empleados ({Object.keys(comparison.employeeChanges || {}).length})
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <BusinessImpactSummary 
                    metrics={comparison.summaryMetrics}
                    employeeChanges={comparison.employeeChanges}
                  />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Historial de Versiones
                    </h3>
                    <div className="space-y-4">
                      {/* Show initial and current versions */}
                      {[comparison.currentVersion, comparison.initialVersion].filter(Boolean).map((version, index) => (
                        <Card key={version.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Versión {version.version_number}</span>
                                </div>
                                <Badge variant={
                                  version.version_type === 'initial' ? 'secondary' :
                                  version.version_type === 'correction' ? 'destructive' :
                                  version.version_type === 'rollback' ? 'outline' :
                                  'default'
                                }>
                                  {version.version_type === 'initial' ? 'Inicial' :
                                   version.version_type === 'correction' ? 'Corrección' :
                                   version.version_type === 'rollback' ? 'Rollback' :
                                   'Manual'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Show rollback button only for non-current versions */}
                                {index > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRollbackClick(version.id, version.version_number)}
                                    disabled={isRollbackLoading}
                                    className="gap-2"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Restaurar
                                  </Button>
                                )}
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(version.created_at).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {(version as any).created_by_email || 'Usuario desconocido'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {version.changes_summary}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="employees" className="space-y-4">
                  {Object.entries(comparison.employeeChanges || {}).map(([employeeId, change]) => (
                    <EmployeeChangeCard
                      key={employeeId}
                      employeeId={employeeId}
                      change={change}
                      isExpanded={expandedEmployees.has(employeeId)}
                      onToggleExpansion={() => toggleEmployeeExpansion(employeeId)}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                <ChangeTimelineComponent
                  initialVersion={comparison.initialVersion}
                  currentVersion={comparison.currentVersion}
                  metrics={comparison.summaryMetrics}
                  periodName={periodName}
                />
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            
            {comparison && (
              <>
                <Button
                  variant="outline"
                  onClick={backfillEmployeeNames}
                  disabled={backfilling}
                  className="gap-2"
                >
                  {backfilling ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {backfilling ? 'Actualizando...' : 'Actualizar Nombres'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={repairIdentities}
                  disabled={repairing}
                  className="gap-2"
                >
                  {repairing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileX className="h-4 w-4" />
                  )}
                  {repairing ? 'Reparando...' : 'Reparar Identidades'}
                </Button>
                
                <Button
                  onClick={exportComparison}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>

        {/* Rollback Confirmation Modal */}
        <RollbackConfirmationModal
          isOpen={rollbackModal.isOpen}
          onClose={handleRollbackCancel}
          onConfirm={handleRollbackConfirm}
          isLoading={isRollbackLoading}
          versionNumber={rollbackModal.versionNumber || 0}
          rollbackImpact={rollbackModal.impact}
          hasVouchers={rollbackModal.hasVouchers}
        />
      </Dialog>
    </>
  );
};