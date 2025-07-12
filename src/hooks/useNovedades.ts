
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertVacationToDisplay, convertNovedadToDisplay } from '@/types/vacation-integration';
import { useToast } from '@/hooks/use-toast';

export const useNovedades = (periodId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadIntegratedNovedades = useCallback(async (employeeId: string): Promise<DisplayNovedad[]> => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando novedades integradas para empleado:', employeeId);

      // 1. Cargar novedades del período
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) throw novedadesError;

      // 2. Cargar ausencias/vacaciones que intersectan con el período
      const { data: periodData } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin')
        .eq('id', periodId)
        .single();

      if (!periodData) {
        console.warn('No se encontró información del período');
        return (novedades || []).map(convertNovedadToDisplay);
      }

      const { data: vacations, error: vacationsError } = await supabase
        .from('employee_vacation_periods')
        .select(`
          *,
          employees!inner(salario_base)
        `)
        .eq('employee_id', employeeId)
        .or(`start_date.lte.${periodData.fecha_fin},end_date.gte.${periodData.fecha_inicio}`);

      if (vacationsError) throw vacationsError;

      // 3. Obtener salario del empleado para cálculos
      const { data: employee } = await supabase
        .from('employees')
        .select('salario_base')
        .eq('id', employeeId)
        .single();

      const employeeSalary = Number(employee?.salario_base || 0);

      // 4. Convertir y combinar datos
      const novedadesDisplay = (novedades || []).map(convertNovedadToDisplay);
      const vacationsDisplay = (vacations || []).map(v => 
        convertVacationToDisplay(v, employeeSalary)
      );

      const combined = [...novedadesDisplay, ...vacationsDisplay];
      
      // 5. Ordenar por fecha de creación más reciente
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('✅ Datos integrados cargados:', {
        novedades: novedadesDisplay.length,
        vacaciones: vacationsDisplay.length,
        total: combined.length
      });

      return combined;

    } catch (error) {
      console.error('❌ Error cargando novedades integradas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades integradas",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [periodId, toast]);

  const deleteNovedad = useCallback(async (novedadId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) throw error;

      console.log('✅ Novedad eliminada:', novedadId);
    } catch (error) {
      console.error('❌ Error eliminando novedad:', error);
      throw error;
    }
  }, []);

  return {
    isLoading,
    loadIntegratedNovedades,
    deleteNovedad
  };
};
