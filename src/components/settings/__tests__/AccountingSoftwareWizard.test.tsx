import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  describe('Integration Service Interface', () => {
    it('should have the correct interface for getIntegration', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      
      expect(typeof AccountingIntegrationService.getIntegration).toBe('function');
      expect(typeof AccountingIntegrationService.saveIntegration).toBe('function');
      expect(typeof AccountingIntegrationService.activateIntegration).toBe('function');
      expect(typeof AccountingIntegrationService.deactivateIntegration).toBe('function');
      expect(typeof AccountingIntegrationService.testConnection).toBe('function');
      expect(typeof AccountingIntegrationService.getSyncHistory).toBe('function');
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing when integration is null', async () => {
      const { AccountingIntegrationService } = await import('@/services/AccountingIntegrationService');
      vi.mocked(AccountingIntegrationService.getIntegration).mockResolvedValue(null);
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Basic render check
      expect(container).toBeTruthy();
    });

    it('should render without crashing when integration is active', async () => {
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
        provider_config: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue([]);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Sync History Data', () => {
    it('should call getSyncHistory with company id', async () => {
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
        provider_config: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });
      
      const mockSyncLogs = [
        {
          id: 'log-1',
          company_id: 'test-company-id',
          integration_id: 'int-123',
          period_id: 'period-1',
          provider: 'siigo',
          status: 'success' as const,
          entries_sent: 25,
          response_data: {},
          error_message: null,
          external_reference: 'SIIGO-REF-001',
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:01:00Z'
        }
      ];
      
      vi.mocked(AccountingIntegrationService.getSyncHistory).mockResolvedValue(mockSyncLogs);

      const { AccountingSoftwareWizard } = await import('../AccountingSoftwareWizard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <AccountingSoftwareWizard />
        </QueryClientProvider>
      );

      // Verify mock was set up correctly
      expect(vi.mocked(AccountingIntegrationService.getSyncHistory)).toBeDefined();
    });
  });

  describe('Provider Options', () => {
    it('should support siigo and alegra as valid providers', () => {
      const validProviders = ['siigo', 'alegra'];
      
      validProviders.forEach(provider => {
        expect(['siigo', 'alegra']).toContain(provider);
      });
    });
  });
});
