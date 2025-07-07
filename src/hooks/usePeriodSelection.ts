
import { useState, useCallback } from 'react';
import { PeriodGenerationService, AvailablePeriod } from '@/services/payroll/PeriodGenerationService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodSelection = (companyId: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AvailablePeriod | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePeriodSelect = useCallback((period: AvailablePeriod) => {
    setSelectedPeriod(period);
    setIsManualMode(false);
    console.log('📋 Período seleccionado:', period.etiqueta_visible);
  }, []);

  const handleManualEntry = useCallback(() => {
    setSelectedPeriod(null);
    setIsManualMode(true);
    console.log('🖊️ Modo manual activado');
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedPeriod(null);
    setIsManualMode(false);
  }, []);

  const getNextAvailablePeriod = useCallback(async () => {
    if (!companyId) return null;
    
    setIsLoading(true);
    try {
      const nextPeriod = await PeriodGenerationService.getNextAvailablePeriod(companyId);
      return nextPeriod;
    } catch (error) {
      console.error('Error obteniendo siguiente período:', error);
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
    if (!selectedPeriod?.id) return false;
    
    try {
      const success = await PeriodGenerationService.markPeriodAsLiquidated(selectedPeriod.id);
      
      if (success) {
        toast({
          title: "Período liquidado",
          description: `${selectedPeriod.etiqueta_visible} ha sido marcado como liquidado`,
        });
        resetSelection();
      } else {
        toast({
          title: "Error",
          description: "No se pudo marcar el período como liquidado",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error marcando período como liquidado:', error);
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
