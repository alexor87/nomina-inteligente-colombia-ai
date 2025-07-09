
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { supabase } from '@/integrations/supabase/client';

export const useNovedades = (periodoId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const { toast } = useToast();

  const createNovedad = useCallback(async (data: CreateNovedadData, showSuccessToast = true) => {
    setIsLoading(true);
    try {
      console.log('🚀 useNovedades - Creating novedad with data:', data);
      
      // ✅ CORRECCIÓN: Obtener company_id si no viene en los datos
      let createData: CreateNovedadData = { ...data };
      
      if (!createData.company_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.company_id) {
            createData.company_id = profile.company_id;
          }
        }
      }

      createData.periodo_id = periodoId; // Asegurar period ID correcto
      
      console.log('📤 useNovedades - Final create data:', createData);
      
      // ✅ CORRECCIÓN: El servicio ahora devuelve PayrollNovedad directamente
      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        console.log('✅ useNovedades - Novedad created successfully:', result);
        
        // ✅ CONVERSIÓN: Convertir el resultado del servicio al tipo local
        const localResult: PayrollNovedad = {
          id: result.id,
          company_id: result.company_id,
          empleado_id: result.empleado_id,
          periodo_id: result.periodo_id,
          tipo_novedad: result.tipo_novedad as PayrollNovedad['tipo_novedad'],
          valor: result.valor,
          horas: result.horas,
          dias: result.dias,
          observacion: result.observacion,
          fecha_inicio: result.fecha_inicio,
          fecha_fin: result.fecha_fin,
          base_calculo: result.base_calculo,
          created_at: result.created_at,
          updated_at: result.updated_at
        };
        
        // Update local state
        setNovedades(prev => [localResult, ...prev]);
        
        if (showSuccessToast) {
          toast({
            title: "✅ Novedad creada exitosamente",
            description: `Se ha agregado la novedad de ${result.tipo_novedad} por ${new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
            }).format(result.valor)}`,
            className: "border-green-200 bg-green-50"
          });
        }
        
        return localResult;
      }
    } catch (error) {
      console.error('❌ useNovedades - Error creating novedad:', error);
      
      let errorMessage = 'No se pudo crear la novedad';
      
      if (error instanceof Error) {
        if (error.message.includes('period is no longer valid')) {
          errorMessage = 'El período seleccionado ya no es válido. Recarga la página e intenta nuevamente.';
        } else if (error.message.includes('already exists')) {
          errorMessage = 'Ya existe una novedad similar para este empleado en este período.';
        } else if (error.message.includes('No active period found')) {
          errorMessage = 'No hay un período activo. Crea un período de nómina primero.';
        } else if (error.message.includes('Invalid employee')) {
          errorMessage = 'Empleado no válido. Verifica los datos.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "❌ Error al crear novedad",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [periodoId, toast]);

  const loadNovedades = useCallback(async (employeeId?: string) => {
    if (!employeeId || !periodoId) return [];
    
    try {
      console.log('📋 Loading novedades for employee:', employeeId, 'period:', periodoId);
      const result = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodoId);
      console.log('📊 Loaded novedades:', result);
      
      // ✅ CONVERSIÓN: Convertir los resultados del servicio al tipo local
      const localResults: PayrollNovedad[] = result.map(nov => ({
        id: nov.id,
        company_id: nov.company_id,
        empleado_id: nov.empleado_id,
        periodo_id: nov.periodo_id,
        tipo_novedad: nov.tipo_novedad as PayrollNovedad['tipo_novedad'],
        valor: nov.valor,
        horas: nov.horas,
        dias: nov.dias,
        observacion: nov.observacion,
        fecha_inicio: nov.fecha_inicio,
        fecha_fin: nov.fecha_fin,
        base_calculo: nov.base_calculo,
        created_at: nov.created_at,
        updated_at: nov.updated_at
      }));
      
      setNovedades(localResults);
      return localResults;
    } catch (error) {
      console.error('❌ Error loading novedades:', error);
      return [];
    }
  }, [periodoId]);

  const updateNovedad = useCallback(async (id: string, updates: Partial<CreateNovedadData>) => {
    setIsLoading(true);
    try {
      console.log('📝 Updating novedad:', id, 'with updates:', updates);
      const result = await NovedadesEnhancedService.updateNovedad(id, updates);
      
      if (result) {
        // ✅ CONVERSIÓN: Convertir el resultado del servicio al tipo local
        const localResult: PayrollNovedad = {
          id: result.id,
          company_id: result.company_id,
          empleado_id: result.empleado_id,
          periodo_id: result.periodo_id,
          tipo_novedad: result.tipo_novedad as PayrollNovedad['tipo_novedad'],
          valor: result.valor,
          horas: result.horas,
          dias: result.dias,
          observacion: result.observacion,
          fecha_inicio: result.fecha_inicio,
          fecha_fin: result.fecha_fin,
          base_calculo: result.base_calculo,
          created_at: result.created_at,
          updated_at: result.updated_at
        };
        
        // Update local state
        setNovedades(prev => prev.map(nov => nov.id === id ? localResult : nov));
        
        toast({
          title: "✅ Novedad actualizada",
          description: "La novedad se ha actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });
        
        return localResult;
      }
    } catch (error) {
      console.error('❌ Error updating novedad:', error);
      toast({
        title: "❌ Error al actualizar novedad",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteNovedad = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      console.log('🗑️ Deleting novedad:', id);
      await NovedadesEnhancedService.deleteNovedad(id);
      
      // Update local state
      setNovedades(prev => prev.filter(nov => nov.id !== id));
      
      toast({
        title: "✅ Novedad eliminada",
        description: "La novedad se ha eliminado correctamente",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('❌ Error deleting novedad:', error);
      toast({
        title: "❌ Error al eliminar novedad",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    novedades,
    isLoading,
    createNovedad,
    loadNovedades,
    updateNovedad,
    deleteNovedad
  };
};
