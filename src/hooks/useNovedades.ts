
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertVacationToDisplay, convertNovedadToDisplay } from '@/types/vacation-integration';
import { CreateNovedadData } from '@/types/novedades-enhanced';
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

  const createNovedad = useCallback(async (data: CreateNovedadData, showToast: boolean = true) => {
    try {
      setIsLoading(true);
      console.log('📝 Creando novedad:', data);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');

      const insertData = {
        company_id: profile.company_id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor) || 0,
        horas: data.horas ? Number(data.horas) : null,
        dias: data.dias || null,
        observacion: data.observacion || null,
        fecha_inicio: data.fecha_inicio || null,
        fecha_fin: data.fecha_fin || null,
        subtipo: data.subtipo || null,
        constitutivo_salario: data.constitutivo_salario || false,
        base_calculo: data.base_calculo ? JSON.stringify(data.base_calculo) : null,
        creado_por: user.id
      };

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (showToast) {
        toast({
          title: "✅ Novedad creada",
          description: "La novedad se ha creado exitosamente",
          className: "border-green-200 bg-green-50"
        });
      }

      console.log('✅ Novedad creada exitosamente:', novedad);
      return novedad;

    } catch (error) {
      console.error('❌ Error creando novedad:', error);
      
      if (showToast) {
        toast({
          title: "❌ Error",
          description: error instanceof Error ? error.message : "No se pudo crear la novedad",
          variant: "destructive"
        });
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
    createNovedad,
    deleteNovedad
  };
};
