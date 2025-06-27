
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TipoCotizante {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface SubtipoCotizante {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_cotizante_id: string;
  activo: boolean;
}

export const useTiposCotizante = () => {
  const [tiposCotizante, setTiposCotizante] = useState<TipoCotizante[]>([]);
  const [subtiposCotizante, setSubtiposCotizante] = useState<SubtipoCotizante[]>([]);
  const [isLoadingTipos, setIsLoadingTipos] = useState(true);
  const [isLoadingSubtipos, setIsLoadingSubtipos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar tipos de cotizante
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        setIsLoadingTipos(true);
        const { data, error } = await supabase
          .from('tipos_cotizante')
          .select('*')
          .eq('activo', true)
          .order('codigo');

        if (error) throw error;
        setTiposCotizante(data || []);
      } catch (err: any) {
        console.error('Error fetching tipos de cotizante:', err);
        setError('No se pudieron cargar los tipos de cotizante');
      } finally {
        setIsLoadingTipos(false);
      }
    };

    fetchTipos();
  }, []);

  // Función para cargar subtipos por tipo - usando useCallback para estabilizar la referencia
  const fetchSubtipos = useCallback(async (tipoCotizanteId: string) => {
    try {
      setIsLoadingSubtipos(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('subtipos_cotizante')
        .select('*')
        .eq('tipo_cotizante_id', tipoCotizanteId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;
      setSubtiposCotizante(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching subtipos de cotizante:', err);
      setError('No se pudieron cargar los subtipos de cotizante');
      return [];
    } finally {
      setIsLoadingSubtipos(false);
    }
  }, []);

  // Función para limpiar subtipos
  const clearSubtipos = useCallback(() => {
    setSubtiposCotizante([]);
  }, []);

  return {
    tiposCotizante,
    subtiposCotizante,
    isLoadingTipos,
    isLoadingSubtipos,
    error,
    fetchSubtipos,
    clearSubtipos
  };
};
