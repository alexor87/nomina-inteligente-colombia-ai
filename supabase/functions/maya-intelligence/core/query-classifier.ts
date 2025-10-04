// ============================================================================
// MAYA Query Classifier - Priority-Based Query Classification
// ============================================================================
// Centralized system for classifying user queries with guaranteed priority order
// Prevents edge cases where queries are misinterpreted (e.g., "y este año?" as employee name)

export enum QueryType {
  TEMPORAL_FOLLOW_UP = 1,      // Highest priority: temporal modifications
  AGGREGATION = 2,             // Aggregation queries (totals, sums, counts)
  EMPLOYEE_FOLLOW_UP = 3,      // Follow-up about specific employee
  DIRECT_INTENT = 4            // New direct query/command
}

export interface QueryClassification {
  type: QueryType;
  confidence: number;
  indicators: string[];
  warnings?: string[];
}

/**
 * Semantic patterns for temporal indicators
 * These are more flexible than strict regex patterns
 */
const TEMPORAL_INDICATORS = {
  units: ['año', 'años', 'mes', 'meses', 'día', 'días', 'semana', 'semanas', 
          'trimestre', 'trimestres', 'semestre', 'semestres', 'periodo', 'período', 
          'periodos', 'períodos', 'quincena', 'bimestre'],
  modifiers: ['este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
              'aquel', 'aquella', 'aquellos', 'aquellas', 'pasado', 'pasada',
              'anterior', 'próximo', 'próxima', 'siguiente', 'actual', 'presente',
              'corriente', 'en curso'],
  prepositions: ['de', 'del', 'en', 'para', 'durante']
};

/**
 * Semantic patterns for aggregation indicators
 */
const AGGREGATION_INDICATORS = {
  quantifiers: ['total', 'totales', 'suma', 'cuántos', 'cuántas', 'cuánto', 
                'cuanto', 'cuantos', 'cuantas', 'cantidad', 'número'],
  comparatives: ['más', 'mas', 'menos', 'mayor', 'menor', 'mayores', 'menores',
                 'máximo', 'mínimo', 'máxima', 'mínima', 'mejor', 'peor'],
  descriptors: ['costoso', 'costosa', 'costosos', 'costosas', 'caro', 'cara',
                'barato', 'barata', 'económico', 'económica', 'alto', 'alta',
                'bajo', 'baja', 'costo', 'costos', 'precio', 'precios',
                'gasto', 'gastos', 'valor', 'valores']
};

/**
 * Semantic patterns for employee follow-up indicators
 */
const EMPLOYEE_FOLLOW_UP_INDICATORS = {
  pronouns: ['él', 'el', 'ella', 'ellos', 'ellas'],
  connectors: ['y', 'también', 'tambien', 'además', 'ademas'],
  prepositions: ['a', 'de', 'del', 'de la', 'para']
};

export class QueryClassifier {
  
  /**
   * Classify a user query with guaranteed priority order
   * @param text - The user's query text
   * @returns Classification with type, confidence, and indicators
   */
  static classify(text: string): QueryClassification {
    const lowerText = text.toLowerCase().trim();
    
    // Priority 1: Temporal follow-up queries (highest priority)
    const temporalResult = this.isTemporalQuery(lowerText);
    if (temporalResult.isMatch) {
      return {
        type: QueryType.TEMPORAL_FOLLOW_UP,
        confidence: temporalResult.confidence,
        indicators: temporalResult.indicators
      };
    }
    
    // Priority 2: Aggregation queries
    const aggregationResult = this.isAggregationQuery(lowerText);
    if (aggregationResult.isMatch) {
      return {
        type: QueryType.AGGREGATION,
        confidence: aggregationResult.confidence,
        indicators: aggregationResult.indicators
      };
    }
    
    // Priority 3: Employee follow-up queries
    const employeeFollowUpResult = this.isEmployeeFollowUpQuery(lowerText);
    if (employeeFollowUpResult.isMatch) {
      return {
        type: QueryType.EMPLOYEE_FOLLOW_UP,
        confidence: employeeFollowUpResult.confidence,
        indicators: employeeFollowUpResult.indicators
      };
    }
    
    // Priority 4: Direct intent (new query)
    return {
      type: QueryType.DIRECT_INTENT,
      confidence: 0.80,
      indicators: ['new_query']
    };
  }
  
  /**
   * Check if query is temporal modification
   * Examples: "y este año?", "y del mes pasado?", "y en 2024?"
   */
  private static isTemporalQuery(text: string): {
    isMatch: boolean;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let matchScore = 0;
    
    // Check for temporal units
    const hasUnit = TEMPORAL_INDICATORS.units.some(unit => {
      if (text.includes(unit)) {
        indicators.push(`unit:${unit}`);
        return true;
      }
      return false;
    });
    
    // Check for temporal modifiers
    const hasModifier = TEMPORAL_INDICATORS.modifiers.some(mod => {
      if (text.includes(mod)) {
        indicators.push(`modifier:${mod}`);
        return true;
      }
      return false;
    });
    
    // Check for year patterns (2024, 2023, etc.)
    const hasYear = /\b(19|20)\d{2}\b/.test(text);
    if (hasYear) {
      indicators.push('year_number');
      matchScore += 0.15;
    }
    
    // Strong match: has both unit and modifier
    if (hasUnit && hasModifier) {
      matchScore = 0.95;
    }
    // Medium match: has unit or year
    else if (hasUnit || hasYear) {
      matchScore = 0.85;
    }
    
    // Additional confidence boost for follow-up connectors
    if (/^(y|también|tambien)\s+/i.test(text)) {
      indicators.push('follow_up_connector');
      matchScore += 0.05;
    }
    
    return {
      isMatch: matchScore >= 0.80,
      confidence: Math.min(matchScore, 0.99),
      indicators
    };
  }
  
  /**
   * Check if query is aggregation (totals, comparisons, etc.)
   * Examples: "cuántos días", "total de horas", "el más costoso"
   */
  private static isAggregationQuery(text: string): {
    isMatch: boolean;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let matchScore = 0;
    
    // Check for quantifiers
    const hasQuantifier = AGGREGATION_INDICATORS.quantifiers.some(q => {
      if (text.includes(q)) {
        indicators.push(`quantifier:${q}`);
        matchScore += 0.30;
        return true;
      }
      return false;
    });
    
    // Check for comparatives
    const hasComparative = AGGREGATION_INDICATORS.comparatives.some(c => {
      if (text.includes(c)) {
        indicators.push(`comparative:${c}`);
        matchScore += 0.25;
        return true;
      }
      return false;
    });
    
    // Check for descriptors
    const hasDescriptor = AGGREGATION_INDICATORS.descriptors.some(d => {
      if (text.includes(d)) {
        indicators.push(`descriptor:${d}`);
        matchScore += 0.20;
        return true;
      }
      return false;
    });
    
    return {
      isMatch: matchScore >= 0.70,
      confidence: Math.min(matchScore, 0.95),
      indicators
    };
  }
  
  /**
   * Check if query is employee follow-up
   * Examples: "y a María?", "también Juan", "y de Pedro?"
   */
  private static isEmployeeFollowUpQuery(text: string): {
    isMatch: boolean;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let matchScore = 0;
    
    // Check for follow-up connectors
    const hasConnector = EMPLOYEE_FOLLOW_UP_INDICATORS.connectors.some(c => {
      if (text.startsWith(c + ' ') || text === c) {
        indicators.push(`connector:${c}`);
        matchScore += 0.30;
        return true;
      }
      return false;
    });
    
    // Check for pronouns
    const hasPronoun = EMPLOYEE_FOLLOW_UP_INDICATORS.pronouns.some(p => {
      if (text.includes(p)) {
        indicators.push(`pronoun:${p}`);
        matchScore += 0.25;
        return true;
      }
      return false;
    });
    
    // Check for employee name pattern (capitalized words)
    const hasNamePattern = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*\b/.test(text);
    if (hasNamePattern) {
      indicators.push('name_pattern');
      matchScore += 0.35;
    }
    
    // Check for prepositions typically used with names
    const hasPreposition = EMPLOYEE_FOLLOW_UP_INDICATORS.prepositions.some(p => {
      const pattern = new RegExp(`\\b${p}\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+`, 'i');
      if (pattern.test(text)) {
        indicators.push(`preposition:${p}`);
        matchScore += 0.20;
        return true;
      }
      return false;
    });
    
    return {
      isMatch: matchScore >= 0.70,
      confidence: Math.min(matchScore, 0.92),
      indicators
    };
  }
  
  /**
   * Validate if a query could be ambiguous (matches multiple types)
   * Useful for debugging and improving classification
   */
  static validateQueryAmbiguity(text: string): {
    isAmbiguous: boolean;
    possibleTypes: QueryType[];
    scores: Record<string, number>;
  } {
    const lowerText = text.toLowerCase().trim();
    
    const temporal = this.isTemporalQuery(lowerText);
    const aggregation = this.isAggregationQuery(lowerText);
    const employeeFollowUp = this.isEmployeeFollowUpQuery(lowerText);
    
    const matches = [
      { type: QueryType.TEMPORAL_FOLLOW_UP, match: temporal.isMatch, score: temporal.confidence },
      { type: QueryType.AGGREGATION, match: aggregation.isMatch, score: aggregation.confidence },
      { type: QueryType.EMPLOYEE_FOLLOW_UP, match: employeeFollowUp.isMatch, score: employeeFollowUp.confidence }
    ].filter(m => m.match);
    
    return {
      isAmbiguous: matches.length > 1,
      possibleTypes: matches.map(m => m.type),
      scores: {
        temporal: temporal.confidence,
        aggregation: aggregation.confidence,
        employeeFollowUp: employeeFollowUp.confidence
      }
    };
  }
}
