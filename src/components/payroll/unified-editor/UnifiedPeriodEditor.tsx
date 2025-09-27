import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  FileEdit, 
  BarChart3, 
  Save, 
  X, 
  RefreshCw, 
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useUnifiedPeriodEdit, PeriodEmployee, PeriodNovedad } from '@/contexts/UnifiedPeriodEditContext';
import { formatCurrency } from '@/lib/utils';
import { EmployeeCompositionTab } from './tabs/EmployeeCompositionTab';
import { NovedadesManagementTab } from './tabs/NovedadesManagementTab';
import { SummaryPreviewTab } from './tabs/SummaryPreviewTab';

interface UnifiedPeriodEditorProps {
  open: boolean;
  onClose: () => void;
  periodId: string;
  periodName: string;
}

export const UnifiedPeriodEditor: React.FC<UnifiedPeriodEditorProps> = ({
  open,
  onClose,
  periodId,
  periodName
}) => {
  const { 
    editState, 
    saveChanges, 
    discardChanges, 
    recalculatePreview 
  } = useUnifiedPeriodEdit();

  const [activeTab, setActiveTab] = useState<'employees' | 'novedades' | 'summary'>('employees');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [justification, setJustification] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (editState.hasChanges) {
      const confirmDiscard = window.confirm(
        '¿Estás seguro de que quieres cerrar el editor? Todos los cambios no guardados se perderán.'
      );
      if (!confirmDiscard) return;
      discardChanges();
    }
    onClose();
  };

  const handleSave = async () => {
    if (!justification.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveChanges(justification);
      setShowSaveDialog(false);
      setJustification('');
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTabBadgeCount = (tab: string) => {
    switch (tab) {
      case 'employees':
        const addedEmployees = editState.employees.filter(emp => emp.isNew && !emp.isRemoved).length;
        const removedEmployees = editState.employees.filter(emp => emp.isRemoved).length;
        return addedEmployees + removedEmployees;
      case 'novedades':
        const addedNovedades = editState.novedades.filter(nov => nov.isNew && !nov.isRemoved).length;
        const modifiedNovedades = editState.novedades.filter(nov => nov.isModified && !nov.isRemoved).length;
        const removedNovedades = editState.novedades.filter(nov => nov.isRemoved).length;
        return addedNovedades + modifiedNovedades + removedNovedades;
      case 'summary':
        return 0;
      default:
        return 0;
    }
  };

  const totalChanges = editState.employees.filter(emp => emp.isNew || emp.isRemoved).length +
                     editState.novedades.filter(nov => nov.isNew || nov.isModified || nov.isRemoved).length;

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Editor Unificado - {periodName}
              {editState.hasChanges && (
                <Badge variant="secondary" className="ml-2">
                  {totalChanges} cambio{totalChanges !== 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-6 pt-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="employees" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Empleados
                      {getTabBadgeCount('employees') > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">
                          {getTabBadgeCount('employees')}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="novedades" className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4" />
                      Novedades
                      {getTabBadgeCount('novedades') > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">
                          {getTabBadgeCount('novedades')}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Resumen
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 overflow-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsContent value="employees" className="m-0 p-6">
                    <EmployeeCompositionTab />
                  </TabsContent>
                  <TabsContent value="novedades" className="m-0 p-6">
                    <NovedadesManagementTab />
                  </TabsContent>
                  <TabsContent value="summary" className="m-0 p-6">
                    <SummaryPreviewTab />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Right Sidebar - Live Totals */}
            <div className="w-80 border-l bg-muted/30 p-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4" />
                    Totales del Período
                    {editState.isRecalculating && (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current vs Original Comparison */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Empleados</span>
                        <div className="text-right">
                          <div className="font-medium">{editState.currentTotals.totalEmployees}</div>
                          {editState.currentTotals.totalEmployees !== editState.originalTotals.totalEmployees && (
                            <div className="text-xs text-muted-foreground">
                              (Antes: {editState.originalTotals.totalEmployees})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Devengado</span>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(editState.currentTotals.totalGrossPay)}</div>
                          {editState.currentTotals.totalGrossPay !== editState.originalTotals.totalGrossPay && (
                            <div className="text-xs text-muted-foreground">
                              (Antes: {formatCurrency(editState.originalTotals.totalGrossPay)})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Deducciones</span>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(editState.currentTotals.totalDeductions)}</div>
                          {editState.currentTotals.totalDeductions !== editState.originalTotals.totalDeductions && (
                            <div className="text-xs text-muted-foreground">
                              (Antes: {formatCurrency(editState.originalTotals.totalDeductions)})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Neto</span>
                        <div className="text-right">
                          <div className="font-medium text-primary">{formatCurrency(editState.currentTotals.totalNetPay)}</div>
                          {editState.currentTotals.totalNetPay !== editState.originalTotals.totalNetPay && (
                            <div className="text-xs text-muted-foreground">
                              (Antes: {formatCurrency(editState.originalTotals.totalNetPay)})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Change Summary */}
                  {editState.hasChanges && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">CAMBIOS PENDIENTES</div>
                      
                      {editState.employees.filter(emp => emp.isNew && !emp.isRemoved).length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600">+ Empleados agregados</span>
                          <span className="font-medium">{editState.employees.filter(emp => emp.isNew && !emp.isRemoved).length}</span>
                        </div>
                      )}
                      
                      {editState.employees.filter(emp => emp.isRemoved).length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600">- Empleados removidos</span>
                          <span className="font-medium">{editState.employees.filter(emp => emp.isRemoved).length}</span>
                        </div>
                      )}
                      
                      {editState.novedades.filter(nov => nov.isNew && !nov.isRemoved).length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-600">+ Novedades agregadas</span>
                          <span className="font-medium">{editState.novedades.filter(nov => nov.isNew && !nov.isRemoved).length}</span>
                        </div>
                      )}
                      
                      {editState.novedades.filter(nov => nov.isModified && !nov.isRemoved).length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-yellow-600">~ Novedades modificadas</span>
                          <span className="font-medium">{editState.novedades.filter(nov => nov.isModified && !nov.isRemoved).length}</span>
                        </div>
                      )}
                      
                      {editState.novedades.filter(nov => nov.isRemoved).length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600">- Novedades removidas</span>
                          <span className="font-medium">{editState.novedades.filter(nov => nov.isRemoved).length}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <Button 
                  onClick={() => recalculatePreview()} 
                  disabled={editState.isRecalculating}
                  className="w-full"
                  variant="outline"
                >
                  {editState.isRecalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Recalculando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalcular Preview
                    </>
                  )}
                </Button>

                {editState.hasChanges && (
                  <>
                    <Button 
                      onClick={() => setShowSaveDialog(true)}
                      disabled={editState.isRecalculating}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </Button>

                    <Button 
                      onClick={discardChanges}
                      variant="outline" 
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Descartar Cambios
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar Cambios
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Los cambios se aplicarán al período de forma permanente. Esta acción generará una nueva versión con auditoría completa.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="justification">Justificación de los cambios *</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe brevemente los cambios realizados y la razón..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!justification.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar y Guardar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};