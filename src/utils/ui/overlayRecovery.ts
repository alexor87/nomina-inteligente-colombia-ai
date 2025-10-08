/**
 * Utility functions to detect and recover from UI blocking caused by orphaned overlays
 */

/**
 * Checks if the UI is currently blocked by overlays or scroll locks
 */
export function isUIBlocked(): boolean {
  // Check for scroll lock
  const hasScrollLock = document.body.classList.contains('react-remove-scroll-bar');
  
  // Check for open Radix portals
  const hasOpenPortals = document.querySelectorAll('[data-radix-portal]').length > 0;
  
  // Check for aria-hidden on main content (indicates modal is open)
  const mainContent = document.querySelector('[data-radix-dialog-content]');
  const hasAriaHidden = mainContent !== null;
  
  return hasScrollLock || hasOpenPortals || hasAriaHidden;
}

/**
 * Forces a complete UI reset by removing scroll locks and closing all overlays
 */
export function forceUIReset(): void {
  console.log('[UI Recovery] Forcing UI reset...');
  
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
  
  // 2. Remove scroll lock class
  document.body.classList.remove('react-remove-scroll-bar');
  
  // 3. Clear body styles that might be preventing scroll
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.style.position = '';
  
  // 4. Restore aria-hidden and inert attributes on root siblings
  const rootSiblings = document.querySelectorAll('body > *:not(#root)');
  rootSiblings.forEach((sibling) => {
    sibling.removeAttribute('aria-hidden');
    sibling.removeAttribute('inert');
  });
  
  // 5. Remove any lingering portal elements
  const portals = document.querySelectorAll('[data-radix-portal]');
  portals.forEach((portal) => {
    if (portal.childElementCount === 0) {
      portal.remove();
    }
  });
  
  console.log('[UI Recovery] UI reset complete');
}
