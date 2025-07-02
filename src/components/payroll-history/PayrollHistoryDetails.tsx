import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  DollarSign,
  Edit,
  Save,
  Undo2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PayrollHistoryDetails as PayrollDetails, PayrollHistoryEmployee } from '@/types/payroll-history';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNovedades } from '@/hooks/useNovedades';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { EditableEmployeeTable } from './EditableEmployeeTable';
import { ReopenedPeriodBanner } from '../payroll/ReopenedPeriodBanner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const PayrollHistoryDetails = () => {
  const { id: periodId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasModuleAccess, isSuperAdmin } = useAuth();
  
  const [details, setDetails] = useState<PayrollDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // Check if user can edit periods
  const canEditPeriods = isSuperAdmin || hasModuleAccess('payroll-history');
  
  // Payroll history hooks for reopening functionality
  const {
    isReopening,
    canUserReopenPeriods,
    checkUserPermissions,
    reopenPeriod,
    closePeriodAgain
  } = usePayrollHistory();

  // Hook para manejar novedades - using the correct method name
  const {
    loadNovedades
  } = useNovedades(periodId || '');

  useEffect(() => {
    if (periodId) {
      loadPeriodDetails();
      checkUserPermissions();
    }
  }, [periodId, checkUserPermissions]);

  const loadPeriodDetails = async () => {
    if (!periodId) return;
    
    try {
      setIsLoading(true);
      const data = await PayrollHistoryService.getPeriodDetails(periodId);
      setDetails(data);
      
      // Load novedades efficiently - only if needed
      if (data.employees.length > 0) {
        console.log('Loading novedades for period employees');
      }
    } catch (error) {
      console.error('Error loading period details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
      // Show confirmation dialog or save changes
      return;
    }
    setIsEditMode(!isEditMode);
    setHasUnsavedChanges(false);
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      // Save all pending changes
      await loadPeriodDetails(); // Reload to get updated totals
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      
      toast({
        title: "Cambios guardados",
        description: "Todos los cambios se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setIsEditMode(false);
    loadPeriodDetails(); // Reload original data
  };

  const handleEmployeeUpdate = (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => {
    if (!details) return;
    
    console.log('Updating employee values:', employeeId, updates);
    
    // Update local state
    const updatedEmployees = details.employees.map(emp => 
      emp.id === employeeId ? { ...emp, ...updates } : emp
    );
    
    // Recalculate summary totals
    const newSummary = {
      totalDevengado: updatedEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalDeducciones: updatedEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
      totalNeto: updatedEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
      costoTotal: updatedEmployees.reduce((sum, emp) => sum + emp.grossPay + emp.deductions, 0),
      aportesEmpleador: updatedEmployees.length * 100000 // Mock calculation
    };
    
    setDetails({
      ...details,
      employees: updatedEmployees,
      summary: newSummary
    });
    
    setHasUnsavedChanges(true);
  };

  const handleNovedadChange = () => {
    console.log('Novedad change callback triggered, reloading data');
    loadPeriodDetails();
  };

  const handleReopenPeriod = async () => {
    if (!details?.period.period) return;
    
    try {
      await reopenPeriod(details.period.period);
      setShowReopenDialog(false);
      await loadPeriodDetails(); // Refresh to show updated status
    } catch (error) {
      console.error('Error reopening period:', error);
    }
  };

  const handleClosePeriod = async () => {
    if (!details?.period.period) return;
    
    try {
      await closePeriodAgain(details.period.period);
      await loadPeriodDetails(); // Refresh to show updated status
      setIsEditMode(false);
    } catch (error) {
      console.error('Error closing period:', error);
    }
  };

  const handleFinishEditing = () => {
    handleClosePeriod();
  };

  const handleDismissBanner = () => {
    // Just hide edit mode but keep period reopened
    setIsEditMode(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cerrado':
        return 'bg-green-100 text-green-800';
      case 'reabierto':
        return 'bg-amber-100 text-amber-800';
      case 'con_errores':
        return 'bg-red-100 text-red-800';
      case 'revision':
        return 'bg-yellow-100 text-yellow-800';
      case 'editado':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Período no encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            No se pudo cargar la información del período solicitado
          </p>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = canEditPeriods && (details.period.status === 'revision' || details.period.status === 'editado' || details.period.status === 'reabierto');
  const canReopen = canEditPeriods && canUserReopenPeriods && details.period.status === 'cerrado';
  const isReopened = details.period.status === 'reabierto';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/app/payroll-history')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al historial</span>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Detalles del Período
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {details.period.period}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Exportar Detalles</span>
              </Button>
              {canReopen && (
                <Button
                  onClick={() => setShowReopenDialog(true)}
                  variant="default"
                  className="flex items-center space-x-2"
                  disabled={isReopening}
                >
                  <Edit className="h-4 w-4" />
                  <span>{isReopening ? 'Reabriendo...' : 'Editar período'}</span>
                </Button>
              )}
              {canEdit && (
                <Button
                  onClick={handleToggleEditMode}
                  variant={isEditMode ? "secondary" : "default"}
                  className="flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>{isEditMode ? 'Cancelar edición' : 'Editar período'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Reopened Period Banner */}
        {isReopened && (
          <ReopenedPeriodBanner
            periodName={details.period.period}
            startDate={details.period.startDate}
            endDate={details.period.endDate}
            onFinishEditing={handleFinishEditing}
            onDismiss={handleDismissBanner}
          />
        )}

        {/* Period Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              <Badge className={getStatusColor(details.period.status)}>
                {details.period.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date(details.period.startDate).toLocaleDateString()} - {new Date(details.period.endDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empleados</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{details.period.employeesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devengado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(details.summary.totalDevengado)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neto Pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(details.summary.totalNeto)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Empleados del Período</span>
              {isEditMode && (
                <Badge variant="secondary" className="ml-2">
                  Modo edición activo
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableEmployeeTable
              employees={details.employees}
              isEditMode={isEditMode}
              onEmployeeUpdate={handleEmployeeUpdate}
              periodId={periodId!}
              periodData={{
                startDate: details.period.startDate,
                endDate: details.period.endDate,
                type: details.period.type
              }}
              onNovedadChange={handleNovedadChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg px-6 py-4 flex items-center space-x-4 z-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>Tienes cambios sin guardar</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar todo'}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              <Undo2 className="h-4 w-4" />
              <span>Deshacer</span>
            </Button>
          </div>
        </div>
      )}

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir Período Cerrado</AlertDialogTitle>
            <AlertDialogDescription>
              Este período está cerrado. Si deseas hacer ajustes, será reabierto temporalmente. 
              Podrás agregar, editar o eliminar novedades. Para que los cambios sean válidos, 
              deberás cerrarlo nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenPeriod} disabled={isReopening}>
              {isReopening ? 'Reabriendo...' : 'Reabrir Período'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
