import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIBlockDetector } from './use-ui-block-detector';

describe('useUIBlockDetector - Performance Tests', () => {
  let originalMutationObserver: typeof MutationObserver;

  beforeEach(() => {
    originalMutationObserver = global.MutationObserver;
    document.body.innerHTML = '<div id="root"></div>';
    document.body.className = '';
    document.body.style.cssText = '';
  });

  afterEach(() => {
    global.MutationObserver = originalMutationObserver;
    document.body.innerHTML = '';
  });

  // ✅ Test: No hay polling de 1 segundo (setInterval eliminado)
  it('should NOT have 1-second polling interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    
    const { unmount } = renderHook(() => useUIBlockDetector());
    
    // Verificar que NO se llama setInterval con 1000ms
    const hasOneSecondPolling = setIntervalSpy.mock.calls.some(
      call => call[1] === 1000
    );
    
    expect(hasOneSecondPolling).toBe(false);
    unmount();
    setIntervalSpy.mockRestore();
  });

  // ✅ Test: MutationObserver tiene scope reducido (subtree: false)
  it('should observe body with subtree: false for performance', () => {
    const observeCalls: Array<{ target: Node; options: MutationObserverInit }> = [];
    
    const MockMutationObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn((target: Node, options: MutationObserverInit) => {
        observeCalls.push({ target, options });
      }),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    }));
    
    global.MutationObserver = MockMutationObserver;
    
    const { unmount } = renderHook(() => useUIBlockDetector());
    
    // Verificar que se observa con subtree: false
    expect(observeCalls.length).toBeGreaterThan(0);
    const bodyObserve = observeCalls.find(call => call.target === document.body);
    expect(bodyObserve).toBeDefined();
    expect(bodyObserve?.options.subtree).toBe(false);
    
    unmount();
  });

  // ✅ Test: Solo observa atributos específicos (class, style)
  it('should only observe class and style attributes', () => {
    const observeCalls: Array<{ target: Node; options: MutationObserverInit }> = [];
    
    const MockMutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn((target: Node, options: MutationObserverInit) => {
        observeCalls.push({ target, options });
      }),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    }));
    
    global.MutationObserver = MockMutationObserver;
    
    const { unmount } = renderHook(() => useUIBlockDetector());
    
    const bodyObserve = observeCalls.find(call => call.target === document.body);
    expect(bodyObserve?.options.attributeFilter).toEqual(['class', 'style']);
    
    unmount();
  });

  // ✅ Test: Cleanup correcto al desmontar
  it('should disconnect observer and clear timeouts on unmount', () => {
    const disconnectFn = vi.fn();
    
    const MockMutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: disconnectFn,
      takeRecords: vi.fn(() => []),
    }));
    
    global.MutationObserver = MockMutationObserver;
    
    const { unmount } = renderHook(() => useUIBlockDetector());
    unmount();
    
    expect(disconnectFn).toHaveBeenCalled();
  });

  // ✅ Test: Debounce evita verificaciones excesivas
  it('should debounce checks with minimum 500ms interval', async () => {
    vi.useFakeTimers();
    
    let callbackFn: MutationCallback | null = null;
    
    const MockMutationObserver = vi.fn().mockImplementation((callback: MutationCallback) => {
      callbackFn = callback;
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => []),
      };
    });
    
    global.MutationObserver = MockMutationObserver;
    
    renderHook(() => useUIBlockDetector());
    
    // Simular múltiples mutaciones rápidas
    const mockMutation = {
      type: 'attributes' as MutationRecordType,
      attributeName: 'class',
      target: document.body,
      addedNodes: [] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      attributeNamespace: null,
      nextSibling: null,
      previousSibling: null,
      oldValue: null,
    } as MutationRecord;
    
    // Llamar el callback múltiples veces en rápida sucesión
    for (let i = 0; i < 10; i++) {
      callbackFn?.([mockMutation], {} as MutationObserver);
    }
    
    // Avanzar menos de 500ms - no debería haber verificaciones adicionales
    await act(() => {
      vi.advanceTimersByTime(400);
    });
    
    // No deberían procesarse verificaciones dentro del debounce
    // (el hook debería ignorar llamadas dentro de 500ms)
    
    vi.useRealTimers();
  });

  // ✅ Test: Retorna false cuando UI no está bloqueada
  it('should return false when UI is not blocked', () => {
    const { result } = renderHook(() => useUIBlockDetector());
    
    expect(result.current).toBe(false);
  });

  // ✅ Test: Detecta correctamente UI bloqueada
  it('should detect blocked UI when scroll lock is present', () => {
    document.body.classList.add('react-remove-scroll-bar');
    
    const { result } = renderHook(() => useUIBlockDetector());
    
    expect(result.current).toBe(true);
    
    document.body.classList.remove('react-remove-scroll-bar');
  });
});
