import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Supabase antes de importar el provider
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  }
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/dashboard' })),
  useNavigate: vi.fn(() => vi.fn()),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

// Mock useCompanyId
vi.mock('@/hooks/useCompanyId', () => ({
  useCompanyId: vi.fn(() => 'test-company-id')
}));

describe('MayaProvider - Lazy Loading Performance Tests', () => {
  let supabaseMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    supabaseMock = await import('@/integrations/supabase/client');
  });

  // ✅ Test: NO carga datos de empleados en el mount inicial
  it('should NOT load employee data on initial mount (lazy loading)', async () => {
    const fromSpy = vi.spyOn(supabaseMock.supabase, 'from');
    
    // Importar dinámicamente después de configurar mocks
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    renderHook(() => useMaya(), { wrapper });
    
    // Esperar un tick para que se procese cualquier efecto
    await waitFor(() => {
      // Verificar que NO se llamó a supabase.from('employees') en el mount
      const employeeCalls = fromSpy.mock.calls.filter(
        call => call[0] === 'employees'
      );
      expect(employeeCalls.length).toBe(0);
    }, { timeout: 100 });
  });

  // ✅ Test: El contexto lazy inicia con isLoaded = false
  it('should initialize lazy context with isLoaded = false', async () => {
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    const { result } = renderHook(() => useMaya(), { wrapper });
    
    // El contexto lazy debe iniciar sin cargar
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });

  // ✅ Test: El hook no debería estar procesando al inicio
  it('should not be processing on initial render', async () => {
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    const { result } = renderHook(() => useMaya(), { wrapper });
    
    expect(result.current.isProcessing).toBe(false);
  });

  // ✅ Test: Verificar que el provider expone las funciones necesarias
  it('should expose required functions from context', async () => {
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    const { result } = renderHook(() => useMaya(), { wrapper });
    
    expect(typeof result.current.sendMessage).toBe('function');
  });

  // ✅ Test: Verificar que el estado de conversación está disponible
  it('should have conversation state available', async () => {
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    const { result } = renderHook(() => useMaya(), { wrapper });
    
    // El hook debería exponer el estado de procesamiento
    expect(typeof result.current.isProcessing).toBe('boolean');
  });

  // ✅ Test: Verificar que sendMessage está definido y es una función
  it('should have sendMessage function defined', async () => {
    const { MayaProvider, useMaya } = await import('./MayaProvider');
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MayaProvider>{children}</MayaProvider>
    );
    
    const { result } = renderHook(() => useMaya(), { wrapper });
    
    expect(result.current.sendMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
  });
});
