import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountingIntegrationService } from '../AccountingIntegrationService';

// Mock Supabase client with hoisted factory
vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn();
  const mockFunctionsInvoke = vi.fn();
  
  return {
    supabase: {
      from: mockFrom,
      functions: {
        invoke: mockFunctionsInvoke
      }
    },
    __mockFrom: mockFrom,
    __mockFunctionsInvoke: mockFunctionsInvoke
  };
});

// Import mock references after mock setup
import { supabase } from '@/integrations/supabase/client';

describe('AccountingIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIntegration', () => {
    it('should return null when no integration exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      } as any);

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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockIntegration, error: null })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.getIntegration('company-123');
      expect(result).toEqual(mockIntegration);
    });

    it('should return null on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.getIntegration('company-123');
      expect(result).toBeNull();
    });
  });

  describe('saveIntegration', () => {
    it('should create new integration when none exists', async () => {
      // First call: getIntegration returns null
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        } as any)
        // Second call: insert
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any);

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'siigo', true);
      expect(result.success).toBe(true);
    });

    it('should update existing integration', async () => {
      const existingIntegration = {
        id: 'int-123',
        company_id: 'company-123',
        provider: 'siigo'
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingIntegration, error: null })
            })
          })
        } as any)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        } as any);

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'alegra', false);
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        } as any)
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
        } as any);

      const result = await AccountingIntegrationService.saveIntegration('company-123', 'siigo');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('activateIntegration', () => {
    it('should activate integration successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const result = await AccountingIntegrationService.activateIntegration('company-123');
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
        })
      } as any);

      const result = await AccountingIntegrationService.activateIntegration('company-123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deactivateIntegration', () => {
    it('should deactivate and clear credentials', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const result = await AccountingIntegrationService.deactivateIntegration('company-123');
      expect(result.success).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
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
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'API error' }
      } as any);

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
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, entries_sent: 15, reference: 'SYNC-123' },
        error: null
      });

      const result = await AccountingIntegrationService.syncPeriod('company-123', 'period-456');
      expect(result.success).toBe(true);
      expect(result.entries_sent).toBe(15);
      expect(result.reference).toBe('SYNC-123');
    });

    it('should return error on sync failure', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Sync failed' }
      } as any);

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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null })
            })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.getSyncHistory('company-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('log-1');
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
            })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.getSyncHistory('company-123');
      expect(result).toEqual([]);
    });
  });

  describe('isAutoSyncEnabled', () => {
    it('should return true when active and auto_sync enabled', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: true, auto_sync: true },
              error: null
            })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(true);
    });

    it('should return false when not active', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: false, auto_sync: true },
              error: null
            })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });

    it('should return false when auto_sync disabled', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: true, auto_sync: false },
              error: null
            })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });

    it('should return false when no integration exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      } as any);

      const result = await AccountingIntegrationService.isAutoSyncEnabled('company-123');
      expect(result).toBe(false);
    });
  });
});
