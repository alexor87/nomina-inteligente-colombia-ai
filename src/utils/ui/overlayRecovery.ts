/**
 * Utility functions to detect and recover from UI blocking caused by orphaned overlays
 */

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
 * Forces a complete UI reset by removing scroll locks and closing all overlays
 */
export function forceUIReset(): void {
  console.log('[UI Recovery] Starting UI reset...');
  console.log('[UI Recovery] Before reset:', {
    bodyClasses: Array.from(document.body.classList),
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: document.documentElement.style.overflow,
    rootInert: document.getElementById('root')?.hasAttribute('inert'),
    rootAriaHidden: document.getElementById('root')?.getAttribute('aria-hidden'),
    openDialogs: document.querySelectorAll('[role="dialog"][data-state="open"]').length,
  });
  
  // 1. Dispatch multiple Escape events to close any open dialogs/menus
  for (let i = 0; i < 3; i++) {
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
  
  // 2. Use double requestAnimationFrame to ensure Radix animations complete
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 2.5 Add a small timeout to let teardown finish
      setTimeout(() => {
        // 3. Remove scroll lock class
        document.body.classList.remove('react-remove-scroll-bar');
        
        // 4. Clear body AND html styles that might be preventing scroll
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';
        
        // 5. Restore #root itself (critical!)
        const root = document.getElementById('root');
        if (root) {
          root.removeAttribute('inert');
          root.removeAttribute('aria-hidden');
        }
        
        // 6. Restore aria-hidden and inert attributes on root siblings
        const rootSiblings = document.querySelectorAll('body > *:not(#root)');
        rootSiblings.forEach((sibling) => {
          sibling.removeAttribute('aria-hidden');
          sibling.removeAttribute('inert');
        });
        
        // 7. Remove any lingering closed or empty portal elements
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach((portal) => {
          const hasOpenChild = portal.querySelector('[data-state="open"]');
          if (!hasOpenChild) {
            portal.remove();
          }
        });
        
        console.log('[UI Recovery] After reset:', {
          bodyClasses: Array.from(document.body.classList),
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
          rootInert: document.getElementById('root')?.hasAttribute('inert'),
          rootAriaHidden: document.getElementById('root')?.getAttribute('aria-hidden'),
          openDialogs: document.querySelectorAll('[role="dialog"][data-state="open"]').length,
        });
        console.log('[UI Recovery] UI reset complete');
      }, 250);
    });
  });
}
