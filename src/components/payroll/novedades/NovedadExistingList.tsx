
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Eye, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNovedades } from '@/hooks/useNovedades';
import { DisplayNovedad, SeparatedTotals } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';
import { VacationAbsenceDetailModal } from '@/components/vacations/VacationAbsenceDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';
import { PendingAdjustmentsService, PendingAdjustmentRecord } from '@/services/PendingAdjustmentsService';
import { PendingNovedad } from '@/types/pending-adjustments';

interface NovedadExistingListProps {
  employeeId: string;
  periodId: string;
  employeeName: string;
  onAddNew: () => void;
  onClose: () => void;
  refreshTrigger?: number;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
  mode?: 'liquidacion' | 'ajustes';
  companyId?: string | null;
  canEdit?: boolean;
}

export const NovedadExistingList: React.FC<NovedadExistingListProps> = ({
  employeeId,
  periodId,
  employeeName,
  onAddNew,
  onClose,
  refreshTrigger,
  onEmployeeNovedadesChange,
  mode = 'liquidacion',
  companyId,
  canEdit = true
}) => {
  const [integratedData, setIntegratedData] = useState<DisplayNovedad[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacationDetailModal, setVacationDetailModal] = useState<{
    isOpen: boolean;
    vacation: any | null;
  }>({ isOpen: false, vacation: null });
  
  const { loadIntegratedNovedades, deleteNovedad } = useNovedades(periodId);
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatTipoNovedad = (tipo: string, subtipo?: string) => {
    if (tipo === 'recargo_nocturno') {
      switch (subtipo) {
        case 'nocturno':
          return 'Recargo nocturno';
        case 'dominical':
          return 'Recargo dominical';
        case 'nocturno_dominical':
          return 'Recargo nocturno dominical';
        default:
          return 'Recargo nocturno';
      }
    }

    const tipos: Record<string, string> = {
      'horas_extra': 'Horas Extra',
      'bonificacion': 'Bonificación',
      'incapacidad': 'Incapacidad',
      'vacaciones': 'Vacaciones',
      'licencia_remunerada': 'Licencia',
      'otros_ingresos': 'Otros Ingresos',
      'descuento_voluntario': 'Descuento',
      'libranza': 'Libranza'
    };

    const base = tipos[tipo] || tipo;
    return subtipo && tipo !== 'recargo_nocturno' ? `${base} (${subtipo})` : base;
  };

  const fetchIntegratedData = async () => {
    try {
      setLoading(true);
      
      // Load regular integrated data
      const result = await loadIntegratedNovedades(employeeId);
      setIntegratedData(result);
      
      // Load pending adjustments for this employee
      const pending = await PendingAdjustmentsService.getPendingAdjustmentsForEmployee(employeeId, periodId);
      setPendingAdjustments(pending);
      
    } catch (error) {
      console.error('Error cargando datos integrados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos integrados",
        variant: "destructive",
      });
      setIntegratedData([]);
      setPendingAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId && periodId) {
      fetchIntegratedData();
    }
  }, [employeeId, periodId]);

  useEffect(() => {
    if (refreshTrigger && employeeId && periodId) {
      fetchIntegratedData();
    }
  }, [refreshTrigger]);

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
        filterByEmployee: employeeId,
        employeeName: employeeName
      }
    });
    
    onClose();
  };

  const handleDeleteByOrigin = async (item: DisplayNovedad) => {
    // For closed periods in adjustment mode, create pending deletion instead of immediate deletion
    if (mode === 'ajustes' && companyId && !item.origen.includes('pending')) {
      try {
        const pendingDeletion: PendingNovedad = {
          employee_id: employeeId,
          employee_name: employeeName,
          tipo_novedad: item.tipo_novedad,
          valor: 0, // Delete operations have no value impact until applied
          observacion: `Eliminar: ${item.tipo_novedad}${item.subtipo ? ` (${item.subtipo})` : ''}`,
          novedadData: {
            empleado_id: employeeId,
            periodo_id: periodId,
            company_id: companyId,
            tipo_novedad: item.tipo_novedad as any,
            subtipo: item.subtipo,
            valor: item.valor,
            observacion: `Eliminar: ${item.tipo_novedad}${item.subtipo ? ` (${item.subtipo})` : ''}`,
            action: 'delete',
            novedad_id: item.id,
            fecha_inicio: item.fecha_inicio,
            fecha_fin: item.fecha_fin,
            dias: item.dias,
            horas: item.horas
          }
        };

        // Save as pending adjustment
        await PendingAdjustmentsService.savePendingAdjustment(pendingDeletion);
        
        // Add to local pending adjustments state to show immediately
        setPendingAdjustments(prev => [...prev, {
          id: `temp-delete-${Date.now()}`,
          company_id: companyId,
          employee_id: employeeId,
          employee_name: employeeName,
          period_id: periodId,
          tipo_novedad: item.tipo_novedad,
          subtipo: item.subtipo,
          valor: 0,
          dias: item.dias,
          horas: item.horas,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          observacion: pendingDeletion.observacion,
          novedad_data: pendingDeletion.novedadData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        toast({
          title: "⏳ Eliminación Pendiente",
          description: `La novedad será eliminada cuando apliques los ajustes. Se reliquidará el período automáticamente.`,
          className: "border-yellow-200 bg-yellow-50"
        });

        // Trigger parent component update to show pending adjustments banner
        await onEmployeeNovedadesChange?.(employeeId);
        
      } catch (error) {
        console.error('Error creating pending deletion:', error);
        toast({
          title: "Error",
          description: "No se pudo crear la eliminación pendiente",
          variant: "destructive",
        });
      }
      return;
    }

    // Original delete logic for draft periods and vacations
    const { setLastRefreshTime } = useEmployeeNovedadesCacheStore.getState();
    
    if (item.origen === 'vacaciones') {
      if (item.status !== 'pendiente') {
        toast({
          title: "Acción no disponible",
          description: "Solo se pueden eliminar ausencias en estado pendiente",
          variant: "default",
        });
        return;
      }

      if (window.confirm('¿Estás seguro de que deseas eliminar esta ausencia?')) {
        try {
          console.log('🗑️ NovedadExistingList: Eliminando ausencia y actualizando cache global:', item.id);
          
          const { error } = await supabase
            .from('employee_vacation_periods')
            .delete()
            .eq('id', item.id);

          if (error) throw error;

          setIntegratedData(prev => prev.filter(n => n.id !== item.id));
          
          // Update global cache store to trigger liquidation recalculation
          setLastRefreshTime(Date.now());
          console.log('✅ NovedadExistingList: Ausencia eliminada y cache actualizado');
          
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
      }
    } else {
      if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
        try {
          console.log('🗑️ NovedadExistingList: Eliminando novedad (useNovedades se encarga del cache):', item.id);
          await deleteNovedad(item.id);
          setIntegratedData(prev => prev.filter(n => n.id !== item.id));
          
          if (onEmployeeNovedadesChange) {
            await onEmployeeNovedadesChange(employeeId);
          }
          
          toast({
            title: "Novedad eliminada",
            description: "La novedad se ha eliminado correctamente",
          });
        } catch (error) {
          console.error('❌ NovedadExistingList: Error eliminando novedad:', error);
          toast({
            title: "Error",
            description: "No se pudo eliminar la novedad",
            variant: "destructive",
          });
        }
      }
    }
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
      console.log('🗑️ NovedadExistingList: Eliminando ausencia desde modal y actualizando cache global:', vacationId);
      
      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', vacationId);

      if (error) throw error;

      setIntegratedData(prev => prev.filter(n => n.id !== vacationId));
      
      // Update global cache store to trigger liquidation recalculation
      setLastRefreshTime(Date.now());
      console.log('✅ NovedadExistingList: Ausencia eliminada desde modal y cache actualizado');
      
      if (onEmployeeNovedadesChange) {
        await onEmployeeNovedadesChange(employeeId);
      }
      
      toast({
        title: "Ausencia eliminada",
        description: "La ausencia se ha eliminado correctamente",
      });
      
      setVacationDetailModal({ isOpen: false, vacation: null });
    } catch (error) {
      console.error('❌ NovedadExistingList: Error eliminando ausencia desde modal:', error);
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
    return pending.map(p => {
      const novedadData = p.novedad_data as any;
      const isDeleteAction = novedadData?.action === 'delete';
      
      return {
        id: p.id,
        origen: 'pending_adjustment' as any, // Use single origin for consistency
        tipo_novedad: p.tipo_novedad as any,
        subtipo: p.subtipo,
        valor: p.valor,
        dias: p.dias || 0,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        observacion: p.observacion,
        isConfirmed: false, // Pending adjustments are never confirmed
        badgeLabel: isDeleteAction 
          ? `Eliminar: ${formatTipoNovedad(p.tipo_novedad, p.subtipo)}`
          : `Agregar: ${formatTipoNovedad(p.tipo_novedad, p.subtipo)}`,
        badgeColor: isDeleteAction ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800',
        badgeIcon: isDeleteAction ? '🗑️' : '➕',
        statusColor: isDeleteAction ? 'border-red-200 text-red-700' : 'border-orange-200 text-orange-700',
        status: 'pendiente',
        canEdit: false,
        canDelete: true,
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });
  };

  const getSeparatedTotals = (): SeparatedTotals & { pending: { devengos: number; deducciones: number; neto: number; count: number } } => {
    const confirmed = integratedData.filter(n => n.isConfirmed);
    const estimated = integratedData.filter(n => !n.isConfirmed);
    const pending = convertPendingToDisplay(pendingAdjustments);

    return {
      confirmed: {
        devengos: confirmed.filter(n => n.valor > 0).reduce((sum, n) => sum + n.valor, 0),
        deducciones: Math.abs(confirmed.filter(n => n.valor < 0).reduce((sum, n) => sum + n.valor, 0)),
        neto: confirmed.reduce((sum, n) => sum + n.valor, 0),
        count: confirmed.length
      },
      estimated: {
        devengos: estimated.filter(n => n.valor > 0).reduce((sum, n) => sum + n.valor, 0),
        deducciones: Math.abs(estimated.filter(n => n.valor < 0).reduce((sum, n) => sum + n.valor, 0)),
        neto: estimated.reduce((sum, n) => sum + n.valor, 0),
        count: estimated.length
      },
      pending: {
        devengos: pending.filter(n => n.valor > 0).reduce((sum, n) => sum + n.valor, 0),
        deducciones: Math.abs(pending.filter(n => n.valor < 0).reduce((sum, n) => sum + n.valor, 0)),
        neto: pending.reduce((sum, n) => sum + n.valor, 0),
        count: pending.length
      }
    };
  };

  // Handle deletion of pending adjustments
  const handleDeletePendingAdjustment = async (adjustmentId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este ajuste pendiente?')) {
      try {
        await PendingAdjustmentsService.deletePendingAdjustment(adjustmentId);
        setPendingAdjustments(prev => prev.filter(p => p.id !== adjustmentId));
        
        // Trigger recalculation and UI update
        if (onEmployeeNovedadesChange) {
          await onEmployeeNovedadesChange(employeeId);
        }
        
        toast({
          title: "Ajuste eliminado",
          description: "El ajuste pendiente se ha eliminado correctamente",
        });
      } catch (error) {
        console.error('❌ Error eliminando ajuste pendiente:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el ajuste pendiente",
          variant: "destructive",
        });
      }
    }
  };

  const getActionButtons = (item: DisplayNovedad) => {
    // Handle both pending adjustment types (create and delete)
    if (item.origen === 'pending_adjustment' as any || item.origen === 'pending_delete' as any) {
      return (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              onClick={() => handleDeletePendingAdjustment(item.id)}
              title="Eliminar ajuste pendiente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    } else if (item.origen === 'vacaciones') {
      return (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
            onClick={() => handleViewVacationDetail(item)}
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
            onClick={() => handleGoToVacationModule(employeeId)}
            title="Ir al módulo de vacaciones"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {item.status === 'pendiente' && canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              onClick={() => handleDeleteByOrigin(item)}
              title="Eliminar ausencia"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex gap-1">
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                onClick={() => handleEditNovedad(item)}
                title="Editar novedad"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteByOrigin(item)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                title="Eliminar novedad"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando datos integrados...</p>
      </div>
    );
  }

  const separatedTotals = getSeparatedTotals();

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Novedades y Ausencias de {employeeName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Vista integrada • {integratedData.length} novedad{integratedData.length !== 1 ? 'es' : ''} 
              {pendingAdjustments.length > 0 && (
                <> • {pendingAdjustments.length} ajuste{pendingAdjustments.length !== 1 ? 's' : ''} pendiente{pendingAdjustments.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <Button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Novedad
          </Button>
        </div>

        {integratedData.length === 0 && pendingAdjustments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin registros encontrados
              </h3>
              <p className="text-gray-600 mb-4">
                Este empleado no tiene novedades ni ausencias registradas
              </p>
              {canEdit && (
                <Button onClick={onAddNew} variant="outline">
                  Agregar Primera Novedad
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                    ✅ Valores Confirmados
                    <Badge variant="outline" className="text-xs">
                      {separatedTotals.confirmed.count}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Devengos:</span>
                    <span className="font-semibold text-green-800">
                      {formatCurrency(separatedTotals.confirmed.devengos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Deducciones:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(separatedTotals.confirmed.deducciones)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-green-800">Neto:</span>
                    <span className="font-bold text-green-900">
                      {formatCurrency(separatedTotals.confirmed.neto)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    ⏳ Valores Estimados
                    <Badge variant="outline" className="text-xs">
                      {separatedTotals.estimated.count}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-700">Devengos:</span>
                    <span className="font-semibold text-yellow-800">
                      {formatCurrency(separatedTotals.estimated.devengos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-700">Deducciones:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(separatedTotals.estimated.deducciones)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-yellow-200">
                    <span className="text-sm font-medium text-yellow-800">Neto:</span>
                    <span className="font-bold text-yellow-900">
                      {formatCurrency(separatedTotals.estimated.neto)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {/* Regular novedades */}
              {integratedData.map((item) => (
                <Card key={`${item.origen}-${item.id}`} className={`hover:shadow-md transition-shadow ${!item.isConfirmed ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={item.badgeColor}>
                              {item.badgeIcon} {item.badgeLabel}
                            </Badge>
                            <Badge variant="outline" className={item.statusColor}>
                              {item.status === 'procesada' ? 'Procesada' : 
                               item.status === 'pendiente' ? 'Pendiente' :
                               item.status === 'registrada' ? 'Registrada' : 
                               item.status}
                            </Badge>
                            {!item.isConfirmed && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                                Estimado
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatTipoNovedad(item.tipo_novedad, item.subtipo)}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                        <div className="text-right sm:text-left">
                          <div className={`text-lg font-bold ${item.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(item.valor))}
                          </div>
                          {item.valor < 0 && (
                            <div className="text-xs text-red-500">Deducción</div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-6 sm:col-span-2 lg:col-span-2">
                        <div className="text-sm text-gray-600 space-y-1">
                          {item.horas && (
                            <div className="flex items-center">
                              <span className="font-medium">{item.horas}</span>
                              <span className="ml-1">hrs</span>
                            </div>
                          )}
                          {item.dias && (
                            <div className="flex items-center">
                              <span className="font-medium">{item.dias}</span>
                              <span className="ml-1">días</span>
                            </div>
                          )}
                          {item.fecha_inicio && item.fecha_fin && (
                            <div className="text-xs text-gray-500">
                              {item.fecha_inicio} / {item.fecha_fin}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-12 sm:col-span-8 lg:col-span-4">
                        {item.observacion && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-left">
                            <div className="line-clamp-2">
                              {item.observacion}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-span-12 sm:col-span-4 lg:col-span-1">
                        <div className="flex justify-end sm:justify-center">
                          {getActionButtons(item)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pending adjustments */}
              {convertPendingToDisplay(pendingAdjustments).map((item) => (
                <Card key={`pending-${item.id}`} className="border-orange-200 bg-orange-50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.badgeLabel}
                            </Badge>
                            <Badge variant="outline" className="border-orange-200 text-orange-700">
                              Pendiente
                            </Badge>
                          </div>
                          {item.fecha_inicio && item.fecha_fin && (
                            <p className="text-xs text-orange-600">
                              {new Date(item.fecha_inicio).toLocaleDateString('es-CO')} - {new Date(item.fecha_fin).toLocaleDateString('es-CO')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-12 sm:col-span-2 lg:col-span-2 text-center">
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          {item.dias} día{item.dias !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="col-span-12 sm:col-span-3 lg:col-span-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${item.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.valor)}
                          </div>
                          {item.observacion && (
                            <p className="text-xs text-orange-600 mt-1 truncate" title={item.observacion}>
                              {item.observacion}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-12 sm:col-span-3 lg:col-span-3 text-right">
                        {getActionButtons(item)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      <VacationAbsenceDetailModal
        isOpen={vacationDetailModal.isOpen}
        onClose={() => setVacationDetailModal({ isOpen: false, vacation: null })}
        vacation={vacationDetailModal.vacation}
        onEdit={handleEditVacation}
        onDelete={handleDeleteVacation}
      />
    </>
  );
};
