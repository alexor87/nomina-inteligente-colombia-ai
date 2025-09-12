import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Eye, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { DisplayNovedad, SeparatedTotals } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';
import { VacationAbsenceDetailModal } from '@/components/vacations/VacationAbsenceDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';
import { PendingAdjustmentsService, PendingAdjustmentRecord } from '@/services/PendingAdjustmentsService';
import { DeleteNovedadConfirmModal } from '@/components/payroll/corrections/DeleteNovedadConfirmModal';
import { PeriodState } from '@/types/pending-adjustments';
import { createDeleteHandler } from './NovedadExistingList_handleDelete';
import { useUserCompany } from '@/hooks/useUserCompany';

interface NovedadExistingListProps {
  employeeId: string;
  periodId: string;
  employeeName: string;
  onAddNew: () => void;
  onClose: () => void;
  refreshTrigger?: number;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
  periodState?: PeriodState;
  // Legacy props for compatibility (liquidación mode)
  onPendingAdjustmentChange?: () => void;
  addPendingDeletion?: (employeeId: string, employeeName: string, originalNovedad: any) => void;
  // New props for edit period integration
  editState?: 'closed' | 'editing' | 'saving' | 'discarding';
  pendingChanges?: {
    novedades: {
      added: any[];
      modified: any[];
      deleted: string[];
    };
  };
  onAddNovedad?: (novedadData: any) => void;
  onRemoveNovedad?: (novedadId: string) => void;
}

export const NovedadExistingList: React.FC<NovedadExistingListProps> = ({
  employeeId,
  periodId,
  employeeName,
  onAddNew,
  onClose,
  refreshTrigger,
  onEmployeeNovedadesChange,
  periodState = 'borrador',
  onPendingAdjustmentChange,
  addPendingDeletion,
  // New edit period props
  editState,
  pendingChanges,
  onAddNovedad,
  onRemoveNovedad
}) => {
  const [integratedData, setIntegratedData] = useState<DisplayNovedad[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacationDetailModal, setVacationDetailModal] = useState<{
    isOpen: boolean;
    vacation: any | null;
  }>({ isOpen: false, vacation: null });
  
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    novedad: DisplayNovedad | null;
  }>({ isOpen: false, novedad: null });
  
  const { companyId } = useUserCompany();
  
  const { 
    novedades: unifiedNovedades,
    isLoading: isLoadingUnified,
    deleteNovedad,
    refetch: refetchNovedades
  } = usePayrollNovedadesUnified({
    companyId,
    periodId,
    employeeId,
    enabled: !!(companyId && periodId && employeeId)
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatTipoNovedad = (tipo: string, subtipo?: string) => {
    if (tipo === 'recargo_nocturno') {
      switch (subtipo) {
        case 'nocturno':
          return 'Recargo Nocturno';
        case 'dominical_festivo':
          return 'Dominical y Festivo';
        case 'nocturno_dominical_festivo':
          return 'Nocturno Dominical';
        default:
          return 'Recargo';
      }
    }
    
    const mappings: Record<string, string> = {
      'hora_extra': 'Horas Extra',
      'auxilio_transporte': 'Auxilio Transporte',
      'bonificacion': 'Bonificación',
      'comision': 'Comisión',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad',
      'licencia_remunerada': 'Licencia Remunerada',
      'licencia_no_remunerada': 'Licencia No Remunerada',
      'ausencia': 'Ausencia',
      'prestamo': 'Préstamo',
      'descuento': 'Descuento',
      'anticipo': 'Anticipo',
      'deduccion_salud': 'Deducción Salud',
      'deduccion_pension': 'Deducción Pensión'
    };
    
    return mappings[tipo] || tipo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const fetchIntegratedData = useCallback(async () => {
    if (!employeeId || !periodId) return;
    
    setLoading(true);
    try {
      // Use unified novedades data directly
      const displayNovedades = unifiedNovedades.map(novedad => ({
        id: novedad.id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        valor: novedad.valor,
        dias: novedad.dias,
        horas: novedad.horas,
        observacion: novedad.observacion,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        origen: 'novedades' as const,
        status: 'registrada' as const,
        processed_in_period_id: novedad.periodo_id,
        isConfirmed: true,
        canEdit: true,
        canDelete: true,
        badgeColor: 'bg-blue-100 text-blue-800',
        badgeIcon: '📋',
        badgeLabel: 'Novedad',
        statusColor: 'bg-blue-100 text-blue-800',
        created_at: novedad.created_at,
        updated_at: novedad.updated_at,
      }));
      
      setIntegratedData(displayNovedades);
      
      // Only load legacy pending adjustments if not in edit mode
      if (editState !== 'editing') {
        const pendingData = await PendingAdjustmentsService.getPendingAdjustmentsForEmployee(employeeId, periodId);
        setPendingAdjustments(pendingData);
        
        console.log('📊 NovedadExistingList: Datos cargados (modo legacy):', { 
          novedades: displayNovedades.length, 
          pending: pendingData.length,
          employeeId, 
          periodId 
        });
      } else {
        // In edit mode, pending changes come from the hook
        setPendingAdjustments([]);
        console.log('📊 NovedadExistingList: Datos cargados (modo edición):', { 
          novedades: displayNovedades.length, 
          pendingFromHook: pendingChanges?.novedades?.added?.length || 0,
          employeeId, 
          periodId 
        });
      }
    } catch (error) {
      console.error('❌ NovedadExistingList: Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, periodId, refetchNovedades, toast, editState, pendingChanges, unifiedNovedades]);

  useEffect(() => {
    fetchIntegratedData();
  }, [fetchIntegratedData]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchIntegratedData();
    }
  }, [refreshTrigger, fetchIntegratedData]);

  const handleEditNovedad = (item: DisplayNovedad) => {
    toast({
      title: "Funcionalidad en desarrollo",
      description: "La edición de novedades estará disponible próximamente",
    });
  };

  const handleViewVacationDetail = async (item: DisplayNovedad) => {
    try {
      const { data: vacation, error } = await supabase
        .from('employee_vacation_periods')
        .select(`
          *,
          employee:employees(nombre, apellido, cedula)
        `)
        .eq('id', item.id)
        .single();

      if (error) throw error;

      setVacationDetailModal({
        isOpen: true,
        vacation: vacation
      });
    } catch (error) {
      console.error('Error cargando detalles de vacación:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la ausencia",
        variant: "destructive",
      });
    }
  };

  const handleGoToVacationModule = (employeeId: string) => {
    navigate('/app/vacations-absences', {
      state: { 
        prefilterEmployeeId: employeeId,
        employeeName: employeeName
      }
    });
    onClose();
  };

  const handleDeleteByOrigin = async (item: DisplayNovedad) => {
    if (item.origen === 'vacaciones') {
      try {
        console.log('🗑️ NovedadExistingList: Eliminando ausencia desde lista y actualizando cache global:', item.id);
        
        const { error } = await supabase
          .from('employee_vacation_periods')
          .delete()
          .eq('id', item.id);
          
        if (error) throw error;
        
        const { setLastRefreshTime } = useEmployeeNovedadesCacheStore.getState();
        setLastRefreshTime(Date.now());
        
        setIntegratedData(prev => prev.filter(n => n.id !== item.id));
        
        if (onEmployeeNovedadesChange) {
          await onEmployeeNovedadesChange(employeeId);
        }
        
        toast({
          title: "Ausencia eliminada",
          description: "La ausencia se ha eliminado correctamente",
        });
      } catch (error) {
        console.error('❌ NovedadExistingList: Error eliminando ausencia:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la ausencia",
          variant: "destructive",
        });
      }
    } else {
      // Open confirmation modal for regular novedades
      setDeleteConfirmModal({
        isOpen: true,
        novedad: item
      });
    }
  };

  // Wrapper for deleteNovedad to match expected return type
  const deleteNovedadWrapper = async (id: string): Promise<{ success: boolean; error?: any }> => {
    try {
      await deleteNovedad(id);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Create the delete handler - choose based on edit mode
  const handleConfirmDelete = React.useMemo(() => {
    if (editState === 'editing' && onRemoveNovedad) {
      // Edit mode: use the hook's remove function
      return async (createPendingAdjustment: boolean, novedad: DisplayNovedad) => {
        try {
          console.log('🗑️ Edit mode deletion:', novedad.id);
          onRemoveNovedad(novedad.id);
          
          // Also remove from local state for immediate UI update
          setIntegratedData(prev => prev.filter(n => n.id !== novedad.id));
          
          toast({
            title: "Novedad marcada para eliminación",
            description: "La eliminación se aplicará al guardar los cambios",
          });
        } catch (error) {
          console.error('❌ Error in edit mode deletion:', error);
          toast({
            title: "Error",
            description: "No se pudo marcar la novedad para eliminación",
            variant: "destructive",
          });
        }
      };
    } else {
      // Legacy mode: use existing delete handler
      return createDeleteHandler(
        deleteNovedadWrapper,
        addPendingDeletion || (() => console.error('addPendingDeletion not available')),
        onEmployeeNovedadesChange,
        onPendingAdjustmentChange,
        setIntegratedData,
        toast,
        employeeId,
        employeeName
      );
    }
  }, [editState, onRemoveNovedad, deleteNovedad, addPendingDeletion, onEmployeeNovedadesChange, onPendingAdjustmentChange, toast, employeeId, employeeName]);

  const onDeleteConfirm = (createPendingAdjustment: boolean, novedad: DisplayNovedad) => {
    handleConfirmDelete(createPendingAdjustment, novedad);
    setDeleteConfirmModal({ isOpen: false, novedad: null });
  };

  const handleEditVacation = (vacation: any) => {
    navigate('/app/vacations-absences', {
      state: { 
        editVacation: vacation,
        employeeName: employeeName
      }
    });
    
    setVacationDetailModal({ isOpen: false, vacation: null });
    onClose();
  };

  const handleDeleteVacation = async (vacationId: string) => {
    const { setLastRefreshTime } = useEmployeeNovedadesCacheStore.getState();
    
    try {
      // Check if period is closed and we should create a pending adjustment
      if (periodState === 'cerrado' && addPendingDeletion) {
        console.log('🔄 Period is closed, creating pending deletion adjustment for vacation:', vacationId);
        
        // Find the vacation in the current data to get its details
        const vacationNovedad = integratedData.find(n => n.id === vacationId);
        if (vacationNovedad) {
          // Create pending deletion adjustment
          addPendingDeletion(employeeId, employeeName, {
            id: vacationNovedad.id,
            tipo_novedad: vacationNovedad.tipo_novedad,
            subtipo: vacationNovedad.subtipo,
            valor: vacationNovedad.valor,
            dias: vacationNovedad.dias,
            fecha_inicio: vacationNovedad.fecha_inicio,
            fecha_fin: vacationNovedad.fecha_fin,
            constitutivo_salario: false // Default for most novedades
          });

          // Trigger pending adjustment change callback immediately
          if (onPendingAdjustmentChange) {
            onPendingAdjustmentChange();
          }

          setVacationDetailModal({ isOpen: false, vacation: null });

          toast({
            title: "Ajuste de eliminación pendiente",
            description: `Se creó un ajuste para eliminar ${vacationNovedad.badgeLabel} en la próxima re-liquidación`,
            className: "border-orange-200 bg-orange-50"
          });
        }
        return;
      }
      
      // Period is open - delete directly
      console.log('🗑️ NovedadExistingList: Eliminando ausencia desde modal y actualizando cache global:', vacationId);
      
      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', vacationId);
        
      if (error) throw error;
      
      setLastRefreshTime(Date.now());
      setIntegratedData(prev => prev.filter(n => n.id !== vacationId));
      
      if (onEmployeeNovedadesChange) {
        await onEmployeeNovedadesChange(employeeId);
      }
      
      setVacationDetailModal({ isOpen: false, vacation: null });
      
      toast({
        title: "Ausencia eliminada",
        description: "La ausencia se ha eliminado correctamente desde el detalle",
      });
    } catch (error) {
      console.error('❌ NovedadExistingList: Error eliminando ausencia:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la ausencia",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Convert pending adjustments to display format
  const convertPendingToDisplay = (pending: PendingAdjustmentRecord[]): DisplayNovedad[] => {
    return pending.map(p => ({
      id: p.id,
      origen: 'pending_adjustment' as any,
      tipo_novedad: p.tipo_novedad as any,
      subtipo: p.subtipo,
      valor: p.valor,
      dias: p.dias || 0,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      observacion: p.observacion,
      isConfirmed: false, // Pending adjustments are never confirmed
      badgeLabel: formatTipoNovedad(p.tipo_novedad, p.subtipo),
      badgeColor: 'bg-orange-100 text-orange-800',
      badgeIcon: '⏳',
      statusColor: 'border-orange-200 text-orange-700',
          status: 'pendiente' as const,
      canEdit: false,
      canDelete: true,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
  };

  const getSeparatedTotals = (): SeparatedTotals & { pending: { devengos: number; deducciones: number; neto: number; count: number } } => {
    const confirmed = integratedData.filter(n => n.isConfirmed);
    const estimated = integratedData.filter(n => !n.isConfirmed);
    
    // Get pending data from appropriate source
    const pendingData = editState === 'editing' 
      ? (pendingChanges?.novedades?.added?.filter(n => n.empleado_id === employeeId) || [])
      : pendingAdjustments;
    
    const pending = editState === 'editing' 
      ? pendingData.map((n: any) => ({
          id: n.id || `temp-${Date.now()}`,
          origen: 'edit_pending' as any,
          tipo_novedad: n.tipo_novedad,
          subtipo: n.subtipo,
          valor: n.valor,
          dias: n.dias || 0,
          fecha_inicio: n.fecha_inicio,
          fecha_fin: n.fecha_fin,
          observacion: n.observacion,
          isConfirmed: false,
          badgeLabel: formatTipoNovedad(n.tipo_novedad, n.subtipo),
          badgeColor: 'bg-blue-100 text-blue-800',
          badgeIcon: '⏳',
          statusColor: 'border-blue-200 text-blue-700',
          status: 'pendiente' as const,
          canEdit: false,
          canDelete: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      : convertPendingToDisplay(pendingAdjustments);

    // Calculate totals for each category
    const calculateTotals = (items: DisplayNovedad[]) => {
      let devengos = 0;
      let deducciones = 0;
      
      items.forEach(item => {
        if (item.valor > 0) {
          devengos += item.valor;
        } else {
          deducciones += Math.abs(item.valor);
        }
      });
      
      return { devengos, deducciones, neto: devengos - deducciones };
    };

    const confirmedTotals = calculateTotals(confirmed);
    const estimatedTotals = calculateTotals(estimated);
    const pendingTotals = calculateTotals(pending);

    return {
      confirmed: {
        ...confirmedTotals,
        count: confirmed.length
      },
      estimated: {
        ...estimatedTotals, 
        count: estimated.length
      },
      pending: {
        ...pendingTotals,
        count: pending.length
      }
    };
  };

  const handleDeletePendingAdjustment = async (adjustmentId: string) => {
    try {
      await PendingAdjustmentsService.deletePendingAdjustment(adjustmentId);
      setPendingAdjustments(prev => prev.filter(p => p.id !== adjustmentId));
      
      toast({
        title: "Ajuste eliminado",
        description: "El ajuste pendiente se ha eliminado",
      });
    } catch (error) {
      console.error('Error eliminando ajuste pendiente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ajuste pendiente",
        variant: "destructive",
      });
    }
  };

  const getActionButtons = (item: DisplayNovedad) => {
    const buttons = [];
    
    if (item.origen === 'pending_adjustment' as any) {
      // For pending adjustments, only show delete button
      buttons.push(
        <Button
          key="delete"
          variant="outline"
          size="sm"
          onClick={() => handleDeletePendingAdjustment(item.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      );
    } else {
      // For regular novedades, show standard actions
      
      if (item.canEdit) {
        buttons.push(
          <Button
            key="edit"
            variant="outline"
            size="sm"
            onClick={() => handleEditNovedad(item)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        );
      }

      if (item.origen === 'vacaciones') {
        buttons.push(
          <Button
            key="view"
            variant="outline"
            size="sm"
            onClick={() => handleViewVacationDetail(item)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        );
        
        buttons.push(
          <Button
            key="goto"
            variant="outline"
            size="sm"
            onClick={() => handleGoToVacationModule(employeeId)}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        );
      }

      if (item.canDelete) {
        buttons.push(
          <Button
            key="delete"
            variant="outline"
            size="sm"
            onClick={() => handleDeleteByOrigin(item)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        );
      }
    }

    return (
      <div className="flex gap-1 justify-end">
        {buttons}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Novedades - {employeeName}
            </h2>
            <Badge variant="outline" className="text-sm">
              {integratedData.length} registros
            </Badge>
            {getSeparatedTotals().pending.count > 0 && (
              <Badge variant="secondary" className={editState === 'editing' ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                <Clock className="h-3 w-3 mr-1" />
                {getSeparatedTotals().pending.count} {editState === 'editing' ? 'por aplicar' : 'pendientes'}
              </Badge>
            )}
          </div>
          
          <Button onClick={onAddNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Nueva
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando novedades...</p>
          </div>
        ) : (
          <>
            {integratedData.length === 0 && getSeparatedTotals().pending.count === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No hay novedades registradas para este empleado</p>
                    <Button onClick={onAddNew} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar Primera Novedad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const { pending } = getSeparatedTotals();
                  const pendingItems = editState === 'editing' 
                    ? (pendingChanges?.novedades?.added?.filter(n => n.empleado_id === employeeId) || []).map((n: any) => ({
                        id: n.id || `temp-${Date.now()}`,
                        origen: 'edit_pending' as any,
                        tipo_novedad: n.tipo_novedad,
                        subtipo: n.subtipo,
                        valor: n.valor,
                        dias: n.dias || 0,
                        fecha_inicio: n.fecha_inicio,
                        fecha_fin: n.fecha_fin,
                        observacion: n.observacion,
                        isConfirmed: false,
                        badgeLabel: formatTipoNovedad(n.tipo_novedad, n.subtipo),
                        badgeColor: 'bg-blue-100 text-blue-800',
                        badgeIcon: '⏳',
                        statusColor: 'border-blue-200 text-blue-700',
                        status: 'pendiente' as const,
                        canEdit: false,
                        canDelete: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      }))
                    : convertPendingToDisplay(pendingAdjustments);
                  
                  return [...pendingItems, ...integratedData];
                })().map((item, index) => (
                  <Card key={`${item.origen}-${item.id}-${index}`} className={`transition-all duration-200 ${item.statusColor || 'hover:shadow-md'}`}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-12 sm:col-span-6 lg:col-span-6">
                          <div className="flex items-center gap-3">
                            <Badge className={item.badgeColor}>
                              <span className="mr-1">{item.badgeIcon}</span>
                              {item.badgeLabel}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {item.fecha_inicio && item.fecha_fin && (
                                <span>
                                  {new Date(item.fecha_inicio).toLocaleDateString()} - {new Date(item.fecha_fin).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <p className="font-medium text-lg">
                              {item.valor >= 0 ? '+' : ''}{formatCurrency(item.valor)}
                            </p>
                            {item.dias > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {item.dias} {item.dias === 1 ? 'día' : 'días'}
                              </p>
                            )}
                          </div>
                          
                          {item.observacion && (
                            <p className="text-xs text-orange-600 mt-1 truncate" title={item.observacion}>
                              {item.observacion}
                            </p>
                          )}
                        </div>
                        
                        <div className="col-span-12 sm:col-span-3 lg:col-span-3 text-right">
                          {getActionButtons(item)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <VacationAbsenceDetailModal
          isOpen={vacationDetailModal.isOpen}
          onClose={() => setVacationDetailModal({ isOpen: false, vacation: null })}
          vacation={vacationDetailModal.vacation}
          onEdit={handleEditVacation}
          onDelete={handleDeleteVacation}
        />

        <DeleteNovedadConfirmModal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, novedad: null })}
          onConfirm={onDeleteConfirm}
          novedad={deleteConfirmModal.novedad}
          periodState={periodState}
          employeeName={employeeName}
        />

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nueva
          </Button>
        </div>
      </div>
    </>
  );
};