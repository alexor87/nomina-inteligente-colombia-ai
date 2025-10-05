// ============================================================================
// Temporal Follow-Up Handler - Intelligent Context-Aware Processing
// ============================================================================
// Handles temporal follow-ups like "y el año pasado?", "y este año?"
// by analyzing conversation context and re-executing previous aggregation

import { LLMClassification, LLMQueryType } from '../core/llm-query-classifier.ts';
import { ConversationContextAnalyzer } from '../core/conversation-context-analyzer.ts';
import { TemporalResolver } from '../core/temporal-resolver.ts';

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
    'AGGREGATION_PAYROLL_COST': {
      intentType: 'TOTAL_PAYROLL_COST',
      method: 'getTotalPayrollCost'
    },
    'AGGREGATION_OVERTIME_HOURS': {
      intentType: 'TOTAL_OVERTIME_HOURS',
      method: 'getTotalOvertimeHours'
    },
    'AGGREGATION_SECURITY_CONTRIBUTIONS': {
      intentType: 'SECURITY_CONTRIBUTIONS',
      method: 'getSecurityContributions'
    },
    'AGGREGATION_HIGHEST_COST': {
      intentType: 'HIGHEST_COST_EMPLOYEES',
      method: 'getHighestCostEmployees'
    }
  };
  
  const mapping = intentMapping[context.contextType];
  
  if (!mapping) {
    console.log(`❌ [TEMPORAL_FOLLOWUP] No mapping found for context: ${context.contextType}`);
    console.log(`   Available mappings: ${Object.keys(intentMapping).join(', ')}`);
    return null;
  }
  
  // 4. Build params using TemporalResolver (standardized approach)
  const temporalParams = TemporalResolver.resolve(llmClassification.extractedContext);
  
  console.log(`   ✅ Temporal params resolved:`, {
    type: temporalParams.type,
    displayName: TemporalResolver.getDisplayName(temporalParams)
  });
  
  // 5. Return intent with standardized TemporalParams
  const intent: Intent = {
    type: mapping.intentType,
    method: mapping.method,
    params: temporalParams,
    confidence: llmClassification.confidence
  };
  
  console.log(`✅ [TEMPORAL_FOLLOWUP] Intent created: ${intent.type}`, {
    type: temporalParams.type,
    displayName: TemporalResolver.getDisplayName(temporalParams)
  });
  
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
