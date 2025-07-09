
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface CreateNovedadData {
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: Database["public"]["Enums"]["novedad_type"];
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  horas?: number;
  valor: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
}

export const useNovedadCRUD = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createNovedad = async (data: CreateNovedadData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: data.company_id,
          empleado_id: data.empleado_id,
          periodo_id: data.periodo_id,
          tipo_novedad: data.tipo_novedad,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          dias: data.dias,
          horas: data.horas,
          valor: data.valor,
          observacion: data.observacion,
          constitutivo_salario: data.constitutivo_salario,
          base_calculo: data.base_calculo,
          subtipo: data.subtipo
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating novedad:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error creating novedad:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateNovedad = async (id: string, data: Partial<Omit<CreateNovedadData, 'company_id' | 'empleado_id' | 'periodo_id'>>) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('payroll_novedades')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating novedad:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error updating novedad:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNovedad = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting novedad:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting novedad:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createNovedad,
    updateNovedad,
    deleteNovedad,
    isLoading
  };
};
