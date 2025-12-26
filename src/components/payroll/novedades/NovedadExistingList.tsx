
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

    // Mapeo de subtipos de ingresos adicionales
    if (tipo === 'otros_ingresos' && subtipo) {
      const ingresosSubtipos: Record<string, string> = {
        'comision': 'Comisión',
        'auxilio_alimentacion': 'Auxilio de Alimentación',
        'prima_extralegal': 'Prima Extralegal',
        'otros_ingresos': 'Otros Ingresos'
      };
      return ingresosSubtipos[subtipo] || subtipo;
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

  const getNovedadDetails = (item: DisplayNovedad): string | null => {
    const details: string[] = [];
    
    // Para bonificaciones y otros ingresos: mostrar constitutividad
    if (['bonificacion', 'otros_ingresos', 'horas_extra'].includes(item.tipo_novedad)) {
      if (item.constitutivo_salario !== undefined) {
        details.push(item.constitutivo_salario 
          ? '✓ Constitutivo de salario' 
          : '○ No constitutivo de salario');
      }
    }
    
    // Para incapacidades: mostrar tipo
    if (item.tipo_novedad === 'incapacidad' && item.subtipo) {
      const tipos: Record<string, string> = {
        'general': 'Incapacidad General',
        'laboral': 'Incapacidad Laboral',
        'licencia_maternidad': 'Licencia de Maternidad',
        'licencia_paternidad': 'Licencia de Paternidad'
      };
      details.push(tipos[item.subtipo] || item.subtipo);
    }
    
    // Agregar observación del usuario si existe
    if (item.observacion) {
      details.push(item.observacion);
    }
    
    return details.length > 0 ? details.join(' • ') : null;
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
          variant: "warning"
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
    const adjustmentToDelete = pendingAdjustments.find(p => p.id === adjustmentId);
    const isDeleteAction = (adjustmentToDelete?.novedad_data as any)?.action === 'delete';
    
    const confirmMessage = isDeleteAction 
      ? '¿Estás seguro de que deseas cancelar la eliminación pendiente? La novedad original se mantendrá en el período.'
      : '¿Estás seguro de que deseas eliminar este ajuste? Se eliminará inmediatamente sin afectar la liquidación actual.';
    
    if (window.confirm(confirmMessage)) {
      try {
        // Add fade-out animation class before deletion
        const cardElement = document.querySelector(`[data-pending-id="${adjustmentId}"]`);
        if (cardElement) {
          cardElement.classList.add('animate-fade-out');
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait for animation
        }
        
        await PendingAdjustmentsService.deletePendingAdjustment(adjustmentId);
        setPendingAdjustments(prev => prev.filter(p => p.id !== adjustmentId));
        
        // Trigger recalculation and UI update
        if (onEmployeeNovedadesChange) {
          await onEmployeeNovedadesChange(employeeId);
        }
        
        toast({
          title: isDeleteAction ? "Eliminación cancelada" : "Ajuste eliminado",
          description: isDeleteAction 
            ? "La eliminación pendiente fue cancelada. La novedad original se mantiene."
            : "El ajuste fue eliminado inmediatamente. No afecta la liquidación actual.",
          className: "border-green-200 bg-green-50"
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
      const adjustmentData = pendingAdjustments.find(p => p.id === item.id);
      const isDeleteAction = (adjustmentData?.novedad_data as any)?.action === 'delete';
      
      return (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => handleDeletePendingAdjustment(item.id)}
              title={isDeleteAction 
                ? "Cancelar eliminación - La novedad original se mantendrá" 
                : "Eliminar inmediatamente - No afecta liquidación actual"
              }
            >
              <Trash2 className="h-3 w-3" />
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
          {canEdit && (
            <Button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Novedad
            </Button>
          )}
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
            {/* Summary bar - compact horizontal design */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 mb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="text-xs text-emerald-600 font-medium">Devengos</span>
                    <p className="text-sm font-bold text-emerald-800">{formatCurrency(separatedTotals.confirmed.devengos)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div>
                    <span className="text-xs text-red-600 font-medium">Deducciones</span>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(separatedTotals.confirmed.deducciones)}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-emerald-200"></div>
                <div>
                  <span className="text-xs text-emerald-600 font-medium">Neto Total</span>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(separatedTotals.confirmed.neto)}</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                {separatedTotals.confirmed.count} novedad{separatedTotals.confirmed.count !== 1 ? 'es' : ''}
              </Badge>
            </div>

            {/* Pending adjustments alert */}
            {pendingAdjustments.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  <strong>{pendingAdjustments.length}</strong> ajuste{pendingAdjustments.length !== 1 ? 's' : ''} pendiente{pendingAdjustments.length !== 1 ? 's' : ''} de aplicar
                </span>
              </div>
            )}

            <div className="space-y-2">
              {/* Regular novedades - simplified cards */}
              {integratedData.map((item) => (
                <Card 
                  key={`${item.origen}-${item.id}`} 
                  className={`hover:shadow-md transition-all duration-200 border-l-4 ${
                    !item.isConfirmed 
                      ? 'border-l-amber-400 bg-amber-50/50' 
                      : item.valor >= 0 
                        ? 'border-l-emerald-400' 
                        : 'border-l-red-400'
                  }`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Type and badges */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${item.badgeColor} text-xs`}>
                              {item.badgeIcon}
                            </Badge>
                            <span className="font-medium text-sm text-foreground">
                              {formatTipoNovedad(item.tipo_novedad, item.subtipo)}
                            </span>
                            <Badge variant="outline" className={`${item.statusColor} text-xs`}>
                              {item.status === 'procesada' ? 'Procesada' : 
                               item.status === 'pendiente' ? 'Pendiente' :
                               item.status === 'registrada' ? 'Registrada' : 
                               item.status}
                            </Badge>
                            {!item.isConfirmed && (
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                Estimado
                              </Badge>
                            )}
                          </div>
                          {/* Details row */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.horas && <span>{item.horas} hrs</span>}
                            {item.dias && <span>{item.dias} días</span>}
                            {item.fecha_inicio && item.fecha_fin && (
                              <span>{item.fecha_inicio} → {item.fecha_fin}</span>
                            )}
                            {(() => {
                              const details = getNovedadDetails(item);
                              return details && <span className="truncate max-w-[200px]" title={details}>{details}</span>;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Right: Value and actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-base font-bold ${item.valor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.valor < 0 && '-'}{formatCurrency(Math.abs(item.valor))}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {getActionButtons(item)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pending adjustments - distinctive styling */}
              {convertPendingToDisplay(pendingAdjustments).map((item) => (
                <Card 
                  key={`pending-${item.id}`} 
                  data-pending-id={item.id} 
                  className="border-l-4 border-l-amber-500 bg-amber-50/70 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </Badge>
                            <span className="font-medium text-sm text-foreground">
                              {item.badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.dias && <span>{item.dias} día{item.dias !== 1 ? 's' : ''}</span>}
                            {item.fecha_inicio && item.fecha_fin && (
                              <span>
                                {new Date(item.fecha_inicio).toLocaleDateString('es-CO')} → {new Date(item.fecha_fin).toLocaleDateString('es-CO')}
                              </span>
                            )}
                            {item.observacion && (
                              <span className="truncate max-w-[200px]" title={item.observacion}>{item.observacion}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-base font-bold ${item.valor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.valor < 0 && '-'}{formatCurrency(Math.abs(item.valor))}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {getActionButtons(item)}
                        </div>
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
