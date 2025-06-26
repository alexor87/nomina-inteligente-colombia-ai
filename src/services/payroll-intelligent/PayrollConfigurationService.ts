
import { supabase } from '@/integrations/supabase/client';

export class PayrollConfigurationService {
  // Cache para evitar múltiples llamadas
  private static configCache: { [key: string]: any } = {};
  private static cacheTimestamp: { [key: string]: number } = {};
  private static CACHE_DURATION = 5000; // 5 segundos

  // Obtener configuración de empresa con refresh forzado y sin cache
  static async getCompanySettingsForceRefresh(companyId: string) {
    try {
      console.log('🔄 Forzando refresh completo de configuración para empresa:', companyId);
      
      // Invalidar cache explícitamente
      delete this.configCache[companyId];
      delete this.cacheTimestamp[companyId];
      
      // Hacer consulta directa con timestamp para evitar cache del navegador
      const timestamp = Date.now();
      console.log('⏰ Timestamp de consulta:', timestamp);
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        // Agregar un filtro dummy que siempre sea true para forzar nueva consulta
        .gte('created_at', '1970-01-01')
        .single();

      if (error) {
        console.log('❌ Error en consulta de configuración:', error);
        console.log('No company settings found, will create defaults');
        return null;
      }
      
      console.log('✅ Configuración obtenida directamente de BD:', data);
      console.log('📊 Periodicidad actual en BD:', data.periodicity);
      
      // Guardar en cache con timestamp actual
      this.configCache[companyId] = data;
      this.cacheTimestamp[companyId] = timestamp;
      
      return data;
    } catch (error) {
      console.error('❌ Error getting company configuration:', error);
      return null;
    }
  }

  // Método para invalidar cache manualmente
  static invalidateConfigurationCache(companyId?: string) {
    if (companyId) {
      delete this.configCache[companyId];
      delete this.cacheTimestamp[companyId];
      console.log('🗑️ Cache invalidado para empresa:', companyId);
    } else {
      this.configCache = {};
      this.cacheTimestamp = {};
      console.log('🗑️ Cache completo invalidado');
    }
  }

  // Forzar refresh completo de configuración
  static async forceRefreshConfiguration(companyId: string) {
    console.log('🔄 Forzando refresh total de configuración...');
    
    // Invalidar cache
    this.invalidateConfigurationCache(companyId);
    
    // Obtener configuración fresca
    return await this.getCompanySettingsForceRefresh(companyId);
  }
}
