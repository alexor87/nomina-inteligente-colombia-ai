import { useEffect, useState } from 'react';
import { isUIBlocked } from '@/utils/ui/overlayRecovery';

/**
 * Hook that detects when the UI becomes blocked by orphaned overlays
 */
export function useUIBlockDetector() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Initial check
    setIsBlocked(isUIBlocked());

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      setIsBlocked(isUIBlocked());
    });

    // Observe changes to body classes and child list
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });

    // Also poll periodically as a fallback
    const interval = setInterval(() => {
      setIsBlocked(isUIBlocked());
    }, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return isBlocked;
}
