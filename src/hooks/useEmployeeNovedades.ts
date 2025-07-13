
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades';

export const useEmployeeNovedades = (periodId: string) => {
  const [novedades, setNovedades] = useState<Record<string, PayrollNovedad[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNovedades = useCallback(async () => {
    if (!periodId) {
      setNovedades({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Cargando novedades para período:', periodId);

      const { data, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select(`
          *,
          employees!payroll_novedades_empleado_id_fkey(
            id,
            nombre,
            apellido
          )
        `)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        throw new Error(`Error cargando novedades: ${novedadesError.message}`);
      }

      console.log('📋 Novedades cargadas:', data?.length || 0);

      // Agrupar novedades por empleado
      const novedadesByEmployee: Record<string, PayrollNovedad[]> = {};
      
      data?.forEach(novedad => {
        const employeeId = novedad.empleado_id;
        if (!novedadesByEmployee[employeeId]) {
          novedadesByEmployee[employeeId] = [];
        }
        novedadesByEmployee[employeeId].push(novedad as PayrollNovedad);
      });

      setNovedades(novedadesByEmployee);

      // Log de depuración para Alex Ortiz específicamente
      Object.entries(novedadesByEmployee).forEach(([employeeId, empleadoNovedades]) => {
        const employee = empleadoNovedades[0]?.employees;
        if (employee && `${employee.nombre} ${employee.apellido}`.includes('Alex')) {
          console.log(`🏖️ Novedades para ${employee.nombre} ${employee.apellido}:`, empleadoNovedades);
        }
      });

    } catch (err) {
      console.error('❌ Error cargando novedades:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setNovedades({});
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

  const refreshNovedades = useCallback(async () => {
    await loadNovedades();
  }, [loadNovedades]);

  const getEmployeeNovedadesCount = useCallback((employeeId: string): number => {
    return novedades[employeeId]?.length || 0;
  }, [novedades]);

  const getEmployeeNovedadesTotal = useCallback((employeeId: string): { devengos: number; deducciones: number } => {
    const employeeNovedades = novedades[employeeId] || [];
    
    const devengos = employeeNovedades
      .filter(n => n.valor > 0)
      .reduce((sum, n) => sum + (n.valor || 0), 0);
    
    const deducciones = employeeNovedades
      .filter(n => n.valor < 0)
      .reduce((sum, n) => sum + Math.abs(n.valor || 0), 0);

    return { devengos, deducciones };
  }, [novedades]);

  // Cargar novedades cuando cambie el periodId
  useEffect(() => {
    loadNovedades();
  }, [loadNovedades]);

  return {
    novedades,
    isLoading,
    error,
    refreshNovedades,
    getEmployeeNovedadesCount,
    getEmployeeNovedadesTotal
  };
};
