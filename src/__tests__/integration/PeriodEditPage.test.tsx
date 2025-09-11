import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PeriodEditPage from '@/pages/PeriodEditPage';
import { mockPayrollPeriod, mockEmployee } from '../mocks/supabase';

// Mock the router params
const mockParams = { periodId: 'test-period-id' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn(),
  };
});

// Mock PayrollEmployeeCalculationService
vi.mock('@/services/PayrollEmployeeCalculationService', () => ({
  PayrollEmployeeCalculationService: {
    recalculateEmployee: vi.fn().mockResolvedValue({
      totalDevengado: 1585500,
      totalDeducciones: 113880,
      netoPagado: 1471620,
      ibc: 1423500,
      auxilioTransporte: 162000,
      saludEmpleado: 56940,
      pensionEmpleado: 56940,
    }),
    recalculateMultipleEmployees: vi.fn().mockResolvedValue({
      'emp-001': {
        totalDevengado: 1585500,
        totalDeducciones: 113880,
        netoPagado: 1471620,
        ibc: 1423500,
        auxilioTransporte: 162000,
        saludEmpleado: 56940,
        pensionEmpleado: 56940,
      },
    }),
  },
}));

// Mock usePayrollNovedadesUnified
vi.mock('@/hooks/usePayrollNovedadesUnified', () => ({
  usePayrollNovedadesUnified: () => ({
    novedades: [],
    loadingNovedades: false,
    error: null,
    refetchNovedades: vi.fn(),
  }),
}));

// Mock Supabase queries
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPayrollPeriod,
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PeriodEditPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load period and employee data correctly', async () => {
    // Arrange
    const mockSupabase = await import('@/integrations/supabase/client');
    mockSupabase.supabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPayrollPeriod,
        error: null,
      }),
    }));

    // Act
    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Editar Período')).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    // Act
    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    // Assert
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should handle period not found', async () => {
    // Arrange
    const mockSupabase = await import('@/integrations/supabase/client');
    mockSupabase.supabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Period not found' },
      }),
    }));

    // Act
    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Período no encontrado/)).toBeInTheDocument();
    });
  });

  it('should trigger recalculation on salary change', async () => {
    // Arrange
    const { PayrollEmployeeCalculationService } = await import('@/services/PayrollEmployeeCalculationService');
    const mockRecalculate = vi.mocked(PayrollEmployeeCalculationService.recalculateEmployee);

    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Editar Período')).toBeInTheDocument();
    });

    // Act - Simulate salary change
    const salaryInput = screen.getByDisplayValue('1423500');
    fireEvent.change(salaryInput, { target: { value: '1500000' } });

    // Assert
    await waitFor(() => {
      expect(mockRecalculate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseSalary: 1500000,
        })
      );
    });
  });

  it('should show save and cancel buttons', async () => {
    // Act
    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  it('should handle mass recalculation', async () => {
    // Arrange
    const { PayrollEmployeeCalculationService } = await import('@/services/PayrollEmployeeCalculationService');
    const mockRecalculateMultiple = vi.mocked(PayrollEmployeeCalculationService.recalculateMultipleEmployees);

    render(
      <TestWrapper>
        <PeriodEditPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recalcular Todo')).toBeInTheDocument();
    });

    // Act
    const recalculateButton = screen.getByText('Recalcular Todo');
    fireEvent.click(recalculateButton);

    // Assert
    await waitFor(() => {
      expect(mockRecalculateMultiple).toHaveBeenCalled();
    });
  });
});