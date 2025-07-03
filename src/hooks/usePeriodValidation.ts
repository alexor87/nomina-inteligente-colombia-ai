
import { useState } from 'react';
import { DataMigrationService } from '@/services/payroll-intelligent/DataMigrationService';
import { PayrollPeriodCalculationService } from '@/services/payroll-intelligent/PayrollPeriodCalculationService';
import { PeriodNameUnifiedService } from '@/services/payroll-intelligent/PeriodNameUnifiedService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const executeIntegralCorrection = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🚀 EJECUTANDO CORRECCIÓN INTEGRAL PROFESIONAL...');
      
      const result = await DataMigrationService.executeIntegralCorrection(companyId);
      
      // NUEVA FUNCIÓN: Normalizar nombres de períodos después de la corrección
      console.log('🏷️ NORMALIZANDO NOMBRES DE PERÍODOS...');
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
      
      // Exponer funciones globales para testing
      (window as any).testPeriodGeneration = async () => {
        console.log('🧪 TESTING GENERACIÓN DE PERÍODOS:');
        
        try {
          const { PeriodStrategyFactory } = await import('@/services/payroll-intelligent/PeriodGenerationStrategy');
          
          const strategy = PeriodStrategyFactory.createStrategy('quincenal');
          
          // Probar generación de primer período
          const firstPeriod = strategy.generateFirstPeriod();
          console.log('📅 PRIMER PERÍODO:', firstPeriod);
          
          // Probar generación consecutiva
          const nextPeriod = strategy.generateNextConsecutivePeriod(firstPeriod.endDate);
          console.log('📅 SIGUIENTE PERÍODO:', nextPeriod);
          
          // Probar validación
          const validation1 = strategy.validateAndCorrectPeriod(firstPeriod.startDate, firstPeriod.endDate);
          console.log('✅ VALIDACIÓN PERÍODO CORRECTO:', validation1);
          
          const validation2 = strategy.validateAndCorrectPeriod('2024-02-05', '2024-02-20');
          console.log('⚠️ VALIDACIÓN PERÍODO IRREGULAR:', validation2);
          
          toast({
            title: "🧪 Test Completado",
            description: "Revisa la consola para ver los resultados de las pruebas",
            className: "border-blue-200 bg-blue-50"
          });
          
        } catch (error) {
          console.error('❌ Error en test:', error);
        }
      };

      (window as any).validatePeriods = async () => {
        console.log('🔍 VALIDANDO PERÍODOS EXISTENTES...');
        
        try {
          const companyId = 'tu-company-id'; // Se debe obtener dinámicamente
          const result = await DataMigrationService.executeIntegralCorrection(companyId);
          console.log('📊 RESULTADO VALIDACIÓN:', result);
          
          toast({
            title: "🔍 Validación Completada",
            description: "Revisa la consola para ver el análisis detallado",
            className: "border-green-200 bg-green-50"
          });
          
        } catch (error) {
          console.error('❌ Error en validación:', error);
        }
      };

      // NUEVA FUNCIÓN: Normalizar solo nombres de períodos
      (window as any).normalizeNames = async () => {
        console.log('🏷️ NORMALIZANDO NOMBRES DE PERÍODOS...');
        
        try {
          // Obtener companyId dinámicamente (esto se debe mejorar)
          const companyId = 'tu-company-id';
          await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
          
          toast({
            title: "🏷️ Nombres Normalizados",
            description: "Los nombres de períodos han sido corregidos",
            className: "border-purple-200 bg-purple-50"
          });
          
        } catch (error) {
          console.error('❌ Error normalizando nombres:', error);
        }
      };
      
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

  return {
    // Estado
    isValidating,
    
    // Acciones principales
    executeIntegralCorrection,
    
    // Estados calculados
    isReady: !isValidating
  };
};
