
import { useEffect } from 'react';
import { RealtimeService } from '@/services/RealtimeService';

export const useRealtimeCleanup = () => {
  useEffect(() => {
    // Cleanup al desmontar la aplicación
    return () => {
      console.log('🧹 Limpiando todas las suscripciones realtime...');
      RealtimeService.unsubscribeAll();
    };
  }, []);
};
