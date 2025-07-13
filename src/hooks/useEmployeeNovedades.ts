
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define a proper interface for database response
interface NovedadFromDB {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: string;
  valor: number;
  dias?: number;
  horas?: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
  adjunto_url?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  creado_por?: string;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    nombre: string;
    apellido: string;
  };
}

// Define our clean novedad interface
interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: string;
  valor: number;
  dias?: number;
  horas?: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
  adjunto_url?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  creado_por?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    nombre: string;
    apellido: string;
  };
}

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

      // Agrupar novedades por empleado con transformación de tipos
      const novedadesByEmployee: Record<string, PayrollNovedad[]> = {};
      
      data?.forEach((dbNovedad: NovedadFromDB) => {
        const employeeId = dbNovedad.empleado_id;
        if (!novedadesByEmployee[employeeId]) {
          novedadesByEmployee[employeeId] = [];
        }
        
        // Transform the database novedad to our clean interface
        const cleanNovedad: PayrollNovedad = {
          id: dbNovedad.id,
          company_id: dbNovedad.company_id,
          empleado_id: dbNovedad.empleado_id,
          periodo_id: dbNovedad.periodo_id,
          tipo_novedad: dbNovedad.tipo_novedad,
          valor: dbNovedad.valor,
          dias: dbNovedad.dias,
          horas: dbNovedad.horas,
          observacion: dbNovedad.observacion,
          constitutivo_salario: dbNovedad.constitutivo_salario,
          base_calculo: dbNovedad.base_calculo,
          subtipo: dbNovedad.subtipo,
          adjunto_url: dbNovedad.adjunto_url,
          fecha_inicio: dbNovedad.fecha_inicio,
          fecha_fin: dbNovedad.fecha_fin,
          creado_por: dbNovedad.creado_por,
          created_at: dbNovedad.created_at,
          updated_at: dbNovedad.updated_at,
          employee: dbNovedad.employees
        };
        
        novedadesByEmployee[employeeId].push(cleanNovedad);
      });

      setNovedades(novedadesByEmployee);

      // Log de depuración para Alex Ortiz específicamente
      Object.entries(novedadesByEmployee).forEach(([employeeId, empleadoNovedades]) => {
        const employee = empleadoNovedades[0]?.employee;
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
