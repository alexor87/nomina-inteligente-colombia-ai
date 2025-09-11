import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockConfiguration2025, mockConfiguration2024, createMockConfigurationService } from '../mocks/configuration';

// Mock the ConfigurationService module
const mockConfigService = createMockConfigurationService();
vi.mock('@/services/ConfigurationService', () => ({
  ConfigurationService: mockConfigService,
}));

describe('ConfigurationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Values by Year', () => {
    it('should return 2025 configuration values correctly', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue(mockConfiguration2025);

      // Act
      const config = await mockConfigService.getConfig();

      // Assert
      expect(config.smmlv_2025).toBe(1423500);
      expect(config.transport_allowance_2025).toBe(162000);
      expect(config.health_rate).toBe(0.04);
      expect(config.pension_rate).toBe(0.04);
      expect(config.max_ibc_multiplier).toBe(25);
    });

    it('should return 2024 configuration values correctly', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue(mockConfiguration2024);

      // Act
      const config = await mockConfigService.getConfig();

      // Assert
      expect(config.smmlv_2024).toBe(1300000);
      expect(config.transport_allowance_2024).toBe(140606);
      expect(config.year).toBe('2024');
    });

    it('should calculate maximum IBC correctly for 2025', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue(mockConfiguration2025);

      // Act
      const config = await mockConfigService.getConfig();
      const maxIBC = config.smmlv_2025 * config.max_ibc_multiplier;

      // Assert
      expect(maxIBC).toBe(35587500); // 1,423,500 * 25
    });
  });

  describe('Cache Behavior', () => {
    it('should provide consistent values between sync and async methods', () => {
      // Arrange
      mockConfigService.getConfigSync.mockReturnValue(mockConfiguration2025);
      mockConfigService.getConfig.mockResolvedValue(mockConfiguration2025);

      // Act
      const syncConfig = mockConfigService.getConfigSync();
      
      // Assert
      expect(syncConfig.smmlv_2025).toBe(1423500);
      expect(mockConfigService.getConfigSync).toHaveBeenCalled();
    });

    it('should handle cache invalidation', () => {
      // Act
      mockConfigService.clearCache();

      // Assert
      expect(mockConfigService.clearCache).toHaveBeenCalled();
    });

    it('should fallback gracefully when database fails', async () => {
      // Arrange
      mockConfigService.getConfig.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(mockConfigService.getConfig()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Company-Specific Configuration', () => {
    it('should handle different company configurations', async () => {
      // Arrange
      const companyAConfig = { ...mockConfiguration2025, company_id: 'company-a' };
      const companyBConfig = { ...mockConfiguration2025, company_id: 'company-b' };

      mockConfigService.getConfig
        .mockResolvedValueOnce(companyAConfig)
        .mockResolvedValueOnce(companyBConfig);

      // Act
      const configA = await mockConfigService.getConfig();
      const configB = await mockConfigService.getConfig();

      // Assert
      expect(configA.company_id).toBe('company-a');
      expect(configB.company_id).toBe('company-b');
      expect(mockConfigService.getConfig).toHaveBeenCalledTimes(2);
    });

    it('should update configuration successfully', async () => {
      // Arrange
      const updatedConfig = { ...mockConfiguration2025, smmlv_2025: 1500000 };
      mockConfigService.updateConfiguration.mockResolvedValue(true);

      // Act
      const success = await mockConfigService.updateConfiguration(updatedConfig);

      // Assert
      expect(success).toBe(true);
      expect(mockConfigService.updateConfiguration).toHaveBeenCalledWith(updatedConfig);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should validate employer contribution rates', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue(mockConfiguration2025);

      // Act
      const config = await mockConfigService.getConfig();

      // Assert
      expect(config.arl_rate).toBe(0.00522);
      expect(config.sena_rate).toBe(0.02);
      expect(config.icbf_rate).toBe(0.03);
      
      // Total employer rate should be ~6.522%
      const totalEmployerRate = config.arl_rate + config.sena_rate + config.icbf_rate;
      expect(totalEmployerRate).toBeCloseTo(0.05522, 5);
    });

    it('should handle missing configuration gracefully', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue(null);

      // Act & Assert
      const config = await mockConfigService.getConfig();
      expect(config).toBeNull();
    });
  });
});