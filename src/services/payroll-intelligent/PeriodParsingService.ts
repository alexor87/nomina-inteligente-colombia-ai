
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';

export interface PeriodTypeResult {
  type: 'semanal' | 'quincenal' | 'mensual' | 'personalizado';
  displayText: string;
  days: number;
  source: 'company_config' | 'date_analysis' | 'text_parsing' | 'fallback';
}

export class PeriodParsingService {
  // Cache para evitar múltiples consultas
  private static companySettingsCache: { [key: string]: any } = {};
  private static cacheTimestamp: { [key: string]: number } = {};
  private static CACHE_DURATION = 30000; // 30 segundos

  // Obtener configuración de periodicidad de la empresa
  static async getCompanyPeriodConfiguration(companyId: string): Promise<{
    periodicity: string;
    customDays: number;
  } | null> {
    try {
      // Verificar cache
      const now = Date.now();
      if (
        this.companySettingsCache[companyId] &&
        this.cacheTimestamp[companyId] &&
        (now - this.cacheTimestamp[companyId]) < this.CACHE_DURATION
      ) {
        console.log('📋 Usando configuración desde cache para empresa:', companyId);
        return this.companySettingsCache[companyId];
      }

      console.log('🔍 Consultando configuración de periodicidad para empresa:', companyId);
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('periodicity, custom_period_days')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.log('❌ Error consultando configuración:', error);
        return null;
      }

      const result = {
        periodicity: data.periodicity || 'mensual',
        customDays: data.custom_period_days || 30
      };

      // Guardar en cache
      this.companySettingsCache[companyId] = result;
      this.cacheTimestamp[companyId] = now;

      console.log('✅ Configuración obtenida:', result);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de empresa:', error);
      return null;
    }
  }

  // Detectar tipo de período basado en diferencia de días
  static analyzePeriodByDays(startDate: string, endDate: string): {
    type: PeriodTypeResult['type'];
    days: number;
  } {
    if (!startDate || !endDate) {
      return { type: 'mensual', days: 30 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día final

    console.log(`📅 Análisis de días: ${startDate} al ${endDate} = ${diffDays} días`);

    if (diffDays <= 7) {
      return { type: 'semanal', days: diffDays };
    } else if (diffDays >= 8 && diffDays <= 16) {
      return { type: 'quincenal', days: diffDays };
    } else if (diffDays >= 17 && diffDays <= 31) {
      return { type: 'mensual', days: diffDays };
    } else {
      return { type: 'personalizado', days: diffDays };
    }
  }

  // Extraer fechas del texto del período
  static parsePeriodText(periodText: string): {
    startDate: string | null;
    endDate: string | null;
    detectedType: PeriodTypeResult['type'] | null;
  } {
    if (!periodText) {
      return { startDate: null, endDate: null, detectedType: null };
    }

    console.log('🔤 Parseando texto de período:', periodText);

    // Mapear nombres de meses a números
    const monthMap: { [key: string]: number } = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    // Intentar formato "1 al 15 de Mayo 2025"
    const monthMatch = periodText.match(/(\d+)\s+al\s+(\d+)\s+de\s+(\w+)\s+(\d+)/i);
    if (monthMatch) {
      const [, startDay, endDay, monthName, year] = monthMatch;
      const monthNum = monthMap[monthName.toLowerCase()];
      
      if (monthNum !== undefined) {
        const startDate = new Date(parseInt(year), monthNum, parseInt(startDay));
        const endDate = new Date(parseInt(year), monthNum, parseInt(endDay));
        
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          detectedType: this.analyzePeriodByDays(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ).type
        };
      }
    }

    // Detectar patrones en el texto
    let detectedType: PeriodTypeResult['type'] | null = null;
    const lowerText = periodText.toLowerCase();

    if (lowerText.includes('seman')) {
      detectedType = 'semanal';
    } else if (lowerText.includes('quinc') || lowerText.includes('1 al 15') || lowerText.includes('16 al 30') || lowerText.includes('16 al 31')) {
      detectedType = 'quincenal';
    } else if (lowerText.includes('mes') || lowerText.includes('1 al 30') || lowerText.includes('1 al 31')) {
      detectedType = 'mensual';
    }

    return { startDate: null, endDate: null, detectedType };
  }

  // Método principal para determinar el tipo de período
  static async determinePeriodType(
    companyId: string,
    startDate?: string,
    endDate?: string,
    periodText?: string
  ): Promise<PeriodTypeResult> {
    console.log('🎯 Determinando tipo de período para empresa:', companyId);
    console.log('📊 Parámetros:', { startDate, endDate, periodText });

    // 1. Prioridad: Configuración de empresa
    const companyConfig = await this.getCompanyPeriodConfiguration(companyId);
    if (companyConfig) {
      console.log('🏢 Usando configuración de empresa:', companyConfig.periodicity);
      
      if (companyConfig.periodicity === 'personalizado') {
        return {
          type: 'personalizado',
          displayText: `Personalizado (${companyConfig.customDays} días)`,
          days: companyConfig.customDays,
          source: 'company_config'
        };
      } else {
        const typeMap: { [key: string]: PeriodTypeResult['type'] } = {
          'semanal': 'semanal',
          'quincenal': 'quincenal',
          'mensual': 'mensual'
        };
        
        const type = typeMap[companyConfig.periodicity] || 'mensual';
        const daysMap = { semanal: 7, quincenal: 15, mensual: 30 };
        
        return {
          type,
          displayText: this.getDisplayText(type, daysMap[type]),
          days: daysMap[type],
          source: 'company_config'
        };
      }
    }

    // 2. Análisis por fechas reales
    if (startDate && endDate) {
      console.log('📅 Analizando por fechas reales');
      const dateAnalysis = this.analyzePeriodByDays(startDate, endDate);
      
      return {
        type: dateAnalysis.type,
        displayText: this.getDisplayText(dateAnalysis.type, dateAnalysis.days),
        days: dateAnalysis.days,
        source: 'date_analysis'
      };
    }

    // 3. Parsing del texto del período
    if (periodText) {
      console.log('🔤 Analizando por texto del período');
      const textParsing = this.parsePeriodText(periodText);
      
      if (textParsing.startDate && textParsing.endDate) {
        const dateAnalysis = this.analyzePeriodByDays(textParsing.startDate, textParsing.endDate);
        return {
          type: dateAnalysis.type,
          displayText: this.getDisplayText(dateAnalysis.type, dateAnalysis.days),
          days: dateAnalysis.days,
          source: 'text_parsing'
        };
      }
      
      if (textParsing.detectedType) {
        const daysMap = { semanal: 7, quincenal: 15, mensual: 30, personalizado: 30 };
        return {
          type: textParsing.detectedType,
          displayText: this.getDisplayText(textParsing.detectedType, daysMap[textParsing.detectedType]),
          days: daysMap[textParsing.detectedType],
          source: 'text_parsing'
        };
      }
    }

    // 4. Fallback: mensual por defecto
    console.log('⚠️ Usando fallback: mensual');
    return {
      type: 'mensual',
      displayText: 'Mensual',
      days: 30,
      source: 'fallback'
    };
  }

  // Generar texto de visualización
  static getDisplayText(type: PeriodTypeResult['type'], days: number): string {
    switch (type) {
      case 'semanal':
        return 'Semanal';
      case 'quincenal':
        return 'Quincenal';
      case 'mensual':
        return 'Mensual';
      case 'personalizado':
        return `Personalizado (${days} días)`;
      default:
        return 'Mensual';
    }
  }

  // Limpiar cache manualmente
  static clearCache(companyId?: string) {
    if (companyId) {
      delete this.companySettingsCache[companyId];
      delete this.cacheTimestamp[companyId];
    } else {
      this.companySettingsCache = {};
      this.cacheTimestamp = {};
    }
  }
}
