
import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ onSave, delay = 2000, enabled = true }: UseAutoSaveOptions) => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<Date>();

  const triggerAutoSave = useCallback(() => {
    if (!enabled || isSavingRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      if (!enabled) return;
      
      try {
        isSavingRef.current = true;
        await onSave();
        lastSaveTimeRef.current = new Date();
        
        // Optional: Show subtle save indicator
        console.log('✅ Auto-guardado completado:', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('❌ Error en auto-guardado:', error);
        toast({
          title: "Error al guardar",
          description: "No se pudieron guardar los cambios automáticamente. Verifique su conexión.",
          variant: "destructive"
        });
      } finally {
        isSavingRef.current = false;
      }
    }, delay);
  }, [onSave, delay, enabled, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    triggerAutoSave,
    isSaving: isSavingRef.current,
    lastSaveTime: lastSaveTimeRef.current
  };
};
