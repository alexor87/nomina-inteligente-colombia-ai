
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useNovedades } from '@/hooks/useNovedades';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { useToast } from '@/components/ui/use-toast';

interface NovedadExistingListProps {
  employeeId: string;
  periodId: string;
  employeeName: string;
  onAddNew: () => void;
  onClose: () => void;
}

export const NovedadExistingList: React.FC<NovedadExistingListProps> = ({
  employeeId,
  periodId,
  employeeName,
  onAddNew,
  onClose
}) => {
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadNovedades, deleteNovedad } = useNovedades(periodId);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNovedades = async () => {
      try {
        setLoading(true);
        const result = await loadNovedades(employeeId);
        setNovedades(result);
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

    if (employeeId && periodId) {
      fetchNovedades();
    }
  }, [employeeId, periodId, loadNovedades, toast]);

  const handleDelete = async (novedadId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta novedad?')) {
      try {
        await deleteNovedad(novedadId);
        setNovedades(prev => prev.filter(n => n.id !== novedadId));
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

          {/* Lista de novedades */}
          <div className="space-y-3">
            {novedades.map((novedad) => (
              <Card key={novedad.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={getNovedadBadgeVariant(novedad.tipo_novedad)}>
                          {getNovedadTypeLabel(novedad.tipo_novedad)}
                        </Badge>
                        {novedad.subtipo && (
                          <span className="text-sm text-gray-600">
                            ({novedad.subtipo.replace('_', ' ')})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(novedad.valor)}
                        </span>
                        {novedad.horas && (
                          <span>{novedad.horas} horas</span>
                        )}
                        {novedad.dias && (
                          <span>{novedad.dias} días</span>
                        )}
                      </div>
                      
                      {novedad.observacion && (
                        <p className="text-sm text-gray-600 mt-2">
                          {novedad.observacion}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(novedad.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
