
import { useEffect, useState } from 'react';
import { PayrollHistorySimpleService } from '@/services/PayrollHistorySimpleService';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ HOOK DE INICIALIZACIÓN DEL SISTEMA - CORREGIDO
 * Limpia automáticamente datos duplicados al cargar la aplicación
 */
export const useSystemInitialization = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeSystem = async () => {
      if (isInitialized) return;
      
      try {
        setIsInitializing(true);
        console.log('🚀 INICIALIZACIÓN - Sistema con datos reales...');
        
        // Limpiar períodos duplicados automáticamente usando método corregido
        const cleanupResult = await PayrollHistorySimpleService.cleanDuplicatePeriods();
        
        if (cleanupResult.success) {
          console.log('✅ Sistema inicializado correctamente:', cleanupResult.message);
          
          // Solo mostrar toast si se limpiaron duplicados
          if (cleanupResult.message.includes('eliminados') || cleanupResult.message.includes('duplicados')) {
            toast({
              title: "Sistema optimizado",
              description: "Se han limpiado datos duplicados automáticamente",
              className: "border-green-200 bg-green-50"
            });
          }
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Error inicializando sistema:', error);
        // No mostrar error al usuario en la inicialización automática
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSystem();
  }, [isInitialized, toast]);

  return {
    isInitializing,
    isInitialized
  };
};
