import { vi } from 'vitest';

export const mockConfiguration2025 = {
  smmlv_2025: 1423500,
  transport_allowance_2025: 162000,
  health_rate: 0.04,
  pension_rate: 0.04,
  max_ibc_multiplier: 25,
  arl_rate: 0.00522,
  sena_rate: 0.02,
  icbf_rate: 0.03,
  company_id: 'test-company',
  year: '2025',
};

export const mockConfiguration2024 = {
  smmlv_2024: 1300000,
  transport_allowance_2024: 140606,
  health_rate: 0.04,
  pension_rate: 0.04,
  max_ibc_multiplier: 25,
  arl_rate: 0.00522,
  sena_rate: 0.02,
  icbf_rate: 0.03,
  company_id: 'test-company',
  year: '2024',
};

export const createMockConfigurationService = () => ({
  getConfigSync: vi.fn(() => mockConfiguration2025),
  getConfig: vi.fn().mockResolvedValue(mockConfiguration2025),
  updateConfiguration: vi.fn().mockResolvedValue(true),
  clearCache: vi.fn(),
});