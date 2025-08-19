
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsService } from '@/services/SocialBenefitsService';
import type { BenefitType, BenefitCalculationResponse } from '@/types/social-benefits';

export const useSocialBenefits = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewResult, setPreviewResult] = useState<BenefitCalculationResponse | null>(null);
  const { toast } = useToast();

  const calculatePreview = useCallback(async (
    employeeId: string,
    benefitType: BenefitType,
    periodStart: string,
    periodEnd: string,
    periodId?: string
  ) => {
    console.log('🔍 Calculating preview for:', { employeeId, benefitType, periodStart, periodEnd, periodId });
    
    setIsCalculating(true);
    try {
      const result = await SocialBenefitsService.calculatePreview({
        employeeId,
        benefitType,
        periodStart,
        periodEnd,
        periodId
      });

      console.log('📊 Preview result:', result);
      setPreviewResult(result);

      if (!result.success) {
        let description = 'error' in result ? result.error : "No se pudo calcular la prestación";
        
        // 🔧 NEW: Enhanced error messages for missing cesantías
        if (result.error === 'MISSING_CESANTIAS_PERIOD') {
          description = result.message || 'Falta la cesantía del período. Primero calcúlala/guárdala.';
        } else if (result.error === 'UNSUPPORTED_PERIODICITY') {
          description = result.details || 'Periodicidad no soportada para cálculo de intereses';
        }
        
        toast({
          title: "Error en el cálculo",
          description,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error calculating preview:', error);
      toast({
        title: "Error inesperado",
        description: "No se pudo realizar el cálculo",
        variant: "destructive"
      });
      return { success: false, error: 'calculation_error' };
    } finally {
      setIsCalculating(false);
    }
  }, [toast]);

  const calculateAndSave = useCallback(async (
    employeeId: string,
    benefitType: BenefitType,
    periodStart: string,
    periodEnd: string,
    notes?: string,
    periodId?: string
  ) => {
    console.log('💾 Calculating and saving:', { employeeId, benefitType, periodStart, periodEnd, notes, periodId });
    
    setIsCalculating(true);
    try {
      const result = await SocialBenefitsService.calculateAndSave({
        employeeId,
        benefitType,
        periodStart,
        periodEnd,
        notes,
        periodId
      });

      console.log('✅ Save result:', result);

      if (result.success) {
        toast({
          title: "Prestación calculada y guardada",
          description: `Se ha registrado el cálculo de ${benefitType} correctamente`,
          className: "border-green-200 bg-green-50"
        });
        setPreviewResult(null); // Limpiar preview después de guardar
      } else {
        let description = 'error' in result ? result.error : "No se pudo guardar el cálculo";
        
        // 🔧 NEW: Enhanced error messages for missing cesantías
        if (result.error === 'MISSING_CESANTIAS_PERIOD') {
          description = result.message || 'Falta la cesantía del período. Primero calcúlala/guárdala.';
        }
        
        toast({
          title: "Error al guardar",
          description,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error saving calculation:', error);
      toast({
        title: "Error inesperado",
        description: "No se pudo guardar el cálculo",
        variant: "destructive"
      });
      return { success: false, error: 'save_error' };
    } finally {
      setIsCalculating(false);
    }
  }, [toast]);

  const clearPreview = useCallback(() => {
    setPreviewResult(null);
  }, []);

  return {
    isCalculating,
    previewResult,
    calculatePreview,
    calculateAndSave,
    clearPreview
  };
};
