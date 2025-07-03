
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
      console.log('🔍 Iniciando validación profesional completa de períodos...');
      
      // 1. Normalizar períodos irregulares automáticamente
      await BiWeeklyPeriodService.normalizeAllBiWeeklyPeriods(companyId);
      
      // 2. Normalizar nombres de períodos para consistencia
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);
      
      toast({
        title: "✅ Validación Completada",
        description: "Los períodos quincenales han sido validados, corregidos y normalizados automáticamente",
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ Validación profesional completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en validación de períodos:', error);
      toast({
        title: "Error en Validación",
        description: "No se pudieron validar los períodos quincenales",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const testBiWeeklyGeneration = async () => {
    console.log('🧪 PRUEBA DE GENERACIÓN DE PERÍODOS QUINCENALES PROFESIONALES:');
    
    try {
      // Probar generación de período actual
      const currentPeriod = BiWeeklyPeriodService.generateCurrentBiWeeklyPeriod();
      console.log('📅 Período actual:', currentPeriod);
      
      // Probar generación consecutiva
      const nextPeriod = BiWeeklyPeriodService.generateNextConsecutivePeriod(currentPeriod.endDate);
      console.log('📅 Siguiente período:', nextPeriod);
      
      // Probar febrero (año bisiesto y normal)
      const febPeriod1 = BiWeeklyPeriodService.generateNextConsecutivePeriod('2024-01-31');
      const febPeriod2 = BiWeeklyPeriodService.generateNextConsecutivePeriod(febPeriod1.endDate);
      console.log('📅 Febrero 2024 (bisiesto) 1ra quincena:', febPeriod1);
      console.log('📅 Febrero 2024 (bisiesto) 2da quincena:', febPeriod2);
      
      const febPeriod1_2025 = BiWeeklyPeriodService.generateNextConsecutivePeriod('2025-01-31');
      const febPeriod2_2025 = BiWeeklyPeriodService.generateNextConsecutivePeriod(febPeriod1_2025.endDate);
      console.log('📅 Febrero 2025 (normal) 1ra quincena:', febPeriod1_2025);
      console.log('📅 Febrero 2025 (normal) 2da quincena:', febPeriod2_2025);
      
      // Validar períodos
      const validation1 = BiWeeklyPeriodService.validateBiWeeklyPeriod(currentPeriod.startDate, currentPeriod.endDate);
      const validation2 = BiWeeklyPeriodService.validateBiWeeklyPeriod('2024-02-05', '2024-02-20'); // Período irregular
      
      console.log('✅ Validación período actual:', validation1);
      console.log('⚠️ Validación período irregular:', validation2);
      
      toast({
        title: "🧪 Prueba Completada",
        description: "Revisa la consola para ver los resultados detallados de la prueba de períodos quincenales profesionales",
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error en prueba de períodos:', error);
      toast({
        title: "Error en Prueba",
        description: "Ocurrió un error durante la prueba de períodos quincenales",
        variant: "destructive"
      });
    }
  };

  return {
    isValidating,
    validationResults,
    validateBiWeeklyPeriods,
    testBiWeeklyGeneration
  };
};
