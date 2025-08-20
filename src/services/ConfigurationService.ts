import { supabase } from '@/integrations/supabase/client';
import { CompanyConfigurationService } from './CompanyConfigurationService';

// Cache for synchronous access
let configCache: Map<string, PayrollConfiguration> = new Map();
let availableYearsCache: string[] = ['2025', '2024'];
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface PayrollConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  porcentajes: {
    saludEmpleado: number;
    pensionEmpleado: number;
    saludEmpleador: number;
    pensionEmpleador: number;
    arl: number;
    cajaCompensacion: number;
    icbf: number;
    sena: number;
    cesantias: number;
    interesesCesantias: number;
    prima: number;
    vacaciones: number;
  };
  fondoSolidaridad: {
    ranges: Array<{
      minSMMLV: number;
      maxSMMLV: number;
      percentage: number;
    }>;
  };
  arlRiskLevels: {
    I: number;
    II: number;
    III: number;
    IV: number;
    V: number;
  };
}

export interface YearlyConfiguration {
  [year: string]: PayrollConfiguration;
}

interface DBPayrollConfiguration {
  id: string;
  company_id: string;
  year: string;
  salary_min: number;
  transport_allowance: number;
  uvt: number;
  percentages: any;
  fondo_solidaridad: any;
  arl_risk_levels: any;
}

export class ConfigurationService {
  private static cache: Map<string, PayrollConfiguration> = new Map();
  private static cacheTimestamps: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // SYNC METHODS (for existing code compatibility)
  static getConfiguration(year: string = '2025'): PayrollConfiguration {
    return this.getConfigurationSync(year);
  }

  static getAvailableYears(): string[] {
    return this.getAvailableYearsSync();
  }

  static getConfigurationSync(year: string = '2025'): PayrollConfiguration {
    // Try to get from cache first
    try {
      const companyId = 'default'; // Use fallback for sync access
      const cacheKey = `${companyId}-${year}`;
      const cached = configCache.get(cacheKey);
      if (cached) return cached;
    } catch (error) {
      // Ignore errors in sync method
    }

    // Initialize cache in background if not already done
    this.initializeCache().catch(console.error);

    // Return fallback immediately
    return this.getFallbackConfig(year);
  }

  static getAvailableYearsSync(): string[] {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_DURATION && availableYearsCache.length > 0) {
      return availableYearsCache;
    }

    // Initialize cache in background
    this.initializeCache().catch(console.error);

    return ['2025', '2024'];
  }

  // ASYNC METHODS (for new database-driven functionality)
  static async getConfigurationAsync(year: string = '2025'): Promise<PayrollConfiguration> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      const cacheKey = `${companyId}-${year}`;
      const cached = this.cache.get(cacheKey);
      const cacheTime = this.cacheTimestamps.get(cacheKey);
      
      // Return cached if fresh
      if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_DURATION) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('company_payroll_configurations')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading configuration:', error);
        throw new Error('Error cargando configuración');
      }

      let config: PayrollConfiguration;
      
      if (data) {
        config = this.transformDBToConfig(data);
      } else {
        // Create default configuration
        config = await this.createDefaultConfiguration(companyId, year);
      }

      // Cache the result
      this.cache.set(cacheKey, config);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return config;
    } catch (error) {
      console.error('Error in getConfiguration:', error);
      // Return fallback defaults
      return this.getFallbackConfig(year);
    }
  }

  static async getAvailableYearsAsync(): Promise<string[]> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        return ['2025', '2024'];
      }

      const { data, error } = await supabase
        .from('company_payroll_configurations')
        .select('year')
        .eq('company_id', companyId)
        .order('year', { ascending: false });

      if (error) {
        console.error('Error loading available years:', error);
        return ['2025', '2024'];
      }

      const years = data?.map(d => d.year) || [];
      
      // Ensure at least 2025 and 2024 exist
      if (!years.includes('2025')) years.unshift('2025');
      if (!years.includes('2024')) years.push('2024');

      return years.sort((a, b) => parseInt(b) - parseInt(a));
    } catch (error) {
      console.error('Error getting available years:', error);
      return ['2025', '2024'];
    }
  }

  static async updateYearConfiguration(year: string, config: PayrollConfiguration): Promise<void> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      const dbConfig = this.transformConfigToDB(config);
      
      const { error } = await supabase
        .from('company_payroll_configurations')
        .upsert({
          company_id: companyId,
          year,
          ...dbConfig
        });

      if (error) {
        console.error('Error saving configuration:', error);
        throw new Error('No se pudo guardar la configuración');
      }

      // Clear cache
      const cacheKey = `${companyId}-${year}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  static async createNewYear(year: string): Promise<PayrollConfiguration> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Check if year already exists
      const { data: existing } = await supabase
        .from('company_payroll_configurations')
        .select('id')
        .eq('company_id', companyId)
        .eq('year', year)
        .single();

      if (existing) {
        throw new Error(`El año ${year} ya existe`);
      }

      return await this.createDefaultConfiguration(companyId, year);
    } catch (error) {
      console.error('Error creating new year:', error);
      throw error;
    }
  }

  static async deleteYear(year: string): Promise<void> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      const availableYears = await this.getAvailableYearsAsync();
      if (availableYears.length <= 1) {
        throw new Error('No se puede eliminar el último año configurado');
      }

      const { error } = await supabase
        .from('company_payroll_configurations')
        .delete()
        .eq('company_id', companyId)
        .eq('year', year);

      if (error) {
        console.error('Error deleting year:', error);
        throw new Error('No se pudo eliminar la configuración del año');
      }

      // Clear cache
      const cacheKey = `${companyId}-${year}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    } catch (error) {
      console.error('Error deleting year:', error);
      throw error;
    }
  }

  // Background cache initialization
  private static initializationPromise: Promise<void> | null = null;

  private static async initializeCache(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeCache();
    return this.initializationPromise;
  }

  private static async _initializeCache(): Promise<void> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) return;

      // Load configurations directly from database to avoid circular dependency
      const { data: configs, error } = await supabase
        .from('company_payroll_configurations')
        .select('*')
        .eq('company_id', companyId);

      if (!error && configs) {
        configs.forEach(config => {
          const key = `${companyId}-${config.year}`;
          configCache.set(key, this.transformDBToConfig(config));
        });
      }

      // Update global cache
      availableYearsCache = configs?.map(c => c.year)?.sort((a, b) => parseInt(b) - parseInt(a)) || ['2025', '2024'];
      lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Error initializing cache:', error);
    }
  }

  // Helper methods
  private static async createDefaultConfiguration(companyId: string, year: string): Promise<PayrollConfiguration> {
    const defaultConfig = this.getFallbackConfig(year);
    const dbConfig = this.transformConfigToDB(defaultConfig);

    const { error } = await supabase
      .from('company_payroll_configurations')
      .insert({
        company_id: companyId,
        year,
        ...dbConfig
      });

    if (error) {
      console.error('Error creating default configuration:', error);
      throw new Error('No se pudo crear la configuración por defecto');
    }

    return defaultConfig;
  }

  private static transformDBToConfig(data: DBPayrollConfiguration): PayrollConfiguration {
    return {
      salarioMinimo: data.salary_min,
      auxilioTransporte: data.transport_allowance,
      uvt: data.uvt,
      porcentajes: data.percentages,
      fondoSolidaridad: data.fondo_solidaridad,
      arlRiskLevels: data.arl_risk_levels
    };
  }

  private static transformConfigToDB(config: PayrollConfiguration) {
    return {
      salary_min: config.salarioMinimo,
      transport_allowance: config.auxilioTransporte,
      uvt: config.uvt,
      percentages: config.porcentajes,
      fondo_solidaridad: config.fondoSolidaridad,
      arl_risk_levels: config.arlRiskLevels
    };
  }

  private static getFallbackConfig(year: string): PayrollConfiguration {
    const is2024 = year === '2024';
    return {
      salarioMinimo: is2024 ? 1300000 : 1423500,
      auxilioTransporte: is2024 ? 162000 : 200000,
      uvt: is2024 ? 47065 : 49799,
      porcentajes: {
        saludEmpleado: 0.04,
        pensionEmpleado: 0.04,
        saludEmpleador: 0.085,
        pensionEmpleador: 0.12,
        arl: 0.00522,
        cajaCompensacion: 0.04,
        icbf: 0.03,
        sena: 0.02,
        cesantias: 0.0833,
        interesesCesantias: 0.12,
        prima: 0.0833,
        vacaciones: 0.0417,
      },
      fondoSolidaridad: {
        ranges: [
          { minSMMLV: 4, maxSMMLV: 16, percentage: 1 },
          { minSMMLV: 16, maxSMMLV: 17, percentage: 1.2 },
          { minSMMLV: 17, maxSMMLV: 18, percentage: 1.4 },
          { minSMMLV: 18, maxSMMLV: 19, percentage: 1.6 },
          { minSMMLV: 19, maxSMMLV: 20, percentage: 1.8 },
          { minSMMLV: 20, maxSMMLV: null, percentage: 2 }
        ]
      },
      arlRiskLevels: {
        I: 0.348,
        II: 0.435,
        III: 0.783,
        IV: 1.740,
        V: 3.219,
      }
    };
  }

  // Legacy compatibility methods
  static async updateConfiguration(config: PayrollConfiguration): Promise<void> {
    return this.updateYearConfiguration('2025', config);
  }

  static invalidateCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}