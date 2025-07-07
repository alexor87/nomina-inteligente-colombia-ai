
import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ onSave, delay = 5000, enabled = true }: UseAutoSaveOptions) => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date>();
  const isExecutingRef = useRef(false);

  const triggerAutoSave = useCallback(() => {
    if (!enabled || isExecutingRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      if (!enabled || isExecutingRef.current) return;
      
      isExecutingRef.current = true;
      setIsSaving(true);
      
      try {
        await onSave();
        setLastSaveTime(new Date());
        
        console.log('✅ Auto-guardado completado:', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('❌ Error en auto-guardado:', error);
        
        // Solo mostrar toast para errores que no sean duplicados
        if (!error?.message?.includes('duplicate key value')) {
          toast({
            title: "Error al guardar",
            description: "No se pudieron guardar los cambios automáticamente. Se reintentará pronto.",
            variant: "destructive"
          });
        }
      } finally {
        isExecutingRef.current = false;
        setIsSaving(false);
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
    isSaving,
    lastSaveTime
  };
};
