// ============================================================================
// LLM Query Classifier - Professional Hybrid Architecture with OpenAI
// ============================================================================
// Uses gpt-5-mini with Tool Calling for guaranteed structured output
// Handles temporal follow-ups, employee follow-ups, and complex queries

import "https://deno.land/x/xhr@0.1.0/mod.ts";

export enum LLMQueryType {
  EXPLANATION = "EXPLANATION",
  TEMPORAL_FOLLOWUP = "TEMPORAL_FOLLOWUP",
  EMPLOYEE_FOLLOWUP = "EMPLOYEE_FOLLOWUP",
  AGGREGATION = "AGGREGATION",
  DIRECT_INTENT = "DIRECT_INTENT"
}

export interface ExtractedContext {
  // Explanation context
  concept?: string;
  
  // Temporal context
  temporalModifier?: "LAST_YEAR" | "THIS_YEAR" | "SPECIFIC_MONTH" | "QUARTER" | "SEMESTER" | "LAST_MONTH" | "FULL_YEAR";
  year?: number;
  month?: string;
  quarter?: number;
  semester?: number;
  
  // Employee context
  employeeName?: string;
  
  // Aggregation context
  metric?: string;
}

export interface LLMClassification {
  queryType: LLMQueryType;
  confidence: number;
  extractedContext: ExtractedContext;
  reasoning?: string;
  toolCall?: any; // Tool call from OpenAI if calculation was requested
}

export class LLMQueryClassifier {
  private static openaiKey: string | null = null;
  
  static initialize(apiKey: string) {
    this.openaiKey = apiKey;
  }
  
  /**
   * Classify a query using OpenAI with tool calling for structured output
   */
  static async classify(
    query: string,
    conversationHistory: any[]
  ): Promise<LLMClassification> {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not initialized');
    }
    
    // Extract last context for reference
    const lastContext = this.extractLastContext(conversationHistory);
    
    // Build system prompt with classification instructions
    const systemPrompt = `Eres un clasificador experto de queries de nómina colombiana.

Tu tarea es clasificar queries de usuarios en 5 categorías:
1. **EXPLANATION**: Preguntas teóricas sobre legislación, conceptos o procedimientos (ej: "cómo se liquidan horas extras", "qué es prima de servicios", "explícame las cesantías")
2. **TEMPORAL_FOLLOWUP**: Follow-up temporal (ej: "y el año pasado?", "y este año?", "y en diciembre?")
3. **EMPLOYEE_FOLLOWUP**: Follow-up de empleado (ej: "y a María?", "y Juan?", "y para Carlos?")
4. **AGGREGATION**: Query de agregación sin follow-up (ej: "cuántos empleados hay?", "total de salarios")
5. **DIRECT_INTENT**: Intent directo (ej: "liquidar nómina", "enviar voucher")

**PRIORIDADES ESTRICTAS:**
- EXPLANATION > TEMPORAL_FOLLOWUP > EMPLOYEE_FOLLOWUP > AGGREGATION > DIRECT_INTENT

**Contexto de conversación previa:**
${lastContext ? `Última consulta fue sobre: ${lastContext.summary}` : 'No hay contexto previo'}

**Reglas críticas para EXPLANATION:**
- "cómo se liquida(n)..." → EXPLANATION
- "qué es..." → EXPLANATION
- "explícame..." → EXPLANATION
- "cuáles son los pasos para..." → EXPLANATION
- "cómo funciona..." → EXPLANATION
- "cómo se calcula(n)..." → EXPLANATION
- "qué porcentaje..." → EXPLANATION (si no menciona empleado específico)
- "cuánto es el salario mínimo" → EXPLANATION
- Preguntas sobre teoría/legislación sin mencionar datos específicos → EXPLANATION

**Reglas para otras categorías:**
- "y el año pasado?" → TEMPORAL_FOLLOWUP (LAST_YEAR)
- "y este año?" → TEMPORAL_FOLLOWUP (THIS_YEAR)
- "y en enero?" → TEMPORAL_FOLLOWUP (SPECIFIC_MONTH: enero)
- "y los últimos 3 meses?" → TEMPORAL_FOLLOWUP (LAST_N_MONTHS: 3)
- "y los últimos 6 meses?" → TEMPORAL_FOLLOWUP (LAST_N_MONTHS: 6)
- "y a María?" → EMPLOYEE_FOLLOWUP
- "cuántos empleados?" → AGGREGATION (sin follow-up)
- "liquidar nómina" → DIRECT_INTENT

**Extracción de parámetros:**
- Para EXPLANATION: extraer concepto/tema (horas extras, prima, cesantías, etc.)
- Para temporales: extraer year, month, quarter, semester, monthCount (para "últimos N meses")
- Para empleados: extraer nombre completo
- Para agregaciones: extraer métrica (salario, incapacidad, etc.)`;

    const userPrompt = `Query del usuario: "${query}"

Clasifica esta query y extrae los parámetros relevantes.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_query",
                description: "Classify a payroll query and extract structured parameters",
                parameters: {
          type: "object",
          properties: {
            queryType: {
                      type: "string",
                      enum: ["EXPLANATION", "TEMPORAL_FOLLOWUP", "EMPLOYEE_FOLLOWUP", "AGGREGATION", "DIRECT_INTENT"],
                      description: "The type of query classification"
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence score between 0 and 1",
                      minimum: 0,
                      maximum: 1
                    },
                    extractedContext: {
                      type: "object",
                      properties: {
                        concept: {
                          type: "string",
                          description: "Concept or topic being asked about in EXPLANATION queries (e.g., horas extras, prima, cesantías)"
                        },
                        temporalModifier: {
                          type: "string",
                          enum: ["LAST_YEAR", "THIS_YEAR", "SPECIFIC_MONTH", "QUARTER", "SEMESTER", "LAST_N_MONTHS", "FULL_YEAR"],
                          description: "Temporal modifier for follow-up queries"
                        },
                        monthCount: {
                          type: "number",
                          description: "Number of months for 'últimos N meses' queries (e.g., 3 for 'últimos 3 meses')"
                        },
                        year: {
                          type: "number",
                          description: "Year extracted from query (e.g., 2024, 2025)"
                        },
                        month: {
                          type: "string",
                          description: "Month extracted from query (in Spanish, e.g., enero, febrero)"
                        },
                        quarter: {
                          type: "number",
                          description: "Quarter number (1-4)"
                        },
                        semester: {
                          type: "number",
                          description: "Semester number (1-2)"
                        },
                        employeeName: {
                          type: "string",
                          description: "Employee name extracted from follow-up query"
                        },
                        metric: {
                          type: "string",
                          description: "Metric being queried (e.g., salario, incapacidad, horas_extra)"
                        }
                      }
                    },
                    reasoning: {
                      type: "string",
                      description: "Brief explanation of why this classification was chosen"
                    }
                  },
                  required: ["queryType", "confidence", "extractedContext"],
                  additionalProperties: false
                }
              }
            },
            {
              type: "function",
              function: {
                name: "calculate_surcharge",
                description: "Calculate night surcharge, Sunday surcharge, or combined night+Sunday surcharge with legal context and detailed explanation",
                parameters: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["nocturno", "dominical", "nocturno_dominical"],
                      description: "Type of surcharge: nocturno (night), dominical (Sunday/holiday), or nocturno_dominical (combined)"
                    },
                    salary: {
                      type: "number",
                      description: "Monthly base salary for calculation. If not provided, uses minimum wage"
                    },
                    hours: {
                      type: "number",
                      description: "Number of hours to calculate. Defaults to 1 if not specified"
                    }
                  },
                  required: ["type"]
                }
              }
            }
          ],
          tool_choice: "auto", // Allow model to choose between classify_query and calculate_surcharge
          max_completion_tokens: 500
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [LLM_CLASSIFIER] OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Logging detallado para debugging
      console.log('🔍 [LLM_CLASSIFIER] Full response:', {
        model: data.model,
        hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
        toolCallsCount: data.choices?.[0]?.message?.tool_calls?.length || 0,
        toolCallNames: data.choices?.[0]?.message?.tool_calls?.map((tc: any) => tc.function.name) || [],
        hasContent: !!data.choices?.[0]?.message?.content,
        finishReason: data.choices?.[0]?.finish_reason
      });
      
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
      
      // Check if calculate_surcharge was called directly
      const calculateSurchargeCall = toolCalls.find((tc: any) => tc.function.name === 'calculate_surcharge');
      
      if (calculateSurchargeCall) {
        console.log('🧮 [LLM_CLASSIFIER] Direct calculation tool call detected');
        // Return a valid classification with the tool call
        return {
          queryType: LLMQueryType.DIRECT_INTENT,
          confidence: 0.95,
          extractedContext: {},
          reasoning: 'Direct calculation requested via tool calling',
          toolCall: calculateSurchargeCall
        };
      }
      
      // Otherwise, look for classify_query call
      const classifyCall = toolCalls.find((tc: any) => tc.function.name === 'classify_query');
      
      if (!classifyCall) {
        console.warn('⚠️ [LLM_CLASSIFIER] No tool call, attempting text fallback...');
        
        // Fallback: analizar el texto de respuesta si existe
        const textContent = data.choices?.[0]?.message?.content;
        if (textContent) {
          return this.parseTextFallback(query, textContent, lastContext);
        }
        
        console.error('❌ [LLM_CLASSIFIER] No tool call and no text in response');
        throw new Error('No tool call in OpenAI response');
      }

      const result = JSON.parse(classifyCall.function.arguments);
      
      console.log(`🤖 [LLM_CLASSIFIER] Classification: ${result.queryType} (${result.confidence.toFixed(2)})`);
      console.log(`   Context: ${JSON.stringify(result.extractedContext)}`);
      console.log(`   Reasoning: ${result.reasoning || 'N/A'}`);

      return {
        queryType: result.queryType as LLMQueryType,
        confidence: result.confidence,
        extractedContext: result.extractedContext,
        reasoning: result.reasoning,
        toolCall: undefined // No direct calculation in this path
      };

    } catch (error) {
      console.error('❌ [LLM_CLASSIFIER] Classification failed:', error);
      
      // Fallback: return a low-confidence DIRECT_INTENT
      return {
        queryType: LLMQueryType.DIRECT_INTENT,
        confidence: 0.3,
        extractedContext: {},
        reasoning: 'Fallback due to LLM error'
      };
    }
  }
  
  /**
   * Parse response text manually as fallback when tool calling fails
   */
  private static parseTextFallback(
    query: string,
    responseText: string,
    lastContext: any
  ): LLMClassification {
    console.log('🔄 [LLM_CLASSIFIER] Using text fallback parser');
    
    // Detectar "año pasado" manualmente
    if (/(?:y\s+)?(?:el\s+)?año\s+pasado/i.test(query)) {
      return {
        queryType: LLMQueryType.TEMPORAL_FOLLOWUP,
        confidence: 0.85,
        extractedContext: {
          temporalModifier: "LAST_YEAR",
          year: new Date().getFullYear() - 1
        },
        reasoning: 'Text fallback: detected "año pasado"'
      };
    }
    
    // Detectar "este año" manualmente
    if (/(?:y\s+)?(?:el\s+)?(?:este|actual)\s+año/i.test(query)) {
      return {
        queryType: LLMQueryType.TEMPORAL_FOLLOWUP,
        confidence: 0.85,
        extractedContext: {
          temporalModifier: "THIS_YEAR",
          year: new Date().getFullYear()
        },
        reasoning: 'Text fallback: detected "este año"'
      };
    }
    
    // Detectar "últimos X meses"
    const monthsMatch = query.match(/(?:últimos?|ultimos?)\s+(\d+)\s+meses/i);
    if (monthsMatch) {
      return {
        queryType: LLMQueryType.TEMPORAL_FOLLOWUP,
        confidence: 0.80,
        extractedContext: {
          temporalModifier: "LAST_N_MONTHS",
          monthCount: parseInt(monthsMatch[1]),
          year: new Date().getFullYear()
        },
        reasoning: `Text fallback: detected "últimos ${monthsMatch[1]} meses"`
      };
    }
    
    // Fallback genérico
    return {
      queryType: LLMQueryType.DIRECT_INTENT,
      confidence: 0.4,
      extractedContext: {},
      reasoning: 'Text fallback: no pattern matched'
    };
  }
  
  /**
   * Extract context from last assistant message for reference
   */
  private static extractLastContext(conversation: any[]): { summary: string } | null {
    const lastAssistant = conversation
      .filter(m => m.role === 'assistant')
      .slice(-1)[0];
    
    if (!lastAssistant) return null;
    
    const content = lastAssistant.content || '';
    
    // Extract key indicators
    let summary = 'consulta general';
    
    if (/incapacidad/i.test(content)) {
      summary = 'días de incapacidad';
    } else if (/salario|costo|nómina/i.test(content)) {
      summary = 'costos de nómina o salarios';
    } else if (/empleados?/i.test(content)) {
      summary = 'información de empleados';
    } else if (/horas\s+extra/i.test(content)) {
      summary = 'horas extras';
    }
    
    return { summary };
  }
}
