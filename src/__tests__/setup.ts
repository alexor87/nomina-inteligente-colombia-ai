import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock ConfigurationService
vi.mock('@/services/ConfigurationService', () => ({
  ConfigurationService: {
    getConfigSync: vi.fn(() => ({
      smmlv_2025: 1423500,
      transport_allowance_2025: 162000,
      health_rate: 0.04,
      pension_rate: 0.04,
      max_ibc_multiplier: 25,
    })),
    getConfig: vi.fn().mockResolvedValue({
      smmlv_2025: 1423500,
      transport_allowance_2025: 162000,
      health_rate: 0.04,
      pension_rate: 0.04,
      max_ibc_multiplier: 25,
    }),
  },
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));