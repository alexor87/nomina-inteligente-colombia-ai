import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollUnifiedService } from '@/services/PayrollUnifiedService';
import { PeriodStatus } from '@/types/payroll';

export const usePayrollLiquidationNew = () => {
  const [currentPeriod, setCurrentPeriod] = useState<PeriodStatus['currentPeriod']>(null);
  const [periodSituation, setPeriodSituation] = useState<PeriodStatus>({
    currentPeriod: null,
    needsCreation: true,
    canContinue: false,
    message: 'Detectando período...',
    suggestion: 'Crear nuevo período',
    action: 'create'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const detectPeriodSituation = useCallback(async () => {
    setIsLoading(true);
    try {
      const situation = await PayrollUnifiedService.detectCurrentPeriodSituation();
      setPeriodSituation(situation);
      setCurrentPeriod(situation.currentPeriod);
      
      toast({
        title: "Estado del período detectado",
        description: situation.message,
        duration: 3000
      });
    } catch (error) {
      console.error('Error detecting period situation:', error);
      toast({
        title: "Error",
        description: "No se pudo detectar el estado del período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createPeriod = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await PayrollUnifiedService.createNextPeriod();
      
      if (result.success) {
        setCurrentPeriod(result.period);
        setPeriodSituation({
          ...periodSituation,
          needsCreation: false,
          canContinue: true,
          currentPeriod: result.period,
          message: result.message
        });
        
        toast({
          title: "✅ Período creado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error creating period:', error);
      toast({
        title: "❌ Error creando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodSituation, toast]);

  const closePeriod = useCallback(async () => {
    if (!currentPeriod?.id) {
      toast({
        title: "Error",
        description: "No hay período activo para cerrar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // ✅ CORRECCIÓN: closePeriod solo recibe periodId
      const result = await PayrollUnifiedService.closePeriod(currentPeriod.id);
      
      if (result.success) {
        // Update current period status
        setCurrentPeriod(prev => prev ? {...prev, estado: 'cerrado'} : null);
        
        toast({
          title: "✅ Período cerrado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Optional: redirect or refresh data
        await detectPeriodSituation();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error closing period:', error);
      toast({
        title: "❌ Error cerrando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod?.id, toast]);

  return {
    currentPeriod,
    periodSituation,
    isLoading,
    detectPeriodSituation,
    createPeriod,
    closePeriod
  };
};
