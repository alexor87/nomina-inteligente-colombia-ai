
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Novedad {
  id: string;
  tipo_novedad: string;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  subtipo?: string;
}

interface NovedadesSimpleListProps {
  employeeId: string;
  periodId: string;
  onAddNovedad: () => void;
  refreshTrigger?: number;
}

export const NovedadesSimpleList: React.FC<NovedadesSimpleListProps> = ({
  employeeId,
  periodId,
  onAddNovedad,
  refreshTrigger = 0
}) => {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Cargar novedades
  const loadNovedades = async () => {
    if (!employeeId || !periodId) return;

    setIsLoading(true);
    try {
      console.log('📋 Cargando novedades:', { employeeId, periodId });

      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando novedades:', error);
        return;
      }

      console.log('✅ Novedades cargadas:', data?.length || 0);
      setNovedades(data || []);

    } catch (error) {
      console.error('Error en loadNovedades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar novedad
  const deleteNovedad = async (novedadId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) throw error;

      setNovedades(prev => prev.filter(n => n.id !== novedadId));
      
      toast({
        title: "Novedad eliminada",
        description: "La novedad se eliminó correctamente",
      });

    } catch (error) {
      console.error('Error eliminando novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive",
      });
    }
  };

  // Efectos
  useEffect(() => {
    loadNovedades();
  }, [employeeId, periodId, refreshTrigger]);

  // Formatear tipo de novedad para mostrar
  const formatTipoNovedad = (tipo: string, subtipo?: string) => {
    const tipos: Record<string, string> = {
      'horas_extra': 'Horas Extra',
      'recargo_nocturno': 'Recargo Nocturno',
      'bonificacion': 'Bonificación',
      'incapacidad': 'Incapacidad',
      'vacaciones': 'Vacaciones',
      'licencia_remunerada': 'Licencia',
      'otros_ingresos': 'Otros Ingresos',
      'descuento_voluntario': 'Descuento',
      'libranza': 'Libranza'
    };

    const base = tipos[tipo] || tipo;
    return subtipo ? `${base} (${subtipo})` : base;
  };

  // Formatear valor
  const formatValue = (novedad: Novedad) => {
    const parts = [];
    if (novedad.valor) parts.push(`$${novedad.valor.toLocaleString()}`);
    if (novedad.horas) parts.push(`${novedad.horas}h`);
    if (novedad.dias) parts.push(`${novedad.dias}d`);
    return parts.join(' - ');
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Cargando novedades...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Novedades ({novedades.length})</h4>
        <Button
          onClick={onAddNovedad}
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>

      {novedades.length === 0 ? (
        <p className="text-xs text-gray-500">Sin novedades</p>
      ) : (
        <div className="space-y-1">
          {novedades.map((novedad) => (
            <div
              key={novedad.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {formatTipoNovedad(novedad.tipo_novedad, novedad.subtipo)}
                  </Badge>
                  <span className="font-medium">{formatValue(novedad)}</span>
                </div>
                {novedad.observacion && (
                  <p className="text-gray-600 mt-1">{novedad.observacion}</p>
                )}
              </div>
              <Button
                onClick={() => deleteNovedad(novedad.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
