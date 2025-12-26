import { useEffect, useState, useRef } from 'react';
import { isUIBlocked } from '@/utils/ui/overlayRecovery';

/**
 * 🔧 OPTIMIZADO: Hook que detecta cuando la UI está bloqueada por overlays huérfanos
 * - Eliminado polling cada 1 segundo (consumía CPU innecesariamente)
 * - MutationObserver con scope reducido (solo atributos de body, no subtree completo)
 * - Debounce para evitar verificaciones excesivas
 */
export function useUIBlockDetector() {
  const [isBlocked, setIsBlocked] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // Verificación inicial (una sola vez)
    setIsBlocked(isUIBlocked());

    // 🔧 Función debounced para verificar el estado
    const debouncedCheck = () => {
      // Evitar verificaciones muy frecuentes (mínimo 500ms entre cada una)
      const now = Date.now();
      if (now - lastCheckRef.current < 500) {
        return;
      }
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        lastCheckRef.current = Date.now();
        setIsBlocked(isUIBlocked());
      }, 100);
    };

    // 🔧 MutationObserver con scope MUY reducido
    // Solo observamos cambios en atributos de body (clase, style)
    // NO observamos subtree completo (eso era muy costoso)
    const observer = new MutationObserver((mutations) => {
      // Solo verificar si hay cambios relevantes
      const hasRelevantChange = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          return mutation.attributeName === 'class' || mutation.attributeName === 'style';
        }
        // Solo verificar childList si se agregó/eliminó algo al body directamente
        if (mutation.type === 'childList' && mutation.target === document.body) {
          return true;
        }
        return false;
      });
      
      if (hasRelevantChange) {
        debouncedCheck();
      }
    });

    // Observar SOLO body con scope mínimo (sin subtree)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: false // 🔧 CRÍTICO: false en lugar de true
    });

    // 🔧 ELIMINADO: setInterval de polling cada 1 segundo
    // El MutationObserver es suficiente para detectar cambios

    return () => {
      observer.disconnect();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return isBlocked;
}
