// ============================================================================
// MAYA Intent Detector - Professional Architecture
// ============================================================================

import { Intent, IntentType, ExtractedEntity, RichContext } from './types.ts';

export class IntentDetector {
  
  static async detectIntent(userMessage: string, context?: RichContext, openaiKey?: string): Promise<Intent> {
    const message = userMessage.toLowerCase().trim();
    
    // 1. Quick Pattern Matching (Performance First)
    const quickIntent = this.detectByPatterns(message);
    if (quickIntent.confidence > 0.8) {
      return quickIntent;
    }
    
    // 2. AI-Enhanced Detection for Complex Cases
    if (openaiKey && quickIntent.confidence < 0.6) {
      return await this.detectWithAI(userMessage, context, openaiKey);
    }
    
    return quickIntent;
  }
  
  private static detectByPatterns(message: string): Intent {
    const patterns = [
      // Voucher Patterns
      {
        patterns: [
          /(?:envía|envia|manda|remite|despacha|genera).+(?:desprendible|colilla|volante|recibo|voucher)/i,
          /(?:desprendible|colilla|volante|recibo|voucher).+(?:de|para)/i,
          /(?:envío|envio|mandar|generar).+(?:nómina|nomina|pago|sueldo)/i
        ],
        type: 'VOUCHER_SEND' as IntentType,
        confidence: 0.9
      },
      
      // Mass Send Patterns
      {
        patterns: [
          /(?:envía|envia|manda|despacha).+(?:todos|todas|masivo|general)/i,
          /(?:desprendibles|colillas|vouchers).+(?:todos|empleados|general)/i,
          /(?:todas las|todos los).+(?:colillas|desprendibles)/i
        ],
        type: 'VOUCHER_MASS_SEND' as IntentType,
        confidence: 0.95
      },
      
      // Employee Search
      {
        patterns: [
          /(?:busca|encuentra|muestra|lista).+(?:empleado|trabajador|colaborador)/i,
          /(?:empleado|trabajador).+(?:llamado|de nombre|que se llama)/i,
          /(?:quién|quien|cuál|cual).+(?:empleado|trabajador)/i
        ],
        type: 'EMPLOYEE_SEARCH' as IntentType,
        confidence: 0.85
      },
      
      // Employee CRUD
      {
        patterns: [
          /(?:crear|agregar|registrar|añadir).+(?:empleado|trabajador|colaborador)/i,
          /(?:nuevo|nueva).+(?:empleado|trabajador|colaborador)/i
        ],
        type: 'EMPLOYEE_CREATE' as IntentType,
        confidence: 0.9
      },
      
      {
        patterns: [
          /(?:actualizar|modificar|cambiar|editar).+(?:empleado|trabajador|datos)/i,
          /(?:cambio|modificación).+(?:información|datos|salario)/i
        ],
        type: 'EMPLOYEE_UPDATE' as IntentType,
        confidence: 0.85
      },
      
      // Payroll Operations
      {
        patterns: [
          /(?:liquidar|procesar|calcular).+(?:nómina|nomina|pago)/i,
          /(?:nómina|nomina).+(?:del mes|periodo|liquidación)/i,
          /(?:correr|ejecutar).+(?:nómina|nomina)/i
        ],
        type: 'PAYROLL_LIQUIDATE' as IntentType,
        confidence: 0.9
      },
      
      // Vacation/Absence Registration
      {
        patterns: [
          /(?:registrar|crear|agregar).+(?:vacaciones|descanso)/i,
          /(?:vacaciones|descanso).+(?:de|para)/i,
          /(?:solicitud|solicitar).+(?:vacaciones)/i
        ],
        type: 'VACATION_REGISTER' as IntentType,
        confidence: 0.85
      },
      
      {
        patterns: [
          /(?:registrar|marcar|agregar).+(?:ausencia|falta|incapacidad)/i,
          /(?:ausencia|falta|incapacidad).+(?:de|del|para)/i,
          /(?:no vino|no asistió|no trabajó)/i
        ],
        type: 'ABSENCE_REGISTER' as IntentType,
        confidence: 0.85
      },
      
      // Report Generation
      {
        patterns: [
          /(?:generar|crear|hacer|exportar).+(?:reporte|informe|excel)/i,
          /(?:reporte|informe).+(?:de|del|para)/i,
          /(?:descargar|exportar).+(?:datos|información|listado)/i
        ],
        type: 'REPORT_GENERATE' as IntentType,
        confidence: 0.8
      },

      // Database Query Patterns - WOW Experience
      {
        patterns: [
          /(?:cuánto|cuanto).+(?:gastamos|gastó|costo|costó|pagamos|pagó)/i,
          /(?:total|suma).+(?:nómina|nomina|sueldos|salarios|pagos)/i,
          /(?:cuál|cual).+(?:gasto|costo|total|suma)/i,
          /(?:mostrar|ver|dame).+(?:datos|información|números)/i
        ],
        type: 'DATA_QUERY' as IntentType,
        confidence: 0.9
      },

      // Analytics Patterns 
      {
        patterns: [
          /(?:analizar|análisis|estadísticas|métricas)/i,
          /(?:tendencia|evolución|comportamiento)/i,
          /(?:promedio|media|máximo|mínimo)/i,
          /(?:comparar|comparación|versus|vs)/i,
          /(?:ranking|top|mejor|peor|mayor|menor)/i
        ],
        type: 'ANALYTICS_REQUEST' as IntentType,
        confidence: 0.85
      },

      // Insights Patterns
      {
        patterns: [
          /(?:insights|perspectivas|conclusiones)/i,
          /(?:qué|que).+(?:significa|indica|muestra|refleja)/i,
          /(?:por qué|porque).+(?:subió|bajó|aumentó|disminuyó)/i,
          /(?:cómo|como).+(?:ha cambiado|evolucionado)/i
        ],
        type: 'REPORT_INSIGHTS' as IntentType,
        confidence: 0.8
      },

      // Comparison Patterns
      {
        patterns: [
          /(?:comparar|comparación).+(?:con|versus|vs)/i,
          /(?:diferencia|diferencias).+(?:entre|del|de)/i,
          /(?:este mes|año).+(?:anterior|pasado|previo)/i,
          /(?:antes|después).+(?:de|del)/i,
          /(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre).+(?:vs|versus|comparado)/i
        ],
        type: 'COMPARISON_ANALYSIS' as IntentType,
        confidence: 0.9
      }
    ];
    
    for (const patternGroup of patterns) {
      for (const pattern of patternGroup.patterns) {
        if (pattern.test(message)) {
          return {
            type: patternGroup.type,
            confidence: patternGroup.confidence,
            parameters: {},
            requiresConfirmation: this.requiresConfirmation(patternGroup.type),
            entities: this.extractEntities(message, patternGroup.type)
          };
        }
      }
    }
    
    // Default to conversation if no patterns match
    return {
      type: 'CONVERSATION',
      confidence: 0.5,
      parameters: {},
      requiresConfirmation: false,
      entities: []
    };
  }
  
  private static async detectWithAI(userMessage: string, context?: RichContext, openaiKey?: string): Promise<Intent> {
    const prompt = `Analiza el siguiente mensaje de un usuario del sistema de nómina colombiano y determina su INTENCIÓN PRINCIPAL:

MENSAJE: "${userMessage}"

CONTEXTO: ${context ? JSON.stringify(context) : 'No disponible'}

INTENCIONES POSIBLES:
- VOUCHER_SEND: Enviar desprendible a empleado específico
- VOUCHER_MASS_SEND: Enviar desprendibles a todos los empleados
- EMPLOYEE_SEARCH: Buscar información de empleado(s)
- EMPLOYEE_CREATE: Crear nuevo empleado
- EMPLOYEE_UPDATE: Actualizar datos de empleado
- EMPLOYEE_DELETE: Eliminar empleado
- PAYROLL_LIQUIDATE: Liquidar nómina
- VACATION_REGISTER: Registrar vacaciones
- ABSENCE_REGISTER: Registrar ausencia/incapacidad
- REPORT_GENERATE: Generar reportes
- DATA_QUERY: Consultar datos empresariales
- ANALYTICS_REQUEST: Solicitar análisis y métricas
- REPORT_INSIGHTS: Obtener insights de datos
- COMPARISON_ANALYSIS: Análisis comparativo
- CONVERSATION: Conversación general

Responde SOLO en formato JSON:
{
  "type": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "entities": [{"type": "employee|period|amount|date", "value": "valor", "confidence": 0.0-1.0}]
}`;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.1
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Clean markdown formatting from AI response before parsing
        let content = data.choices[0].message.content.trim();
        if (content.includes('```json')) {
          content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        }
        if (content.includes('```')) {
          content = content.replace(/```/g, '');
        }
        const result = JSON.parse(content);
        
        return {
          type: result.type as IntentType,
          confidence: result.confidence,
          parameters: {},
          requiresConfirmation: this.requiresConfirmation(result.type),
          entities: result.entities || []
        };
      }
    } catch (error) {
      console.warn('[IntentDetector] AI detection failed:', error);
    }
    
    // Fallback to conversation
    return {
      type: 'CONVERSATION',
      confidence: 0.3,
      parameters: {},
      requiresConfirmation: false,
      entities: []
    };
  }
  
  private static extractEntities(message: string, intentType: IntentType): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Extract employee names (proper case words)
    const employeeMatches = message.match(/[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*/g);
    if (employeeMatches && (intentType === 'VOUCHER_SEND' || intentType === 'EMPLOYEE_SEARCH')) {
      employeeMatches.forEach(match => {
        entities.push({
          type: 'employee',
          value: match.trim(),
          confidence: 0.8
        });
      });
    }

    // Extract metrics and KPIs for analytics
    const metricMatches = message.match(/(?:total|promedio|máximo|mínimo|suma|cantidad|número|count)/gi);
    if (metricMatches && ['DATA_QUERY', 'ANALYTICS_REQUEST'].includes(intentType)) {
      metricMatches.forEach(match => {
        entities.push({
          type: 'metric',
          value: match.toLowerCase(),
          confidence: 0.9
        });
      });
    }

    // Extract comparison indicators
    const comparisonMatches = message.match(/(?:comparar|vs|versus|diferencia|antes|después|mayor|menor)/gi);
    if (comparisonMatches && intentType === 'COMPARISON_ANALYSIS') {
      comparisonMatches.forEach(match => {
        entities.push({
          type: 'comparison',
          value: match.toLowerCase(),
          confidence: 0.85
        });
      });
    }

    // Extract timeframes
    const timeMatches = message.match(/(?:este|el|la|del)\s+(?:mes|año|semana|día)|(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|(?:\d{4})/gi);
    if (timeMatches && ['ANALYTICS_REQUEST', 'COMPARISON_ANALYSIS', 'REPORT_INSIGHTS'].includes(intentType)) {
      timeMatches.forEach(match => {
        entities.push({
          type: 'timeframe',
          value: match.toLowerCase(),
          confidence: 0.9
        });
      });
    }
    
    // Extract periods/months
    const periodMatches = message.match(/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{1,2}\/\d{4})/gi);
    if (periodMatches) {
      periodMatches.forEach(match => {
        entities.push({
          type: 'period',
          value: match.toLowerCase(),
          confidence: 0.9
        });
      });
    }
    
    // Extract dates
    const dateMatches = message.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g);
    if (dateMatches) {
      dateMatches.forEach(match => {
        entities.push({
          type: 'date',
          value: match,
          confidence: 0.95
        });
      });
    }
    
    return entities;
  }
  
  private static requiresConfirmation(intentType: IntentType): boolean {
    const confirmationRequired = [
      'EMPLOYEE_DELETE',
      'PAYROLL_LIQUIDATE',
      'VOUCHER_MASS_SEND'
    ];
    
    return confirmationRequired.includes(intentType);
  }
}
}