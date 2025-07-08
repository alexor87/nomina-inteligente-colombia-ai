
import { useState, useCallback } from 'react';
import { SimplePeriodService, SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useToast } from '@/hooks/use-toast';

export const useSimplePeriodSelection = (companyId: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<SelectablePeriod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePeriodSelect = useCallback((period: SelectablePeriod) => {
    console.log('🎯 Período seleccionado:', period.label);
    setSelectedPeriod(period);
  }, []);

  const resetSelection = useCallback(() => {
    console.log('🔄 Reseteando selección de período');
    setSelectedPeriod(null);
  }, []);

  const markCurrentPeriodAsLiquidated = useCallback(async () => {
    if (!selectedPeriod?.id) {
      console.warn('⚠️ No hay período seleccionado para liquidar');
      return false;
    }
    
    try {
      console.log(`🔒 Liquidando período: ${selectedPeriod.label}`);
      const success = await SimplePeriodService.markAsLiquidated(selectedPeriod.id);
      
      if (success) {
        toast({
          title: "Período liquidado",
          description: `${selectedPeriod.label} ha sido marcado como liquidado`,
        });
        resetSelection();
        console.log('✅ Período liquidado exitosamente');
      } else {
        toast({
          title: "Error",
          description: "No se pudo marcar el período como liquidado",
          variant: "destructive"
        });
        console.error('❌ Falló la liquidación del período');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error marcando período como liquidado:', error);
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
    isLoading,
    handlePeriodSelect,
    resetSelection,
    markCurrentPeriodAsLiquidated
  };
};
