import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUIBlocked, forceUIReset, clearResetState } from './overlayRecovery';

describe('overlayRecovery - Performance Tests', () => {
  
  beforeEach(() => {
    clearResetState(); // Limpiar estado entre tests
    document.body.innerHTML = '<div id="root"></div>';
    document.body.className = '';
    document.body.style.cssText = '';
    document.documentElement.style.cssText = '';
  });

  // ✅ Test: isUIBlocked retorna false cuando no hay bloqueo
  it('should return false when UI is not blocked', () => {
    expect(isUIBlocked()).toBe(false);
  });

  // ✅ Test: isUIBlocked detecta scroll lock por clase
  it('should detect scroll lock by class', () => {
    document.body.classList.add('react-remove-scroll-bar');
    expect(isUIBlocked()).toBe(true);
  });

  // ✅ Test: isUIBlocked detecta scroll lock por style
  it('should detect scroll lock by body overflow style', () => {
    document.body.style.overflow = 'hidden';
    expect(isUIBlocked()).toBe(true);
  });

  // ✅ Test: isUIBlocked detecta root bloqueado con inert
  it('should detect blocked root with inert attribute', () => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    expect(isUIBlocked()).toBe(true);
  });

  // ✅ Test: isUIBlocked detecta root bloqueado con aria-hidden
  it('should detect blocked root with aria-hidden', () => {
    const root = document.getElementById('root');
    root?.setAttribute('aria-hidden', 'true');
    expect(isUIBlocked()).toBe(true);
  });

  // ✅ Test: Debounce evita resets múltiples en rápida sucesión
  it('should debounce rapid forceUIReset calls', () => {
    // Simular UI bloqueada
    document.body.classList.add('react-remove-scroll-bar');
    
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Llamar forceUIReset 5 veces rápidamente
    forceUIReset();
    forceUIReset();
    forceUIReset();
    forceUIReset();
    forceUIReset();
    
    // Solo el primero debería ejecutarse, los demás ser skipped
    const skipMessages = consoleSpy.mock.calls.filter(
      call => call[0]?.includes('Reset skipped')
    );
    
    expect(skipMessages.length).toBeGreaterThanOrEqual(4);
    consoleSpy.mockRestore();
  });

  // ✅ Test: No ejecuta reset si UI no está bloqueada
  it('should skip reset if UI is not blocked', () => {
    // UI no bloqueada (estado limpio)
    const consoleSpy = vi.spyOn(console, 'log');
    
    forceUIReset();
    
    const skipMessages = consoleSpy.mock.calls.filter(
      call => call[0]?.includes('UI not blocked')
    );
    
    expect(skipMessages.length).toBe(1);
    consoleSpy.mockRestore();
  });

  // ✅ Test: Mínimo 1 segundo entre resets
  it('should enforce minimum 1 second between resets', () => {
    vi.useFakeTimers();
    
    document.body.classList.add('react-remove-scroll-bar');
    
    const consoleSpy = vi.spyOn(console, 'log');
    
    forceUIReset(); // Primer reset - debería ejecutarse
    
    // Avanzar 500ms (menos del mínimo)
    vi.advanceTimersByTime(500);
    
    // Re-bloquear para segundo intento
    document.body.classList.add('react-remove-scroll-bar');
    forceUIReset(); // Segundo reset - debería ser skipped por debounce temporal
    
    const skipMessages = consoleSpy.mock.calls.filter(
      call => call[0]?.includes('Reset skipped')
    );
    
    expect(skipMessages.length).toBeGreaterThanOrEqual(1);
    
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  // ✅ Test: isUIBlocked es eficiente (rendimiento)
  it('should check UI blocked state efficiently (< 50ms for 1000 calls)', () => {
    const start = performance.now();
    
    // Ejecutar 1000 veces para medir rendimiento
    for (let i = 0; i < 1000; i++) {
      isUIBlocked();
    }
    
    const elapsed = performance.now() - start;
    
    // Debería tomar menos de 50ms para 1000 llamadas
    expect(elapsed).toBeLessThan(50);
  });

  // ✅ Test: clearResetState resetea correctamente el estado
  it('should reset state with clearResetState', () => {
    document.body.classList.add('react-remove-scroll-bar');
    
    forceUIReset(); // Primer reset
    clearResetState(); // Limpiar estado
    
    document.body.classList.add('react-remove-scroll-bar');
    
    const consoleSpy = vi.spyOn(console, 'log');
    forceUIReset(); // Debería ejecutarse después de clear
    
    const startMessages = consoleSpy.mock.calls.filter(
      call => call[0]?.includes('Starting UI reset')
    );
    
    expect(startMessages.length).toBe(1);
    consoleSpy.mockRestore();
  });
});
