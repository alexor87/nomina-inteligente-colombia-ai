
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ HOOK DE INICIALIZACIÓN SEGURA - SIN DATOS DEMO
 * Inicialización básica sin creación automática de datos
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
        console.log('🚀 INICIALIZACIÓN SEGURA - Sistema iniciando...');
        
        // Sistema básico sin creación automática de datos
        setSystemStatus({
          initialized: true,
          secure: true,
          issues: []
        });
        
        setIsInitialized(true);
        console.log('✅ Sistema inicializado correctamente - Sin datos demo');
        
      } catch (error) {
        console.error('❌ Error en inicialización:', error);
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
