
import { useEffect, useState } from 'react';
import { CriticalRepairService } from '@/services/CriticalRepairService';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ HOOK DE INICIALIZACIÓN CRÍTICA - REPARADO
 * Inicialización automática con diagnóstico y reparación
 */
export const useSystemInitialization = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeSystem = async () => {
      if (isInitialized) return;
      
      try {
        setIsInitializing(true);
        console.log('🚀 INICIALIZACIÓN CRÍTICA - Diagnosticando sistema...');
        
        // Diagnóstico completo del sistema
        const diagnosis = await CriticalRepairService.diagnoseSystem();
        setSystemStatus(diagnosis);
        
        // Si hay problemas críticos, intentar reparación automática
        if (diagnosis.issues.length > 0) {
          console.log('🔧 Problemas detectados, ejecutando reparación automática...');
          
          const repairResult = await CriticalRepairService.createMinimumTestData();
          
          if (repairResult.success) {
            toast({
              title: "🔧 Sistema reparado automáticamente",
              description: `${repairResult.employeesCreated} empleados y ${repairResult.periodsCreated} períodos creados`,
              className: "border-green-200 bg-green-50"
            });
            
            // Re-diagnosticar después de la reparación
            const newDiagnosis = await CriticalRepairService.diagnoseSystem();
            setSystemStatus(newDiagnosis);
          } else {
            console.warn('⚠️ Reparación automática falló:', repairResult.message);
          }
        } else {
          console.log('✅ Sistema en buen estado');
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Error en inicialización crítica:', error);
        toast({
          title: "Error en inicialización",
          description: "Algunos componentes pueden no funcionar correctamente",
          variant: "destructive"
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSystem();
  }, [isInitialized, toast]);

  return {
    isInitializing,
    isInitialized,
    systemStatus
  };
};
