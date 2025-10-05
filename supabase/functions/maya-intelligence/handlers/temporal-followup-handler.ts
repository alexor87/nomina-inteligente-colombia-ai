// ============================================================================
// Temporal Follow-Up Handler - Intelligent Context-Aware Processing
// ============================================================================
// Handles temporal follow-ups like "y el año pasado?", "y este año?"
// by analyzing conversation context and re-executing previous aggregation

import { LLMClassification, LLMQueryType } from '../core/llm-query-classifier.ts';
import { ConversationContextAnalyzer } from '../core/conversation-context-analyzer.ts';

export interface Intent {
  type: string;
  method: string;
  params: any;
  confidence: number;
}

/**
 * Handle temporal follow-up queries by analyzing conversation context
 * and re-executing the previous aggregation with updated temporal parameters
 */
export async function handleTemporalFollowUp(
  llmClassification: LLMClassification,
  conversation: any[]
): Promise<Intent | null> {
  
  console.log('🔍 [TEMPORAL_FOLLOWUP] Processing temporal follow-up...');
  
  // 1. Analyze previous conversation context
  const context = ConversationContextAnalyzer.analyze(conversation);
  
  console.log(`   Previous context type: ${context.contextType || 'none'}`);
  console.log(`   Previous entities: ${JSON.stringify(context.entities)}`);
  
  // 2. Check if previous context was an aggregation
  if (!context.contextType || !context.contextType.startsWith('AGGREGATION_')) {
    console.log('❌ [TEMPORAL_FOLLOWUP] No aggregation context found in conversation');
    return null;
  }
  
  // 3. Map context type to aggregation intent
  const intentMapping: Record<string, { intentType: string; method: string }> = {
    'AGGREGATION_INCAPACITY_DAYS': {
      intentType: 'TOTAL_INCAPACITY_DAYS',
      method: 'getTotalIncapacityDays'
    },
    'AGGREGATION_SALARY_COST': {
      intentType: 'TOTAL_PAYROLL_COST',
      method: 'getTotalPayrollCost'
    },
    'AGGREGATION_OVERTIME': {
      intentType: 'TOTAL_OVERTIME_HOURS',
      method: 'getTotalOvertimeHours'
    },
    'AGGREGATION_SECURITY': {
      intentType: 'SECURITY_CONTRIBUTIONS',
      method: 'getSecurityContributions'
    },
    'AGGREGATION_HIGHEST_COST': {
      intentType: 'HIGHEST_COST_EMPLOYEES',
      method: 'getHighestCostEmployees'
    },
    'AGGREGATION_LOWEST_COST': {
      intentType: 'LOWEST_COST_EMPLOYEES',
      method: 'getLowestCostEmployees'
    }
  };
  
  const mapping = intentMapping[context.contextType];
  
  if (!mapping) {
    console.log(`❌ [TEMPORAL_FOLLOWUP] No mapping found for context: ${context.contextType}`);
    return null;
  }
  
  // 4. Build params from LLM extracted context
  const params: any = {};
  const extracted = llmClassification.extractedContext;
  
  // Extract temporal parameters
  if (extracted.temporalModifier === 'LAST_YEAR') {
    const lastYear = new Date().getFullYear() - 1;
    params.year = lastYear;
    params.month = null;
    console.log(`   Temporal modifier: LAST_YEAR (${lastYear})`);
  } else if (extracted.temporalModifier === 'THIS_YEAR' || extracted.temporalModifier === 'FULL_YEAR') {
    const currentYear = new Date().getFullYear();
    params.year = currentYear;
    params.month = null;
    console.log(`   Temporal modifier: THIS_YEAR (${currentYear})`);
  } else if (extracted.temporalModifier === 'SPECIFIC_MONTH') {
    params.month = extracted.month || null;
    params.year = extracted.year || new Date().getFullYear();
    console.log(`   Temporal modifier: SPECIFIC_MONTH (${params.month} ${params.year})`);
  } else if (extracted.temporalModifier === 'QUARTER') {
    params.quarter = extracted.quarter || null;
    params.year = extracted.year || new Date().getFullYear();
    console.log(`   Temporal modifier: QUARTER (Q${params.quarter} ${params.year})`);
  } else if (extracted.temporalModifier === 'SEMESTER') {
    params.semester = extracted.semester || null;
    params.year = extracted.year || new Date().getFullYear();
    console.log(`   Temporal modifier: SEMESTER (S${params.semester} ${params.year})`);
  } else if (extracted.year) {
    params.year = extracted.year;
    params.month = extracted.month || null;
    console.log(`   Explicit year: ${params.year}${params.month ? `, month: ${params.month}` : ''}`);
  }
  
  // 5. Return intent with updated temporal params
  const intent: Intent = {
    type: mapping.intentType,
    method: mapping.method,
    params,
    confidence: llmClassification.confidence
  };
  
  console.log(`✅ [TEMPORAL_FOLLOWUP] Intent created: ${intent.type} with params:`, params);
  
  return intent;
}

/**
 * Validate if temporal follow-up is applicable
 */
export function canHandleTemporalFollowUp(
  llmClassification: LLMClassification,
  conversation: any[]
): boolean {
  // Must be classified as TEMPORAL_FOLLOWUP
  if (llmClassification.queryType !== LLMQueryType.TEMPORAL_FOLLOWUP) {
    return false;
  }
  
  // Must have conversation history
  if (!conversation || conversation.length < 2) {
    return false;
  }
  
  // Must have extractedContext with temporal modifier or year
  const extracted = llmClassification.extractedContext;
  if (!extracted.temporalModifier && !extracted.year) {
    return false;
  }
  
  return true;
}
