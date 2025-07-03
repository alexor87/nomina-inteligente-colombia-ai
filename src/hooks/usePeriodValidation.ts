
import { useState, useEffect } from 'react';
import { PayrollPeriodCalculationService } from '@/services/payroll-intelligent/PayrollPeriodCalculationService';
import { DataMigrationService } from '@/services/payroll-intelligent/DataMigrationService';
import { PeriodNameUnifiedService } from '@/services/payroll-intelligent/PeriodNameUnifiedService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const { toast } = useToast();

  const validateBiWeeklyPeriods = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🔍 INICIANDO VALIDACIÓN PROFESIONAL CON ARQUITECTURA UNIFICADA...');
      
      // 1. Analizar períodos incorrectos
      const analysis = await DataMigrationService.analyzeIncorrectPeriods(companyId);
      console.log('📊 ANÁLISIS:', analysis);
      
      // 2. Corregir automáticamente períodos irregulares
      const correction = await DataMigrationService.correctAllBiWeeklyPeriods(companyId);
      console.log('🔧 CORRECCIÓN:', correction);
      
      // 3. Normalizar nombres de períodos para consistencia
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
      
      // 4. Verificar integridad post-corrección
      const integrity = await DataMigrationService.verifyIntegrityAfterCorrection(companyId);
      console.log('🔍 INTEGRIDAD:', integrity);
      
      toast({
        title: "✅ Validación Profesional Completada",
        description: `${correction.summary}. ${integrity.summary}`,
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ VALIDACIÓN PROFESIONAL COMPLETADA EXITOSAMENTE');
      
    } catch (error) {
      console.error('❌ Error en validación profesional:', error);
      toast({
        title: "Error en Validación Profesional",
        description: "No se pudieron validar los períodos con la nueva arquitectura",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const testBiWeeklyGeneration = async () => {
    console.log('🧪 PRUEBA DE GENERACIÓN CON ARQUITECTURA UNIFICADA:');
    
    try {
      // Probar generación con diferentes strategies
      const { PeriodStrategyFactory } = await import('@/services/payroll-intelligent/PeriodGenerationStrategy');
      
      const biWeeklyStrategy = PeriodStrategyFactory.createStrategy('quincenal');
      const monthlyStrategy = PeriodStrategyFactory.createStrategy('mensual');
      const weeklyStrategy = PeriodStrategyFactory.createStrategy('semanal');
      
      // Probar períodos quincenales
      const firstPeriod = biWeeklyStrategy.generateFirstPeriod();
      console.log('📅 PRIMER PERÍODO QUINCENAL:', firstPeriod);
      
      const nextPeriod = biWeeklyStrategy.generateNextConsecutivePeriod(firstPeriod.endDate);
      console.log('📅 SIGUIENTE PERÍODO QUINCENAL:', nextPeriod);
      
      // Probar casos complejos (febrero)
      const febPeriod1 = biWeeklyStrategy.generateNextConsecutivePeriod('2024-01-31');
      const febPeriod2 = biWeeklyStrategy.generateNextConsecutivePeriod(febPeriod1.endDate);
      console.log('📅 FEBRERO 2024 (bisiesto) 1ra quincena:', febPeriod1);
      console.log('📅 FEBRERO 2024 (bisiesto) 2da quincena:', febPeriod2);
      
      // Probar validaciones
      const validation1 = biWeeklyStrategy.validateAndCorrectPeriod(firstPeriod.startDate, firstPeriod.endDate);
      const validation2 = biWeeklyStrategy.validateAndCorrectPeriod('2024-02-05', '2024-02-20'); // Período irregular
      
      console.log('✅ VALIDACIÓN PERÍODO CORRECTO:', validation1);
      console.log('⚠️ VALIDACIÓN PERÍODO IRREGULAR (será corregido):', validation2);
      
      // Probar otros tipos de período
      const monthlyPeriod = monthlyStrategy.generateCurrentPeriod();
      const weeklyPeriod = weeklyStrategy.generateCurrentPeriod();
      
      console.log('📅 PERÍODO MENSUAL:', monthlyPeriod);
      console.log('📅 PERÍODO SEMANAL:', weeklyPeriod);
      
      toast({
        title: "🧪 Pruebas de Arquitectura Completadas",
        description: "Revisa la consola para ver los resultados detallados de las pruebas con la nueva arquitectura unificada",
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error en pruebas de arquitectura:', error);
      toast({
        title: "Error en Pruebas de Arquitectura",
        description: "Ocurrió un error durante las pruebas de la nueva arquitectura",
        variant: "destructive"
      });
    }
  };

  return {
    // Estado
    isValidating,
    validationResults,
    validateBiWeeklyPeriods,
    testBiWeeklyGeneration
  };
};
