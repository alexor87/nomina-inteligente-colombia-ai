import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPlansPage from '../AdminPlansPage';
import { PlanService, SubscriptionPlan } from '@/services/PlanService';

// Mock PlanService
vi.mock('@/services/PlanService', () => ({
  PlanService: {
    getPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    togglePlanStatus: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

const mockPlans: SubscriptionPlan[] = [
  {
    id: '1',
    plan_id: 'basico',
    nombre: 'Básico',
    precio: 99000,
    max_employees: 5,
    max_payrolls_per_month: 1,
    caracteristicas: ['Nómina básica', 'Reportes simples', 'Soporte email'],
    is_active: true,
    sort_order: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: '2',
    plan_id: 'enterprise',
    nombre: 'Empresarial',
    precio: 499000,
    max_employees: 9999,
    max_payrolls_per_month: 9999,
    caracteristicas: ['Todo incluido'],
    is_active: false,
    sort_order: 3,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('AdminPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(PlanService.getPlans).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQueryClient(<AdminPlansPage />);
    expect(screen.getByText('Cargando planes...')).toBeInTheDocument();
  });

  it('renders empty state when no plans', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue([]);
    renderWithQueryClient(<AdminPlansPage />);
    await waitFor(() => {
      expect(screen.getByText('No hay planes configurados')).toBeInTheDocument();
    });
  });

  it('renders plans table with data', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue(mockPlans);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Básico')).toBeInTheDocument();
    });

    expect(screen.getByText('Empresarial')).toBeInTheDocument();
    expect(screen.getByText('basico')).toBeInTheDocument();
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  it('displays infinity symbol for unlimited values', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue(mockPlans);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Empresarial')).toBeInTheDocument();
    });

    // Enterprise plan has 9999 employees and payrolls → should show ∞
    const infinitySymbols = screen.getAllByText('∞');
    expect(infinitySymbols.length).toBeGreaterThanOrEqual(2);
  });

  it('shows active/inactive badges', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue(mockPlans);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('shows max 2 feature badges + counter', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue(mockPlans);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Nómina básica')).toBeInTheDocument();
      expect(screen.getByText('Reportes simples')).toBeInTheDocument();
    });

    // 3 features, shows 2 + "+1"
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('opens create dialog with empty form', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue([]);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      expect(screen.getByText('No hay planes configurados')).toBeInTheDocument();
    });

    // Click the button (not the dialog title)
    const buttons = screen.getAllByRole('button');
    const createBtn = buttons.find(b => b.textContent?.includes('Crear Plan'));
    expect(createBtn).toBeDefined();
    await userEvent.click(createBtn!);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/ID/)).toBeInTheDocument();
    });
  });

  it('formats currency in COP', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue(mockPlans);
    renderWithQueryClient(<AdminPlansPage />);

    await waitFor(() => {
      // Should contain formatted COP value for 99000
      const cells = screen.getAllByRole('cell');
      const hasCOP = cells.some(cell => cell.textContent?.includes('99.000') || cell.textContent?.includes('99,000'));
      expect(hasCOP).toBe(true);
    });
  });

  it('renders page title', async () => {
    vi.mocked(PlanService.getPlans).mockResolvedValue([]);
    renderWithQueryClient(<AdminPlansPage />);
    expect(screen.getByText('Gestión de Planes')).toBeInTheDocument();
  });
});
