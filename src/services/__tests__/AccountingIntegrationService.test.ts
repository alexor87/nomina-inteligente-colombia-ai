import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountingIntegrationService } from '../AccountingIntegrationService';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  functions: {
    invoke: vi.fn()
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('AccountingIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIntegration', () => {
    it('should return null when no integration exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const result = await AccountingIntegrationService.getIntegration('company-123');
      expect(result).toBeNull();
    });

    it('should return integration data when it exists', async () => {
      const mockIntegration = {
        id: 'int-123',
        company_id: 'company-123',
        provider: 'siigo',
        is_active: true,
        auto_sync: false
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockIntegration, error: null })
          })
        })
      });

      const result = await AccountingIntegrationService.getIntegration('company-123');
      expect(result).toEqual(mockIntegration);
    });

    it('should return null on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
          })
        })
      });

      const result = await AccountingIntegrationService.getIntegration('company-123');
      expect(result).toBeNull();
    });
  });

  describe('saveIntegration', () => {
    it('should create new integration when none exists', async () => {
      // Mock getIntegration returning null
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      // Mock insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'siigo', true);
      expect(result.success).toBe(true);
    });

    it('should update existing integration', async () => {
      const existingIntegration = {
        id: 'int-123',
        company_id: 'company-123',
        provider: 'siigo'
      };

      // Mock getIntegration returning existing
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingIntegration, error: null })
          })
        })
      });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'alegra', false);
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
      });

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'siigo');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('activateIntegration', () => {
    it('should activate integration successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await AccountingIntegrationService.activateIntegration('company-123');
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
        })
      });

      const result = await AccountingIntegrationService.activateIntegration('company-123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deactivateIntegration', () => {
    it('should deactivate and clear credentials', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await AccountingIntegrationService.deactivateIntegration('company-123');
      expect(result.success).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, message: 'Conexión exitosa' },
        error: null
      });

      const result = await AccountingIntegrationService.testConnection('siigo', {
        api_key: 'test-key',
        username: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Conexión exitosa');
    });

    it('should return error message on failure', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'API error' }
      });

      const result = await AccountingIntegrationService.testConnection('siigo', {
        api_key: 'invalid-key',
        username: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error de conexión');
    });
  });

  describe('syncPeriod', () => {
    it('should sync period successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, entries_sent: 15, reference: 'SYNC-123' },
        error: null
      });

      const result = await AccountingIntegrationService.syncPeriod('company-123', 'period-456');
      expect(result.success).toBe(true);
      expect(result.entries_sent).toBe(15);
      expect(result.reference).toBe('SYNC-123');
    });

    it('should return error on sync failure', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Sync failed' }
      });

      const result = await AccountingIntegrationService.syncPeriod('company-123', 'period-456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync failed');
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync logs ordered by date', async () => {
      const mockLogs = [
        { id: 'log-1', created_at: '2024-01-02', status: 'success' },
        { id: 'log-2', created_at: '2024-01-01', status: 'error' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null })
            })
          })
        })
      });

      const result = await AccountingIntegrationService.getSyncHistory('company-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('log-1');
    });

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
            })
          })
        })
      });

      const result = await AccountingIntegrationService.getSyncHistory('company-123');
      expect(result).toEqual([]);
    });
  });

  describe('isAutoSyncEnabled', () => {
    it('should return true when active and auto_sync enabled', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: true, auto_sync: true },
              error: null
            })
          })
        })
      });

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(true);
    });

    it('should return false when not active', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: false, auto_sync: true },
              error: null
            })
          })
        })
      });

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });

    it('should return false when auto_sync disabled', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: true, auto_sync: false },
              error: null
            })
          })
        })
      });

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });

    it('should return false when no integration exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });
  });
});
