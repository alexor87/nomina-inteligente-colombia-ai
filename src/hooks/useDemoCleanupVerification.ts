
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DemoDataCleanupService } from '@/services/DemoDataCleanupService';

export const useDemoCleanupVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [employeeStats, setEmployeeStats] = useState<any>(null);
  const [demoPatterns, setDemoPatterns] = useState<any>(null);
  const { toast } = useToast();

  const runVerification = async () => {
    try {
      setIsVerifying(true);
      console.log('🔍 Iniciando verificación completa...');

      // Verificar limpieza de datos demo
      const cleanup = await DemoDataCleanupService.verifyCleanup();
      setVerificationResult(cleanup);

      // Obtener estadísticas de empleados
      const stats = await DemoDataCleanupService.getEmployeeStats();
      setEmployeeStats(stats);

      // Verificar patrones demo restantes
      const patterns = await DemoDataCleanupService.checkForDemoPatterns();
      setDemoPatterns(patterns);

      // Mostrar resultado en toast
      if (cleanup.success) {
        toast({
          title: "✅ Verificación exitosa",
          description: cleanup.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Verificación incompleta",
          description: cleanup.message,
          variant: "destructive"
        });
      }

      return {
        cleanup,
        stats,
        patterns
      };
    } catch (error) {
      console.error('❌ Error en verificación:', error);
      toast({
        title: "Error en verificación",
        description: "No se pudo completar la verificación del sistema",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  // Verificación automática al montar el componente
  useEffect(() => {
    runVerification();
  }, []);

  return {
    isVerifying,
    verificationResult,
    employeeStats,
    demoPatterns,
    runVerification
  };
};
