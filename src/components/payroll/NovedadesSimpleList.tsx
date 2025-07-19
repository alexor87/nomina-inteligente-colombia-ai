
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVacationIntegration } from '@/hooks/useVacationIntegration';

interface Novedad {
  id: string;
  tipo_novedad: string;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  subtipo?: string;
}

interface PendingVacation {
  id: string;
  type: string;
  subtipo?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  observations?: string;
  status: string;
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
  const [pendingVacations, setPendingVacations] = useState<PendingVacation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { processEmployeePendingVacations, isProcessing } = useVacationIntegration();

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

  // ✅ NUEVA: Cargar licencias pendientes
  const loadPendingVacations = async () => {
    if (!employeeId || !periodId) return;

    try {
      // Obtener información del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) return;

      // Buscar licencias pendientes que caen en el período
      const { data: vacationsData, error } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', period.company_id)
        .eq('status', 'pendiente')
        .gte('start_date', period.fecha_inicio)
        .lte('end_date', period.fecha_fin);

      if (error) {
        console.error('Error cargando licencias pendientes:', error);
        return;
      }

      console.log('📅 Licencias pendientes cargadas:', vacationsData?.length || 0);
      setPendingVacations(vacationsData || []);

    } catch (error) {
      console.error('Error en loadPendingVacations:', error);
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

  // ✅ NUEVA: Procesar licencia pendiente específica
  const processVacation = async (vacationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;

      await processEmployeePendingVacations(employeeId, periodId, profile.company_id);
      
      // Recargar datos después del procesamiento
      await loadNovedades();
      await loadPendingVacations();

    } catch (error) {
      console.error('Error procesando licencia:', error);
    }
  };

  // Efectos
  useEffect(() => {
    loadNovedades();
    loadPendingVacations();
  }, [employeeId, periodId, refreshTrigger]);

  // Formatear tipo de novedad para mostrar
  const formatTipoNovedad = (tipo: string, subtipo?: string) => {
    // ✅ MANEJO ESPECÍFICO PARA RECARGOS NOCTURNOS
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

    // ✅ MANTENER FORMATO EXISTENTE PARA OTROS TIPOS
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

  // ✅ NUEVA: Formatear tipo de licencia
  const formatVacationType = (type: string, subtipo?: string) => {
    const tipos: Record<string, string> = {
      'vacaciones': 'Vacaciones',
      'licencia_remunerada': 'Licencia Remunerada',
      'licencia_no_remunerada': 'Licencia No Remunerada',
      'incapacidad': 'Incapacidad',
      'ausencia': 'Ausencia'
    };

    const base = tipos[type] || type;
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

  const totalItems = novedades.length + pendingVacations.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Novedades ({novedades.length}) 
          {pendingVacations.length > 0 && (
            <span className="text-orange-600 ml-1">
              + {pendingVacations.length} pendiente(s)
            </span>
          )}
        </h4>
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

      {totalItems === 0 ? (
        <p className="text-xs text-gray-500">Sin novedades</p>
      ) : (
        <div className="space-y-1">
          {/* ✅ NUEVA: Mostrar licencias pendientes */}
          {pendingVacations.map((vacation) => (
            <div
              key={`vacation-${vacation.id}`}
              className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded text-xs"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                    {formatVacationType(vacation.type, vacation.subtipo)}
                  </Badge>
                  <span className="font-medium text-orange-900">
                    {vacation.days_count} días pendientes
                  </span>
                </div>
                <div className="text-gray-600 mt-1 text-xs">
                  {vacation.start_date} al {vacation.end_date}
                </div>
                {vacation.observations && (
                  <p className="text-gray-600 mt-1 text-xs">{vacation.observations}</p>
                )}
              </div>
              <Button
                onClick={() => processVacation(vacation.id)}
                disabled={isProcessing}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                title="Procesar licencia"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Mostrar novedades existentes */}
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
