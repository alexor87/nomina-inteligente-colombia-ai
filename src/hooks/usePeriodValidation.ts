
import { useState, useEffect } from 'react';
import { BiWeeklyPeriodService } from '@/services/payroll-intelligent/BiWeeklyPeriodService';
import { useToast } from '@/hooks/use-toast';

export const usePeriodValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const { toast } = useToast();

  const validateBiWeeklyPeriods = async (companyId: string) => {
    try {
      setIsValidating(true);
      console.log('🔍 Iniciando validación profesional de períodos quincenales...');
      
      // Normalizar períodos irregulares automáticamente
      await BiWeeklyPeriodService.normalizeAllBiWeeklyPeriods(companyId);
      
      toast({
        title: "✅ Validación Completada",
        description: "Los períodos quincenales han sido validados y corregidos automáticamente",
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

  const testBiWeeklyGeneration = () => {
    console.log('🧪 PRUEBA DE GENERACIÓN DE PERÍODOS QUINCENALES PROFESIONALES:');
    
    // Probar generación de período actual
    const currentPeriod = BiWeeklyPeriodService.generateCurrentBiWeeklyPeriod();
    console.log('📅 Período actual:', currentPeriod);
    
    // Probar generación consecutiva
    const nextPeriod = BiWeeklyPeriodService.generateNextConsecutivePeriod(currentPeriod.endDate);
    console.log('📅 Siguiente período:', nextPeriod);
    
    // Probar febrero
    const febPeriod1 = BiWeeklyPeriodService.generateNextConsecutivePeriod('2024-01-31');
    const febPeriod2 = BiWeeklyPeriodService.generateNextConsecutivePeriod(febPeriod1.endDate);
    console.log('📅 Febrero 1ra quincena:', febPeriod1);
    console.log('📅 Febrero 2da quincena:', febPeriod2);
    
    // Validar períodos
    const validation1 = BiWeeklyPeriodService.validateBiWeeklyPeriod(currentPeriod.startDate, currentPeriod.endDate);
    const validation2 = BiWeeklyPeriodService.validateBiWeeklyPeriod('2024-02-05', '2024-02-20'); // Período irregular
    
    console.log('✅ Validación período actual:', validation1);
    console.log('⚠️ Validación período irregular:', validation2);
    
    toast({
      title: "🧪 Prueba Completada",
      description: "Revisa la consola para ver los resultados de la prueba de períodos quincenales",
      className: "border-blue-200 bg-blue-50"
    });
  };

  return {
    isValidating,
    validationResults,
    validateBiWeeklyPeriods,
    testBiWeeklyGeneration
  };
};
