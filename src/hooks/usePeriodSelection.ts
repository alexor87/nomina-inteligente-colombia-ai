
import { useState, useCallback } from 'react';
import { PeriodGenerationService, AvailablePeriod } from '@/services/payroll/PeriodGenerationService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodSelection = (companyId: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AvailablePeriod | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePeriodSelect = useCallback((period: AvailablePeriod) => {
    console.log('🎯 Hook: Período seleccionado:', period.etiqueta_visible);
    setSelectedPeriod(period);
    setIsManualMode(false);
  }, []);

  const handleManualEntry = useCallback(() => {
    console.log('🖊️ Hook: Activando modo manual');
    setSelectedPeriod(null);
    setIsManualMode(true);
  }, []);

  const resetSelection = useCallback(() => {
    console.log('🔄 Hook: Reseteando selección');
    setSelectedPeriod(null);
    setIsManualMode(false);
  }, []);

  const getNextAvailablePeriod = useCallback(async () => {
    if (!companyId) {
      console.warn('⚠️ Hook: No company ID provided');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Hook: Obteniendo siguiente período disponible...');
      const nextPeriod = await PeriodGenerationService.getNextAvailablePeriod(companyId);
      
      if (nextPeriod) {
        console.log(`✅ Hook: Siguiente período encontrado: ${nextPeriod.etiqueta_visible}`);
      } else {
        console.warn('⚠️ Hook: No hay períodos disponibles');
        toast({
          title: "Sin períodos disponibles",
          description: "No se encontraron períodos disponibles para liquidar",
          variant: "destructive"
        });
      }
      
      return nextPeriod;
    } catch (error) {
      console.error('❌ Hook: Error obteniendo siguiente período:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener el siguiente período disponible",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  const markCurrentPeriodAsLiquidated = useCallback(async () => {
    if (!selectedPeriod?.id) {
      console.warn('⚠️ Hook: No hay período seleccionado para liquidar');
      return false;
    }
    
    try {
      console.log(`🔒 Hook: Liquidando período: ${selectedPeriod.etiqueta_visible}`);
      const success = await PeriodGenerationService.markPeriodAsLiquidated(selectedPeriod.id);
      
      if (success) {
        toast({
          title: "Período liquidado",
          description: `${selectedPeriod.etiqueta_visible} ha sido marcado como liquidado`,
        });
        resetSelection();
        console.log('✅ Hook: Período liquidado exitosamente');
      } else {
        toast({
          title: "Error",
          description: "No se pudo marcar el período como liquidado",
          variant: "destructive"
        });
        console.error('❌ Hook: Falló la liquidación del período');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Hook: Error marcando período como liquidado:', error);
      toast({
        title: "Error",
        description: "Error interno al liquidar el período",
        variant: "destructive"
      });
      return false;
    }
  }, [selectedPeriod, toast, resetSelection]);

  return {
    selectedPeriod,
    isManualMode,
    isLoading,
    handlePeriodSelect,
    handleManualEntry,
    resetSelection,
    getNextAvailablePeriod,
    markCurrentPeriodAsLiquidated
  };
};
