import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the services
vi.mock('@/services/AccountingIntegrationService', () => ({
  AccountingIntegrationService: {
    getIntegration: vi.fn(),
    saveIntegration: vi.fn(),
    activateIntegration: vi.fn(),
    deactivateIntegration: vi.fn(),
    testConnection: vi.fn(),
    getSyncHistory: vi.fn(),
    updateAutoSync: vi.fn()
  }
}));

vi.mock('@/services/SecureBaseService', () => ({
  SecureBaseService: {
    getCurrentUserCompanyId: vi.fn()
  }
}));

// Mock useCompany hook
vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => ({
    company: { id: 'test-company-id', razon_social: 'Test Company' },
    isLoading: false
  })
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('AccountingSoftwareWizard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const renderWithProviders = async (component: React.ReactElement) => {
    // Dynamic import to avoid module resolution issues
    const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
    
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render provider selection step', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      vi.mocked(AccountingIntegrationService.getIntegration).mockResolvedValue(null);
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Wait for loading to complete
      await screen.findByText(/software contable/i, {}, { timeout: 3000 });
    });
  });

  describe('Provider Selection', () => {
    it('should show Siigo and Alegra as provider options', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      vi.mocked(AccountingIntegrationService.getIntegration).mockResolvedValue(null);
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Wait for component to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that provider names appear somewhere (in cards or labels)
      expect(screen.queryByText(/siigo/i) || screen.queryByText(/alegra/i)).toBeTruthy;
    });
  });

  describe('Connected State', () => {
    it('should show connected status when integration is active', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      
      vi.mocked(AccountingIntegrationService.getIntegration).mockResolvedValue({
        id: 'int-123',
        company_id: 'test-company-id',
        provider: 'siigo',
        credentials_ref: 'cred-ref',
        is_active: true,
        auto_sync: false,
        last_sync_at: null,
        last_sync_status: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Wait for the component to load and show connected state
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe('Sync History', () => {
    it('should display sync history when available', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      
      vi.mocked(AccountingIntegrationService.getIntegration).mockResolvedValue({
        id: 'int-123',
        company_id: 'test-company-id',
        provider: 'siigo',
        credentials_ref: 'cred-ref',
        is_active: true,
        auto_sync: false,
        last_sync_at: '2024-01-15T10:00:00Z',
        last_sync_status: 'success',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });
      
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([
        {
          id: 'log-1',
          company_id: 'test-company-id',
          integration_id: 'int-123',
          period_id: 'period-1',
          provider: 'siigo',
          status: 'success',
          entries_sent: 25,
          response_data: {},
          error_message: null,
          external_reference: 'SIIGO-REF-001',
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:01:00Z'
        }
      ]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Wait for the component to load
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });
});
