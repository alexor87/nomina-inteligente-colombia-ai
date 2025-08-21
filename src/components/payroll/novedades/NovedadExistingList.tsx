import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Eye, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNovedades } from '@/hooks/useNovedades';
import { DisplayNovedad, SeparatedTotals } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';
import { VacationAbsenceDetailModal } from '@/components/vacations/VacationAbsenceDetailModal';
import { supabase } from '@/integrations/supabase/client';

interface NovedadExistingListProps {
  employeeId: string;
  periodId: string;
  employeeName: string;
  onAddNew: () => void;
  onClose: () => void;
  refreshTrigger?: number;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
  onUnifiedDelete?: (novedadId: string, employeeId: string) => Promise<void>;
}

export const NovedadExistingList: React.FC<NovedadExistingListProps> = ({
  employeeId,
  periodId,
  employeeName,
  onAddNew,
  onClose,
  refreshTrigger,
  onEmployeeNovedadesChange,
  onUnifiedDelete
}) => {
  const [integratedData, setIntegratedData] = useState<DisplayNovedad[]>([]);
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

  const recalculateIncapacitiesIfNeeded = async (items: DisplayNovedad[]): Promise<DisplayNovedad[]> => {
    try {
      const incapItems = items.filter(i => i.tipo_novedad === 'incapacidad' && (i.dias || 0) > 0);
      if (incapItems.length === 0) {
        return items;
      }

      console.log('🔍 Recalculando incapacidades (policy-aware) para', incapItems.length, 'ítems');

      let periodStart: string | null = null;
      const { data: periodRow } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio')
        .eq('id', periodId)
        .single();
      if (periodRow?.fecha_inicio) {
        periodStart = periodRow.fecha_inicio;
      }
      console.log('📅 Period start for calculation:', periodStart);

      const uniqueEmployeeIds = Array.from(new Set(items.map(i => i.empleado_id).filter(Boolean))) as string[];
      let salaryMap = new Map<string, number>();
      if (uniqueEmployeeIds.length > 0) {
        const { data: employeesData, error: empErr } = await supabase
          .from('employees')
          .select('id, salario_base')
          .in('id', uniqueEmployeeIds);
        if (!empErr && employeesData) {
          employeesData.forEach((e: any) => salaryMap.set(e.id, Number(e.salario_base || 0)));
        }
      }
      console.log('💰 Salary map size:', salaryMap.size);

      const adjusted = await Promise.all(items.map(async (item) => {
        if (item.tipo_novedad !== 'incapacidad' || !item.empleado_id) {
          return item;
        }
        const salarioBase = salaryMap.get(item.empleado_id) || 0;
        const dias = Number(item.dias || 0);
        if (salarioBase <= 0 || dias <= 0) {
          return item;
        }

        try {
          const { data, error } = await supabase.functions.invoke('payroll-calculations', {
            body: {
              action: 'calculate-novedad',
              data: {
                tipoNovedad: 'incapacidad',
                subtipo: item.subtipo,
                salarioBase,
                dias,
                fechaPeriodo: periodStart || undefined
              }
            }
          });

          if (error) {
            console.warn('⚠️ Edge function error (calculate-novedad):', error);
            return item;
          }
          if (data?.success && typeof data.data?.valor === 'number') {
            const nuevoValor = Number(data.data.valor);
            const updated: DisplayNovedad = { ...item, valor: nuevoValor };
            console.log('✅ Ajuste incapacidad:', {
              empleado: item.empleado_id,
              subtipo: item.subtipo,
              dias,
              old: item.valor,
              new: nuevoValor
            });
            return updated;
          }
        } catch (e) {
          console.error('❌ Error recalculando incapacidad:', e);
        }

        return item;
      }));

      return adjusted;
    } catch (e) {
      console.error('❌ Error en recalculateIncapacitiesIfNeeded:', e);
      return items;
    }
  };

  const fetchIntegratedData = async () => {
    try {
      setLoading(true);
      console.log('📋 Cargando datos integrados para empleado:', employeeId, 'período:', periodId);
      const result = await loadIntegratedNovedades(employeeId);

      const adjusted = await recalculateIncapacitiesIfNeeded(result);
      setIntegratedData(adjusted);

      console.log('📊 Datos integrados cargados (ajustados):', adjusted.length, 'elementos');
    } catch (error) {
      console.error('❌ Error cargando datos integrados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos integrados",
        variant: "destructive",
      });
      setIntegratedData([]);
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
      console.log('🔄 RefreshTrigger activado, recargando datos integrados...');
      fetchIntegratedData();
    }
  }, [refreshTrigger]);

  const handleEditNovedad = (item: DisplayNovedad) => {
    console.log('✏️ Editando novedad:', item);
    toast({
      title: "Funcionalidad en desarrollo",
      description: "La edición de novedades estará disponible próximamente",
    });
  };

  const handleViewVacationDetail = async (item: DisplayNovedad) => {
    try {
      console.log('👁️ Viendo detalles de vacación:', item);
      
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
    console.log('🔗 Navegando al módulo de vacaciones para empleado:', employeeId);
    
    navigate('/app/vacations-absences', {
      state: { 
        filterByEmployee: employeeId,
        employeeName: employeeName
      }
    });
    
    onClose();
  };

  const handleDeleteByOrigin = async (item: DisplayNovedad) => {
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
          const { error } = await supabase
            .from('employee_vacation_periods')
            .delete()
            .eq('id', item.id);

          if (error) throw error;

          setIntegratedData(prev => prev.filter(n => n.id !== item.id));
          
          if (onEmployeeNovedadesChange) {
            console.log('🔄 Notificando cambio después de eliminar ausencia para:', employeeId);
            await onEmployeeNovedadesChange(employeeId);
          }
          
          toast({
            title: "Ausencia eliminada",
            description: "La ausencia se ha eliminado correctamente",
          });
        } catch (error) {
          console.error('Error eliminando ausencia:', error);
          toast({
            title: "Error",
            description: "No se pudo eliminar la ausencia",
            variant: "destructive",
          });
        }
      }
    } else {
      if (onUnifiedDelete) {
        console.log('🎯 USANDO ELIMINACIÓN UNIFICADA para novedad:', item.id);
        if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
          await onUnifiedDelete(item.id, employeeId);
          // Actualizar la lista local inmediatamente
          setIntegratedData(prev => prev.filter(n => n.id !== item.id));
        }
      } else {
        console.log('🔄 Usando eliminación legacy para novedad:', item.id);
        if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
          try {
            await deleteNovedad(item.id);
            setIntegratedData(prev => prev.filter(n => n.id !== item.id));
            
            if (onEmployeeNovedadesChange) {
              console.log('🔄 Notificando cambio después de eliminar novedad para:', employeeId);
              await onEmployeeNovedadesChange(employeeId);
            }
            
            toast({
              title: "Novedad eliminada",
              description: "La novedad se ha eliminado correctamente",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "No se pudo eliminar la novedad",
              variant: "destructive",
            });
          }
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
    try {
      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', vacationId);

      if (error) throw error;

      setIntegratedData(prev => prev.filter(n => n.id !== vacationId));
      
      if (onEmployeeNovedadesChange) {
        await onEmployeeNovedadesChange(employeeId);
      }
      
      toast({
        title: "Ausencia eliminada",
        description: "La ausencia se ha eliminado correctamente",
      });
      
      setVacationDetailModal({ isOpen: false, vacation: null });
    } catch (error) {
      console.error('Error eliminando ausencia:', error);
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

  const getSeparatedTotals = (): SeparatedTotals => {
    const confirmed = integratedData.filter(n => n.isConfirmed);
    const estimated = integratedData.filter(n => !n.isConfirmed);

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
      }
    };
  };

  const getActionButtons = (item: DisplayNovedad) => {
    if (item.origen === 'vacaciones') {
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
          {item.status === 'pendiente' && (
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
              Vista integrada • {integratedData.length} elemento{integratedData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Novedad
          </Button>
        </div>

        {integratedData.length === 0 ? (
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
              <Button onClick={onAddNew} variant="outline">
                Agregar Primera Novedad
              </Button>
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
