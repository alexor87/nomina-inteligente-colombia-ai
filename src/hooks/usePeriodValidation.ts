
import { useState, useEffect } from 'react';
import { BiWeeklyPeriodService } from '@/services/payroll-intelligent/BiWeeklyPeriodService';
import { PeriodNameUnifiedService } from '@/services/payroll-intelligent/PeriodNameUnifiedService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const { toast } = useToast();

  const validateBiWeeklyPeriods = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🔍 INICIANDO VALIDACIÓN PROFESIONAL ESTRICTA de períodos...');
      
      // 1. Normalizar períodos irregulares automáticamente con LÓGICA ESTRICTA
      await BiWeeklyPeriodService.normalizeAllBiWeeklyPeriods(companyId);
      
      // 2. Normalizar nombres de períodos para consistencia
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
      
      toast({
        title: "✅ Validación Estricta Completada",
        description: "Los períodos quincenales han sido validados y corregidos con reglas estrictas (1-15, 16-fin de mes)",
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ VALIDACIÓN ESTRICTA PROFESIONAL COMPLETADA EXITOSAMENTE');
      
    } catch (error) {
      console.error('❌ Error en validación estricta de períodos:', error);
      toast({
        title: "Error en Validación Estricta",
        description: "No se pudieron validar los períodos quincenales con reglas estrictas",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const testBiWeeklyGeneration = async () => {
    console.log('🧪 PRUEBA DE GENERACIÓN DE PERÍODOS QUINCENALES ESTRICTOS:');
    
    try {
      // Probar generación de primer período estricto
      const firstPeriod = BiWeeklyPeriodService.generateFirstStrictBiWeeklyPeriod();
      console.log('📅 PRIMER PERÍODO ESTRICTO:', firstPeriod);
      
      // Probar generación consecutiva estricta
      const nextPeriod = BiWeeklyPeriodService.generateStrictNextConsecutivePeriod(firstPeriod.endDate);
      console.log('📅 SIGUIENTE PERÍODO ESTRICTO:', nextPeriod);
      
      // Probar febrero (año bisiesto y normal) con LÓGICA ESTRICTA
      const febPeriod1 = BiWeeklyPeriodService.generateStrictNextConsecutivePeriod('2024-01-31');
      const febPeriod2 = BiWeeklyPeriodService.generateStrictNextConsecutivePeriod(febPeriod1.endDate);
      console.log('📅 FEBRERO 2024 (bisiesto) 1ra quincena ESTRICTA:', febPeriod1);
      console.log('📅 FEBRERO 2024 (bisiesto) 2da quincena ESTRICTA:', febPeriod2);
      
      const febPeriod1_2025 = BiWeeklyPeriodService.generateStrictNextConsecutivePeriod('2025-01-31');
      const febPeriod2_2025 = BiWeeklyPeriodService.generateStrictNextConsecutivePeriod(febPeriod1_2025.endDate);
      console.log('📅 FEBRERO 2025 (normal) 1ra quincena ESTRICTA:', febPeriod1_2025);
      console.log('📅 FEBRERO 2025 (normal) 2da quincena ESTRICTA:', febPeriod2_2025);
      
      // Validar períodos con VALIDADOR ESTRICTO
      const validation1 = BiWeeklyPeriodService.validateBiWeeklyPeriod(firstPeriod.startDate, firstPeriod.endDate);
      const validation2 = BiWeeklyPeriodService.validateBiWeeklyPeriod('2024-02-05', '2024-02-20'); // Período irregular
      
      console.log('✅ VALIDACIÓN PERÍODO ESTRICTO:', validation1);
      console.log('⚠️ VALIDACIÓN PERÍODO IRREGULAR (será corregido):', validation2);
      
      toast({
        title: "🧪 Prueba Estricta Completada",
        description: "Revisa la consola para ver los resultados detallados de la prueba de períodos quincenales ESTRICTOS (1-15, 16-fin de mes)",
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error en prueba de períodos estrictos:', error);
      toast({
        title: "Error en Prueba Estricta",
        description: "Ocurrió un error durante la prueba de períodos quincenales estrictos",
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
