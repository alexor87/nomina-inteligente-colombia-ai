import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useNovedades } from '@/hooks/useNovedades';
import { PayrollNovedad } from '@/types/novedades-enhanced';
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
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadNovedades, deleteNovedad } = useNovedades(periodId);
  const { toast } = useToast();

  const fetchNovedades = async () => {
    try {
      setLoading(true);
      console.log('📋 Cargando novedades para empleado:', employeeId, 'período:', periodId);
      const result = await loadNovedades(employeeId);
      setNovedades(result);
      console.log('📊 Novedades cargadas:', result.length, 'elementos');
    } catch (error) {
      console.error('❌ Error cargando novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar novedades al montar y cuando cambien los parámetros
  useEffect(() => {
    if (employeeId && periodId) {
      fetchNovedades();
    }
  }, [employeeId, periodId]);

  // Refrescar cuando cambie refreshTrigger (después de crear novedad)
  useEffect(() => {
    if (refreshTrigger && employeeId && periodId) {
      console.log('🔄 RefreshTrigger activado, recargando novedades...');
      fetchNovedades();
    }
  }, [refreshTrigger]);

  const handleDelete = async (novedadId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
      try {
        await deleteNovedad(novedadId);
        setNovedades(prev => prev.filter(n => n.id !== novedadId));
        
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
    return novedades
      .filter(n => ['horas_extra', 'recargo_nocturno', 'bonificacion', 'otros_ingresos', 'vacaciones', 'incapacidad', 'licencia_remunerada'].includes(n.tipo_novedad))
      .reduce((sum, n) => sum + n.valor, 0);
  };

  const getTotalDeducciones = () => {
    return novedades
      .filter(n => ['descuento_voluntario', 'libranza', 'multa', 'embargo', 'retencion_fuente'].includes(n.tipo_novedad))
      .reduce((sum, n) => sum + n.valor, 0);
  };

  const getNovedadTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'horas_extra': 'Horas Extra',
      'recargo_nocturno': 'Recargo Nocturno',
      'bonificacion': 'Bonificación',
      'otros_ingresos': 'Otros Ingresos',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad',
      'licencia_remunerada': 'Licencia Remunerada',
      'descuento_voluntario': 'Descuento Voluntario',
      'libranza': 'Libranza',
      'multa': 'Multa',
      'embargo': 'Embargo',
      'retencion_fuente': 'Retención en la Fuente'
    };
    return labels[tipo] || tipo;
  };

  const getNovedadBadgeVariant = (tipo: string) => {
    const devengos = ['horas_extra', 'recargo_nocturno', 'bonificacion', 'otros_ingresos', 'vacaciones', 'incapacidad', 'licencia_remunerada'];
    return devengos.includes(tipo) ? 'default' : 'destructive';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando novedades...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Novedades de {employeeName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Período actual • {novedades.length} novedad{novedades.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Novedad
        </Button>
      </div>

      {novedades.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin novedades registradas
            </h3>
            <p className="text-gray-600 mb-4">
              Este empleado no tiene novedades para el período actual
            </p>
            <Button onClick={onAddNew} variant="outline">
              Agregar Primera Novedad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
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
                <p className="text-xs text-gray-600">Neto Novedades</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de novedades mejorada */}
          <div className="space-y-3">
            {novedades.map((novedad) => (
              <Card key={novedad.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Tipo de novedad y subtipo */}
                    <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                      <div className="space-y-2">
                        <Badge 
                          variant={getNovedadBadgeVariant(novedad.tipo_novedad)}
                          className="text-xs"
                        >
                          {getNovedadTypeLabel(novedad.tipo_novedad)}
                        </Badge>
                        {(novedad as any).subtipo && (
                          <div className="text-xs text-gray-600">
                            {(novedad as any).subtipo.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 2: Valor monetario */}
                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <div className="text-right sm:text-left">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(novedad.valor)}
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Detalles (horas/días) */}
                    <div className="col-span-6 sm:col-span-2 lg:col-span-2">
                      <div className="text-sm text-gray-600 space-y-1">
                        {novedad.horas && (
                          <div className="flex items-center">
                            <span className="font-medium">{novedad.horas}</span>
                            <span className="ml-1">hrs</span>
                          </div>
                        )}
                        {novedad.dias && (
                          <div className="flex items-center">
                            <span className="font-medium">{novedad.dias}</span>
                            <span className="ml-1">días</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 4: Observaciones */}
                    <div className="col-span-12 sm:col-span-8 lg:col-span-4">
                      {novedad.observacion && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-left">
                          <div className="line-clamp-2">
                            {novedad.observacion}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Columna 5: Acciones */}
                    <div className="col-span-12 sm:col-span-4 lg:col-span-1">
                      <div className="flex justify-end sm:justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(novedad.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
