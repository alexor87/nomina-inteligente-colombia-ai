import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminLayout } from '../AdminLayout';
import { MemoryRouter } from 'react-router-dom';

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock react-router-dom Navigate and hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin/dashboard' }),
    Navigate: vi.fn(({ to }) => <div data-testid="navigate" data-to={to} />)
  };
});

import { useAuth } from '@/contexts/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('access control', () => {
    it('redirects to dashboard if user is not superadmin', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        isSuperAdmin: false,
        loading: false
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      // Should render Navigate component pointing to dashboard
      const navigate = screen.getByTestId('navigate');
      expect(navigate).toHaveAttribute('data-to', '/modules/dashboard');
    });

    it('redirects to dashboard if no user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isSuperAdmin: false,
        loading: false
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      const navigate = screen.getByTestId('navigate');
      expect(navigate).toHaveAttribute('data-to', '/modules/dashboard');
    });

    it('renders nothing while loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isSuperAdmin: false,
        loading: true
      });

      const { container } = render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('superadmin access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@test.com' },
        isSuperAdmin: true,
        loading: false
      });
    });

    it('renders sidebar with SuperAdmin title', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('SuperAdmin')).toBeInTheDocument();
    });

    it('renders Panel de Administración badge', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
    });

    it('renders Dashboard navigation item', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders Empresas navigation item', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('Empresas')).toBeInTheDocument();
    });

    it('renders Suscripciones navigation item', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('Suscripciones')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@test.com' },
        isSuperAdmin: true,
        loading: false
      });
    });

    it('navigates to dashboard when Dashboard is clicked', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Dashboard'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('navigates to companies when Empresas is clicked', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Empresas'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/companies');
    });

    it('navigates to subscriptions when Suscripciones is clicked', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Suscripciones'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/subscriptions');
    });
  });

  describe('back to app button', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@test.com' },
        isSuperAdmin: true,
        loading: false
      });
    });

    it('renders back button', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      expect(screen.getByText('Volver a la app')).toBeInTheDocument();
    });

    it('navigates to /modules/dashboard when clicked', () => {
      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Volver a la app'));

      expect(mockNavigate).toHaveBeenCalledWith('/modules/dashboard');
    });
  });

  describe('active state', () => {
    it('highlights active navigation item based on current route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@test.com' },
        isSuperAdmin: true,
        loading: false
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      // Dashboard should be active (mocked pathname is /admin/dashboard)
      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton?.className).toContain('bg-primary');
    });
  });
});
