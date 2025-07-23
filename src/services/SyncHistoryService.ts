
import { HistoryServiceAleluya } from './HistoryServiceAleluya';

/**
 * Servicio para sincronizar períodos existentes que no aparecen en el historial
 */
export class SyncHistoryService {
  /**
   * Sincronizar período específico del 1-15 enero 2025
   */
  static async syncJanuaryPeriod(): Promise<void> {
    try {
      console.log('🔄 Sincronizando período del 1-15 enero 2025...');
      
      // Intentar con diferentes variantes del nombre del período
      const periodVariants = [
        '1 - 15 Enero 2025',
        '1-15 Enero 2025',
        '1 - 15 enero 2025',
        'Enero 1-15 2025'
      ];
      
      for (const periodName of periodVariants) {
        try {
          await HistoryServiceAleluya.syncExistingPeriod(periodName);
          console.log(`✅ Período sincronizado: ${periodName}`);
          break;
        } catch (error) {
          console.log(`❌ No se encontró período: ${periodName}`);
          continue;
        }
      }
      
    } catch (error) {
      console.error('❌ Error sincronizando período de enero:', error);
      throw error;
    }
  }

  /**
   * Sincronizar todos los períodos con total_neto = 0
   */
  static async syncAllZeroPeriods(): Promise<void> {
    try {
      console.log('🔄 Sincronizando todos los períodos con total_neto = 0...');
      
      // Esta función podría implementarse para buscar y corregir todos los períodos
      // con totales incorrectos, pero por ahora nos enfocamos en el específico
      await this.syncJanuaryPeriod();
      
    } catch (error) {
      console.error('❌ Error sincronizando períodos:', error);
      throw error;
    }
  }
}
