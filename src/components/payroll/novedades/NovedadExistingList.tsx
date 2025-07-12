
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Eye, ExternalLink } from 'lucide-react';
import { useNovedades } from '@/hooks/useNovedades';
import { DisplayNovedad } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';

interface NovedadExistingListProps {
  employeeId: string;
  periodId: string;
  employeeName: string;
  onAddNew: () => void;
  onClose: () => void;
  refreshTrigger?: number;
  onEmployeeNovedadesChange?: (employeeId: string) => Promise<void>;
}

export const NovedadExistingList: React.FC<NovedadExistingListProps> = ({
  employeeId,
  periodId,
  employeeName,
  onAddNew,
  onClose,
  refreshTrigger,
  onEmployeeNovedadesChange
}) => {
  const [integratedData, setIntegratedData] = useState<DisplayNovedad[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadIntegratedNovedades, deleteNovedad } = useNovedades(periodId);
  const { toast } = useToast();

  const fetchIntegratedData = async () => {
    try {
      setLoading(true);
      console.log('📋 Cargando datos integrados para empleado:', employeeId, 'período:', periodId);
      const result = await loadIntegratedNovedades(employeeId);
      setIntegratedData(result);
      console.log('📊 Datos integrados cargados:', result.length, 'elementos');
    } catch (error) {
      console.error('❌ Error cargando datos integrados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos integrados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar y cuando cambien los parámetros
  useEffect(() => {
    if (employeeId && periodId) {
      fetchIntegratedData();
    }
  }, [employeeId, periodId]);

  // Refrescar cuando cambie refreshTrigger
  useEffect(() => {
    if (refreshTrigger && employeeId && periodId) {
      console.log('🔄 RefreshTrigger activado, recargando datos integrados...');
      fetchIntegratedData();
    }
  }, [refreshTrigger]);

  const handleDelete = async (item: DisplayNovedad) => {
    if (item.origen === 'vacaciones') {
      toast({
        title: "Acción no disponible",
        description: "Las ausencias/vacaciones deben eliminarse desde su módulo específico",
        variant: "default",
      });
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
      try {
        await deleteNovedad(item.id);
        setIntegratedData(prev => prev.filter(n => n.id !== item.id));
        
        // Notificar cambio a la tabla principal
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
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getTotalDevengos = () => {
    return integratedData
      .filter(n => n.valor > 0)
      .reduce((sum, n) => sum + n.valor, 0);
  };

  const getTotalDeducciones = () => {
    return Math.abs(integratedData
      .filter(n => n.valor < 0)
      .reduce((sum, n) => sum + n.valor, 0));
  };

  const getActionButtons = (item: DisplayNovedad) => {
    if (item.origen === 'vacaciones') {
      return (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
            onClick={() => {
              // Aquí se podría abrir el modal de detalles de vacaciones
              toast({
                title: "Información",
                description: "Funcionalidad de vista detallada en desarrollo",
              });
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
            onClick={() => {
              toast({
                title: "Redirección",
                description: "Ir al módulo de vacaciones (funcionalidad en desarrollo)",
              });
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {item.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              onClick={() => handleDelete(item)}
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
            disabled // Por ahora edición está deshabilitada
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
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

  return (
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
          {/* Resumen integrado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalDevengos())}
                </div>
                <p className="text-xs text-gray-600">Total Devengos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalDeducciones())}
                </div>
                <p className="text-xs text-gray-600">Total Deducciones</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(getTotalDevengos() - getTotalDeducciones())}
                </div>
                <p className="text-xs text-gray-600">Neto Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista integrada mejorada */}
          <div className="space-y-3">
            {integratedData.map((item) => (
              <Card key={`${item.origen}-${item.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Origen y tipo */}
                    <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={item.badgeColor}>
                            {item.badgeIcon} {item.badgeLabel}
                          </Badge>
                          <Badge variant="outline" className={item.statusColor}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.tipo_novedad.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Valor monetario */}
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

                    {/* Columna 3: Detalles (horas/días) */}
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

                    {/* Columna 4: Observaciones */}
                    <div className="col-span-12 sm:col-span-8 lg:col-span-4">
                      {item.observacion && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-left">
                          <div className="line-clamp-2">
                            {item.observacion}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Columna 5: Acciones */}
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
  );
};
