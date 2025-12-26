/**
 * 🔧 OPTIMIZADO: Utility functions to detect and recover from UI blocking caused by orphaned overlays
 * - Añadido debounce para evitar llamadas múltiples a forceUIReset
 * - Verificación condicional antes de ejecutar reset
 */

let resetInProgress = false;
let lastResetTime = 0;
const MIN_RESET_INTERVAL = 1000; // Mínimo 1 segundo entre resets

/**
 * Checks if the UI is currently blocked by overlays or scroll locks
 */
export function isUIBlocked(): boolean {
  // Check for scroll lock on body
  const hasScrollLock = 
    document.body.classList.contains('react-remove-scroll-bar') ||
    document.body.style.overflow === 'hidden' ||
    document.documentElement.style.overflow === 'hidden';
  
  // Check if #root itself is blocked
  const root = document.getElementById('root');
  const rootBlocked = 
    root?.hasAttribute('inert') || 
    root?.getAttribute('aria-hidden') === 'true';
  
  // Check for actually open dialogs/overlays (not just empty portals)
  const hasOpenDialog = !!document.querySelector(
    '[role="dialog"][data-state="open"], [data-radix-portal] [data-state="open"]'
  );
  
  return hasScrollLock || rootBlocked || hasOpenDialog;
}

/**
 * 🔧 OPTIMIZADO: Forces a complete UI reset by removing scroll locks and closing all overlays
 * - Debounce para evitar resets múltiples en rápida sucesión
 * - Solo ejecuta si realmente hay algo bloqueado
 */
export function forceUIReset(): void {
  // 🔧 Evitar resets muy frecuentes
  const now = Date.now();
  if (resetInProgress || (now - lastResetTime < MIN_RESET_INTERVAL)) {
    console.log('[UI Recovery] Reset skipped (debounce)');
    return;
  }
  
  // 🔧 Solo ejecutar si hay algo bloqueado
  if (!isUIBlocked()) {
    console.log('[UI Recovery] UI not blocked, skipping reset');
    return;
  }
  
  resetInProgress = true;
  lastResetTime = now;
  
  console.log('[UI Recovery] Starting UI reset...');
  
  // 1. Dispatch Escape events to close any open dialogs/menus (reducido a 2)
  for (let i = 0; i < 2; i++) {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      })
    );
  }
  
  // 2. Use requestAnimationFrame for smooth cleanup
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 3. Small timeout to let Radix teardown finish
      setTimeout(() => {
        // 4. Remove scroll lock class
        document.body.classList.remove('react-remove-scroll-bar');
        
        // 5. Clear body AND html styles
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';
        
        // 6. Restore #root
        const root = document.getElementById('root');
        if (root) {
          root.removeAttribute('inert');
          root.removeAttribute('aria-hidden');
        }
        
        // 7. Restore aria-hidden on root siblings
        const rootSiblings = document.querySelectorAll('body > *:not(#root)');
        rootSiblings.forEach((sibling) => {
          sibling.removeAttribute('aria-hidden');
          sibling.removeAttribute('inert');
        });
        
        // 8. Remove empty portal elements only
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach((portal) => {
          const hasOpenChild = portal.querySelector('[data-state="open"]');
          if (!hasOpenChild && portal.children.length === 0) {
            portal.remove();
          }
        });
        
        resetInProgress = false;
        console.log('[UI Recovery] UI reset complete');
      }, 150); // Reducido de 250ms a 150ms
    });
  });
}

/**
 * 🆕 Limpia el estado de reset (útil para testing)
 */
export function clearResetState(): void {
  resetInProgress = false;
  lastResetTime = 0;
}
