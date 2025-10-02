// ============================================================================
// MAYA Conversation Context Analyzer
// ============================================================================
// Automatically analyzes Maya's last response to extract context, entities,
// and response structure. This enables intelligent follow-up question handling.

import { 
  RESPONSE_PATTERNS, 
  ENTITY_PATTERNS,
  type ResponsePattern 
} from '../config/context-patterns.ts';

export interface ConversationContext {
  contextType: string | null;
  responseStructure: string | null;
  entities: Record<string, any>;
  confidence: number;
  lastResponseText: string;
  detectedPatterns: string[];
}

export class ConversationContextAnalyzer {
  
  /**
   * Analyzes the conversation history to extract context from Maya's last response
   */
  static analyze(conversation: any[]): ConversationContext {
    // Default empty context
    const emptyContext: ConversationContext = {
      contextType: null,
      responseStructure: null,
      entities: {},
      confidence: 0,
      lastResponseText: '',
      detectedPatterns: []
    };

    if (!conversation || conversation.length < 2) {
      return emptyContext;
    }

    // Get the last assistant message (Maya's last response)
    const lastAssistantMessage = this.getLastAssistantMessage(conversation);
    
    if (!lastAssistantMessage) {
      return emptyContext;
    }

    const responseText = lastAssistantMessage.content || '';

    // Analyze response against all patterns
    const detectedContext = this.detectResponseType(responseText);
    
    // Extract entities from response
    const entities = this.extractEntities(responseText);

    return {
      contextType: detectedContext.contextType,
      responseStructure: detectedContext.structure,
      entities,
      confidence: detectedContext.confidence,
      lastResponseText: responseText,
      detectedPatterns: detectedContext.matchedPatterns
    };
  }

  /**
   * Gets the last assistant (Maya) message from conversation
   */
  private static getLastAssistantMessage(conversation: any[]): any | null {
    for (let i = conversation.length - 1; i >= 0; i--) {
      if (conversation[i].role === 'assistant') {
        return conversation[i];
      }
    }
    return null;
  }

  /**
   * Detects the type of response based on patterns
   */
  private static detectResponseType(responseText: string): {
    contextType: string | null;
    structure: string | null;
    confidence: number;
    matchedPatterns: string[];
  } {
    const results = [];

    // Check each response pattern
    for (const [patternName, patternConfig] of Object.entries(RESPONSE_PATTERNS)) {
      const matchCount = patternConfig.patterns.filter(regex => 
        regex.test(responseText)
      ).length;

      if (matchCount > 0) {
        const confidence = Math.min(0.85 + (matchCount * 0.05), 0.99);
        results.push({
          patternName,
          contextType: patternConfig.contextType,
          structure: patternConfig.structure,
          confidence,
          matchCount
        });
      }
    }

    // Return the best match (highest match count, then highest confidence)
    if (results.length === 0) {
      return { contextType: null, structure: null, confidence: 0, matchedPatterns: [] };
    }

    results.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return b.confidence - a.confidence;
    });

    const bestMatch = results[0];
    
    return {
      contextType: bestMatch.contextType,
      structure: bestMatch.structure,
      confidence: bestMatch.confidence,
      matchedPatterns: results.map(r => r.patternName)
    };
  }

  /**
   * Extracts entities (names, amounts, dates) from response text
   */
  private static extractEntities(responseText: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract employee name
    const nameMatch = responseText.match(ENTITY_PATTERNS.EMPLOYEE_NAME);
    if (nameMatch) {
      entities.employeeName = nameMatch[1].trim();
    }

    // Extract salary amount
    const salaryMatch = responseText.match(ENTITY_PATTERNS.SALARY_AMOUNT);
    if (salaryMatch) {
      entities.salaryAmount = salaryMatch[1].replace(/,/g, '');
    }

    // Extract period name
    const periodMatch = responseText.match(ENTITY_PATTERNS.PERIOD_NAME);
    if (periodMatch) {
      entities.periodName = periodMatch[1].trim();
    }

    // Extract date range
    const dateRangeMatch = responseText.match(ENTITY_PATTERNS.DATE_RANGE);
    if (dateRangeMatch) {
      entities.dateRange = {
        start: dateRangeMatch[1],
        end: dateRangeMatch[2]
      };
    }

    return entities;
  }

  /**
   * Checks if the context has enough information for follow-up inference
   */
  static hasValidContext(context: ConversationContext): boolean {
    return (
      context.contextType !== null &&
      context.confidence >= 0.70 &&
      Object.keys(context.entities).length > 0
    );
  }
}
