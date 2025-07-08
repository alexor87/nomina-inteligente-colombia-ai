
import { useState, useEffect } from 'react';
import { SimplePeriodService, SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useToast } from '@/hooks/use-toast';

export const useSimplePeriodSelection = (companyId: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<SelectablePeriod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Clave para persistir la selección en localStorage
  const STORAGE_KEY = `selected_period_${companyId}`;

  // Cargar período guardado al inicializar
  useEffect(() => {
    if (companyId) {
      const savedPeriod = localStorage.getItem(STORAGE_KEY);
      if (savedPeriod) {
        try {
          const parsed = JSON.parse(savedPeriod);
          setSelectedPeriod(parsed);
          console.log('📋 Período recuperado del almacenamiento:', parsed.label);
        } catch (error) {
          console.warn('Error recuperando período guardado:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, [companyId]);

  const handlePeriodSelect = async (period: SelectablePeriod) => {
    setIsLoading(true);
    
    try {
      const result = await SimplePeriodService.selectPeriod(companyId, period);
      
      if (result) {
        setSelectedPeriod(result);
        
        // Guardar en localStorage para persistencia
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        
        toast({
          title: "Período seleccionado",
          description: `${result.label} está listo para trabajar`,
          className: "border-green-200 bg-green-50"
        });
        
        console.log('✅ Período seleccionado y guardado:', result.label);
      } else {
        toast({
          title: "Error",
          description: "No se pudo seleccionar el período",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error seleccionando período:', error);
      toast({
        title: "Error",
        description: "Error al seleccionar período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedPeriod(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🔄 Selección de período reiniciada');
  };

  const markCurrentPeriodAsLiquidated = async () => {
    if (!selectedPeriod?.id) return false;
    
    try {
      const success = await SimplePeriodService.markAsLiquidated(selectedPeriod.id);
      
      if (success) {
        // Actualizar estado local
        setSelectedPeriod(prev => prev ? { ...prev, canSelect: false } : null);
        
        // Actualizar localStorage
        const updatedPeriod = { ...selectedPeriod, canSelect: false };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPeriod));
        
        toast({
          title: "Período cerrado",
          description: `${selectedPeriod.label} ha sido marcado como liquidado`,
          className: "border-green-200 bg-green-50"
        });
        
        console.log('✅ Período marcado como liquidado:', selectedPeriod.label);
      }
      
      return success;
    } catch (error) {
      console.error('Error marcando período como liquidado:', error);
      return false;
    }
  };

  return {
    selectedPeriod,
    isLoading,
    handlePeriodSelect,
    resetSelection,
    markCurrentPeriodAsLiquidated
  };
};
