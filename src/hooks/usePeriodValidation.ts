
import { useState } from 'react';
import { DataMigrationService } from '@/services/payroll-intelligent/DataMigrationService';
import { PayrollPeriodCalculationService } from '@/services/payroll-intelligent/PayrollPeriodCalculationService';
import { PeriodNameUnifiedService } from '@/services/payroll-intelligent/PeriodNameUnifiedService';
import { PeriodNameCorrectionService } from '@/services/payroll-intelligent/PeriodNameCorrectionService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const executeIntegralCorrection = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🚀 EJECUTANDO CORRECCIÓN INTEGRAL PROFESIONAL...');
      
      const result = await DataMigrationService.executeIntegralCorrection(companyId);
      
      // Normalizar nombres de períodos después de la corrección
      console.log('🏷️ NORMALIZANDO NOMBRES DE PERÍODOS...');
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
      
      toast({
        title: result.success ? "✅ Corrección Integral Exitosa" : "⚠️ Corrección con Advertencias",
        description: result.summary,
        className: result.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
      });
      
      console.log('✅ CORRECCIÓN INTEGRAL COMPLETADA');
      
    } catch (error) {
      console.error('❌ Error en corrección integral:', error);
      toast({
        title: "Error en Corrección Integral",
        description: "No se pudo ejecutar la corrección completa",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  // NUEVA: Función para corregir SOLO nombres de períodos
  const executeNameOnlyCorrection = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🏷️ EJECUTANDO CORRECCIÓN SOLO DE NOMBRES...');
      
      const result = await PeriodNameCorrectionService.correctPeriodNamesOnly(companyId);
      
      toast({
        title: result.corrected > 0 ? "✅ Nombres Corregidos" : "ℹ️ Nombres Ya Correctos",
        description: result.summary,
        className: result.corrected > 0 ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
      });
      
      console.log('✅ CORRECCIÓN DE NOMBRES COMPLETADA');
      
    } catch (error) {
      console.error('❌ Error en corrección de nombres:', error);
      toast({
        title: "Error en Corrección de Nombres",
        description: "No se pudieron corregir los nombres de períodos",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return {
    // Estado
    isValidating,
    
    // Acciones principales
    executeIntegralCorrection,
    executeNameOnlyCorrection, // NUEVA función
    
    // Estados calculados
    isReady: !isValidating
  };
};
