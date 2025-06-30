
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';

export const useNovedades = (periodoId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const { toast } = useToast();

  const createNovedad = useCallback(async (data: CreateNovedadData, showSuccessToast = true) => {
    setIsLoading(true);
    try {
      console.log('🚀 useNovedades - Creating novedad with data:', data);
      console.log('📅 useNovedades - Using period ID:', periodoId);
      
      // Ensure we're using the correct period ID
      const createData: CreateNovedadData = {
        ...data,
        periodo_id: periodoId // Use the period ID from the hook
      };
      
      console.log('📤 useNovedades - Final create data:', createData);
      
      const result = await NovedadesEnhancedService.createNovedad(createData);
      
      if (result) {
        console.log('✅ useNovedades - Novedad created successfully:', result);
        
        // Update local state
        setNovedades(prev => [result, ...prev]);
        
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
        
        return result;
      }
    } catch (error) {
      console.error('❌ useNovedades - Error creating novedad:', error);
      
      // Provide user-friendly error messages
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

  const loadNovedades = useCallback(async (employeeId: string) => {
    setIsLoading(true);
    try {
      console.log('📋 Loading novedades for employee:', employeeId, 'period:', periodoId);
      const result = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodoId);
      console.log('📊 Loaded novedades:', result);
      setNovedades(result);
      return result;
    } catch (error) {
      console.error('❌ Error loading novedades:', error);
      toast({
        title: "❌ Error al cargar novedades",
        description: "No se pudieron cargar las novedades del empleado",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [periodoId, toast]);

  const updateNovedad = useCallback(async (id: string, updates: Partial<CreateNovedadData>) => {
    setIsLoading(true);
    try {
      console.log('📝 Updating novedad:', id, 'with updates:', updates);
      const result = await NovedadesEnhancedService.updateNovedad(id, updates);
      
      if (result) {
        // Update local state
        setNovedades(prev => prev.map(nov => nov.id === id ? result : nov));
        
        toast({
          title: "✅ Novedad actualizada",
          description: "La novedad se ha actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });
        
        return result;
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
